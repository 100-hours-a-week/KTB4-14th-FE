import type { Page, Route } from '@playwright/test';
import { API_BASE_URL, APP_ORIGIN } from './env';
import * as data from './data';
import { KAKAO_SDK_STUB } from './kakao-sdk-stub';

export type MockRequest = {
  method: string;
  path: string;
  query: URLSearchParams;
  body: any;
  headers: Record<string, string>;
  params: Record<string, string>;
};

export type MockReply = {
  status?: number;
  /** 성공 시 `{ message, data }` 봉투의 data, 실패 시 `{ message }` 로 감싸서 응답한다. */
  body?: unknown;
  /** 응답 지연(ms) */
  delayMs?: number;
  /** 네트워크 오류로 끊는다 */
  abort?: boolean;
  /** 봉투 없이 그대로 응답(SSE 등) */
  raw?: string;
  contentType?: string;
};

export type MockHandler = (req: MockRequest, api: MockBackend) => MockReply | Promise<MockReply>;

type RouteDef = { method: string; regex: RegExp; keys: string[]; handler: MockHandler };
type Override = RouteDef & { remaining: number };

export type RecordedCall = Omit<MockRequest, 'params'> & { at: number };

export type GenerationFrame = {
  status: 'GENERATING' | 'COMPLETED' | 'FAILED';
  /** 완료(DONE)된 단계 수 */
  done: number;
};

type Job = { jobId: number; planId: number; poll: number; script: GenerationFrame[]; notified: boolean };

export const GENERATION_STEPS = [
  { key: 'PLACE_RECOMMEND', label: '장소·식당 추천' },
  { key: 'STAY_RECOMMEND', label: '숙소 위치 계산' },
  { key: 'ROUTE_OPTIMIZE', label: '이동 경로 연결' },
  { key: 'MUSIC_RECOMMEND', label: '추천 음악 선정' },
] as const;

/** 각 프레임을 2번씩 응답한다(StrictMode 이중 effect로 폴링이 한 번 더 일어나도 단계가 건너뛰지 않도록). */
export function generationScript(...frames: GenerationFrame[]): GenerationFrame[] {
  return frames.flatMap((frame) => [frame, frame]);
}

export const DEFAULT_GENERATION = generationScript(
  { status: 'GENERATING', done: 0 },
  { status: 'GENERATING', done: 1 },
  { status: 'GENERATING', done: 2 },
  { status: 'GENERATING', done: 3 },
  { status: 'COMPLETED', done: 4 },
);

function toRegex(path: string) {
  const keys: string[] = [];
  const pattern = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:(\w+)/g, (_, key: string) => {
    keys.push(key);
    return '([^/]+)';
  });
  return { regex: new RegExp(`^${pattern}$`), keys };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 상태를 가진 가짜 AUDIGO 백엔드.
 * - 기본 라우트는 "정상 동작"을 흉내 낸다.
 * - 테스트별 예외 상황은 `api.on()/api.once()` 로 덮어쓴다.
 * - 호출 이력은 `api.callsTo()` 로 검증한다.
 */
export class MockBackend {
  now: Date;
  user = data.user();
  regions = data.regions();
  places = data.kakaoPlaces();
  upcoming: data.TravelSummary | null = null;
  recent: data.TravelSummary[] = [];
  myTrips: data.TravelSummary[] = [];
  itineraries = new Map<number, data.BackendItinerary>();
  notifications: data.AppNotification[] = [];
  generation: GenerationFrame[] = DEFAULT_GENERATION;
  /** 생성 완료/실패 시 알림을 자동으로 만든다 */
  notifyOnGeneration = true;
  /** 진행 중인 생성 작업이 있으면 새 생성 요청을 409로 막는다 */
  blockConcurrentGeneration = false;
  /** 완료 체크 시 이후 일정 재계산 훅(기본: 완료 시각 기준으로 같은 날 이후 장소를 이동) */
  onCompletion: (plan: data.BackendItinerary, itemId: number, isCompleted: boolean, at: Date) => void = (
    plan,
    itemId,
    isCompleted,
    at,
  ) => {
    if (isCompleted) data.shiftFollowingPlaces(plan, itemId, at);
  };
  kakaoAuth: 'success' | 'cancel' = 'success';
  kakaoCode = 'e2e-kakao-code';
  offline = false;

  readonly calls: RecordedCall[] = [];
  readonly jobs = new Map<number, Job>();
  private sseQueue: data.AppNotification[] = [];
  private overrides: Override[] = [];
  private routes: RouteDef[] = [];
  private nextPlanId = 500;
  private nextJobId = 900;

  constructor(now: string | Date) {
    this.now = new Date(now);
    this.registerDefaults();
  }

  /* ------------------------------------------------------------------ 설치 */

  async attach(page: Page) {
    await page.clock.setFixedTime(this.now);
    await page.route(`${API_BASE_URL}/**`, (route) => this.handle(route));
    await page.route('https://dapi.kakao.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: KAKAO_SDK_STUB }),
    );
    await page.route('https://kauth.kakao.com/**', (route) => this.handleKakaoAuthorize(route));
  }

  /* --------------------------------------------------------------- 덮어쓰기 */

  /** 특정 API 응답을 덮어쓴다. times 회 사용 후 기본 동작으로 돌아간다. */
  on(method: string, path: string, handler: MockHandler | MockReply, times = Number.POSITIVE_INFINITY) {
    const { regex, keys } = toRegex(path);
    const fn: MockHandler = typeof handler === 'function' ? handler : () => handler;
    this.overrides.unshift({ method, regex, keys, handler: fn, remaining: times });
  }

  once(method: string, path: string, handler: MockHandler | MockReply) {
    this.on(method, path, handler, 1);
  }

  /* ------------------------------------------------------------------ 검증 */

  callsTo(method: string, path: string) {
    const { regex } = toRegex(path);
    return this.calls.filter((call) => call.method === method && regex.test(call.path));
  }

  /* --------------------------------------------------------------- 편의 기능 */

  /** 알림 생성 + SSE 로 실시간 전송 */
  pushNotification(overrides: Partial<data.AppNotification> = {}) {
    const created = data.notification({ created_at: this.now.toISOString(), ...overrides });
    this.notifications.unshift(created);
    this.sseQueue.push(created);
    return created;
  }

  /** 화면을 거치지 않고 생성 작업을 만든다(생성 진행 화면으로 바로 진입할 때 사용). */
  createGeneration(script = this.generation) {
    const planId = this.nextPlanId++;
    const jobId = this.startJob(planId, script);
    return { planId, jobId, url: `/generating/${planId}?job_id=${jobId}` };
  }

  itineraryOf(planId: number) {
    let plan = this.itineraries.get(planId);
    if (!plan) {
      plan = data.itinerary(planId);
      this.itineraries.set(planId, plan);
    }
    return plan;
  }

  /* ------------------------------------------------------------------ 내부 */

  private startJob(planId: number, script = this.generation) {
    const jobId = this.nextJobId++;
    this.jobs.set(jobId, { jobId, planId, poll: 0, script, notified: false });
    return jobId;
  }

  private jobStatus(job: Job) {
    const frame = job.script[Math.min(job.poll, job.script.length - 1)];
    job.poll += 1;
    if (!job.notified && frame.status !== 'GENERATING' && this.notifyOnGeneration) {
      job.notified = true;
      this.pushNotification(
        frame.status === 'COMPLETED'
          ? { type: 'TRAVEL_COMPLETE', title: '여행 일정이 완성됐어요', body: '생성된 여행 일정을 확인해 보세요.', travel_plan_id: job.planId, target_id: job.planId }
          : { type: 'TRAVEL_FAILED', title: '여행 생성에 실패했어요', body: '다시 생성하기를 눌러 주세요.', travel_plan_id: job.planId, target_id: job.planId },
      );
    }
    return {
      travel_plan_id: job.planId,
      generation_job_id: job.jobId,
      status: frame.status,
      error_message: frame.status === 'FAILED' ? '일정 생성에 실패했습니다.' : null,
      steps: GENERATION_STEPS.map((step, index) => ({
        ...step,
        state:
          index < frame.done
            ? 'DONE'
            : index === frame.done
              ? frame.status === 'FAILED'
                ? 'FAILED'
                : frame.status === 'GENERATING'
                  ? 'RUNNING'
                  : 'DONE'
              : 'PENDING',
      })),
    };
  }

  private hasRunningJob() {
    return [...this.jobs.values()].some((job) => job.script[Math.min(job.poll, job.script.length - 1)].status === 'GENERATING');
  }

  private add(method: string, path: string, handler: MockHandler) {
    const { regex, keys } = toRegex(path);
    this.routes.push({ method, regex, keys, handler });
  }

  private registerDefaults() {
    // 인증
    this.add('POST', '/users/login', () => ({ body: this.user }));
    this.add('POST', '/users/refresh', () => ({ body: null }));
    this.add('POST', '/users/logout', () => ({ status: 204 }));
    this.add('GET', '/api/users/me', () => ({
      body: {
        user_id: this.user.user_id,
        nickname: this.user.nickname,
        profile_image_url: null,
        provider: 'KAKAO',
        status: 'ACTIVE',
        completed_travel_count: this.recent.length,
        upcoming_travel_count: this.upcoming ? 1 : 0,
      },
    }));

    // 지역 · 장소 검색(카카오 중계)
    this.add('GET', '/api/regions', () => ({ body: this.regions }));
    this.add('GET', '/api/places/search', (req) => {
      const keyword = (req.query.get('keyword') ?? '').trim();
      const found = this.places.filter((place) => place.place_name.includes(keyword) || (place.road_address ?? '').includes(keyword));
      return { body: { places: found, page: 1, size: 15, is_end: true, pageable_count: found.length } };
    });

    // 여행
    this.add('GET', '/api/travel-plans/upcoming', () => ({ body: this.upcoming }));
    this.add('GET', '/api/travel-plans/recent', () => ({ body: this.recent }));
    this.add('GET', '/api/travel-plans/me', () => ({ body: this.myTrips }));
    this.add('POST', '/api/travel-plans', () => {
      if (this.blockConcurrentGeneration && this.hasRunningJob()) {
        return { status: 409, body: { message: 'travel_generation_in_progress' } };
      }
      const planId = this.nextPlanId++;
      const jobId = this.startJob(planId);
      return { status: 201, body: { travel_plan_id: planId, generation_job_id: jobId, status: 'GENERATING' } };
    });
    this.add('POST', '/api/travel-plans/:id/regeneration', (req) => {
      const planId = Number(req.params.id);
      const jobId = this.startJob(planId);
      return { status: 201, body: { travel_plan_id: planId, generation_job_id: jobId, status: 'GENERATING' } };
    });
    this.add('GET', '/api/ai-generation-jobs/:id', (req) => {
      const job = this.jobs.get(Number(req.params.id));
      return job ? { body: this.jobStatus(job) } : { status: 404, body: { message: 'generation_job_not_found' } };
    });
    this.add('GET', '/api/travel-plans/:id/status', (req) => {
      const job = [...this.jobs.values()].reverse().find((candidate) => candidate.planId === Number(req.params.id));
      return job ? { body: this.jobStatus(job) } : { status: 404, body: { message: 'travel_plan_not_found' } };
    });
    this.add('GET', '/api/travel-plans/:id/itinerary', (req) => ({ body: this.itineraryOf(Number(req.params.id)) }));
    this.add('PATCH', '/api/itinerary-items/:id/completion', (req) => {
      const itemId = Number(req.params.id);
      const isCompleted = Boolean(req.body?.is_completed);
      for (const plan of this.itineraries.values()) {
        const target = plan.itinerary_days.flatMap((day) => day.items).find((it) => it.itinerary_item_id === itemId);
        if (!target) continue;
        target.is_completed = isCompleted;
        target.completed_at = isCompleted ? this.now.toISOString() : null;
        this.onCompletion(plan, itemId, isCompleted, this.now);
        return { body: { itinerary_item_id: itemId, is_completed: isCompleted, completed_at: target.completed_at } };
      }
      return { status: 404, body: { message: 'itinerary_item_not_found' } };
    });
    this.add('POST', '/api/travel-plans/:id/routes/recalculate', () => ({ body: null }));

    // 알림
    this.add('GET', '/api/notifications', () => ({ body: this.notifications }));
    this.add('GET', '/api/notifications/unread-count', () => ({
      body: { count: this.notifications.filter((n) => !n.is_read).length },
    }));
    this.add('PATCH', '/api/notifications/:id/read', (req) => {
      this.notifications = this.notifications.map((n) =>
        n.notification_id === Number(req.params.id) ? { ...n, is_read: true } : n,
      );
      return { status: 204 };
    });
    this.add('POST', '/api/notifications/read-all', () => {
      this.notifications = this.notifications.map((n) => ({ ...n, is_read: true }));
      return { status: 204 };
    });
    this.add('GET', '/api/notifications/subscribe', () => {
      // 큐에 쌓인 알림을 흘려보내고 스트림을 닫는다. retry 값으로 EventSource 가 곧바로 재연결한다.
      const events = this.sseQueue.splice(0).map((n) => `event: notification\ndata: ${JSON.stringify(n)}\n\n`);
      return { raw: `retry: 300\n\n${events.join('')}`, contentType: 'text/event-stream' };
    });
  }

  private resolve(req: Omit<MockRequest, 'params'>): { handler: MockHandler; params: Record<string, string> } | null {
    const matchDef = (def: RouteDef) => {
      if (def.method !== req.method) return null;
      const match = def.regex.exec(req.path);
      if (!match) return null;
      return Object.fromEntries(def.keys.map((key, index) => [key, decodeURIComponent(match[index + 1])]));
    };
    for (const override of this.overrides) {
      if (override.remaining <= 0) continue;
      const params = matchDef(override);
      if (params) {
        override.remaining -= 1;
        return { handler: override.handler, params };
      }
    }
    for (const def of this.routes) {
      const params = matchDef(def);
      if (params) return { handler: def.handler, params };
    }
    return null;
  }

  private corsHeaders(origin?: string) {
    return {
      'access-control-allow-origin': origin ?? APP_ORIGIN,
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'content-type, authorization, idempotency-key',
      'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    };
  }

  private async handle(route: Route) {
    const request = route.request();
    const headers = await request.allHeaders();
    const cors = this.corsHeaders(headers.origin);
    try {
      if (request.method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: cors });
        return;
      }
      if (this.offline) {
        await route.abort('internetdisconnected');
        return;
      }
      const url = new URL(request.url());
      let body: unknown = null;
      try {
        body = request.postDataJSON();
      } catch {
        body = request.postData();
      }
      const base = { method: request.method(), path: url.pathname, query: url.searchParams, body, headers };
      this.calls.push({ ...base, at: Date.now() });

      const resolved = this.resolve(base);
      const reply: MockReply = resolved
        ? await resolved.handler({ ...base, params: resolved.params }, this)
        : { status: 404, body: { message: 'not_found' } };

      if (reply.delayMs) await sleep(reply.delayMs);
      if (reply.abort) {
        await route.abort('failed');
        return;
      }
      if (reply.raw !== undefined) {
        await route.fulfill({ status: reply.status ?? 200, headers: cors, contentType: reply.contentType ?? 'text/plain', body: reply.raw });
        return;
      }
      const status = reply.status ?? 200;
      if (status === 204) {
        await route.fulfill({ status, headers: cors });
        return;
      }
      const payload = status < 400
        ? { message: 'success', data: reply.body ?? null }
        : { message: (reply.body as { message?: string } | undefined)?.message ?? 'error', data: null };
      await route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(payload) });
    } catch {
      // 테스트 종료 후 지연 응답이 도착하는 경우 등은 무시한다.
    }
  }

  private async handleKakaoAuthorize(route: Route) {
    const url = new URL(route.request().url());
    const redirectUri = url.searchParams.get('redirect_uri') ?? `${APP_ORIGIN}/auth/kakao`;
    const location =
      this.kakaoAuth === 'success'
        ? `${redirectUri}?code=${encodeURIComponent(this.kakaoCode)}`
        : `${redirectUri}?error=access_denied&error_description=User%20denied%20access`;
    this.calls.push({ method: 'GET', path: '/kakao/oauth/authorize', query: url.searchParams, body: null, headers: {}, at: Date.now() });
    await route.fulfill({ status: 302, headers: { location } });
  }
}
