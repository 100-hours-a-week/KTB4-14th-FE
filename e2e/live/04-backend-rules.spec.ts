import { test, expect } from '../support/live-fixtures';
import { LIVE_GENERATE } from '../support/env';
import { backendData, backendRequest } from '../support/live-session';
import { generateButton, goToPlacesStep } from '../support/flows';
import { LIVE_BASIC, todayKst, waitForApi, type LiveItinerary, type LiveTripSummary } from '../support/live-flows';

/**
 * [live] 4. 백엔드 규칙
 * mock 스위트에서 "@BE(백엔드 책임)"로 skip 했던 시나리오 중 실제 백엔드로 확인할 수 있는 것들.
 * CONC-03(DB 저장 실패 시 저장만 재시도)은 백엔드 내부 장애 주입이 필요해서 여전히 백엔드 통합 테스트 대상이다.
 */
test.describe('[live] 4. 백엔드 규칙', () => {
  test('LIVE-EXT-05 동일 검색어 반복 조회 시 응답 속도 개선(캐시)', { tag: '@P2' }, async ({ page }) => {
    const [region] = await backendData<Array<{ region_id: number }>>(page.request, '/api/regions');
    expect(region, '지역 목록이 비어 있음').toBeTruthy();

    // 이전 실행의 캐시에 걸리지 않도록 매번 다른 검색어를 쓴다.
    const keyword = `경복궁 ${Date.now().toString(36)}`;
    const path = `/api/places/search?region_id=${region.region_id}&keyword=${encodeURIComponent(keyword)}&page=1&size=15`;
    const timed = async () => {
      const started = performance.now();
      const response = await backendRequest(page.request, 'GET', path);
      expect(response.status()).toBe(200);
      return performance.now() - started;
    };

    const first = await timed();
    const repeats = [await timed(), await timed(), await timed()].sort((a, b) => a - b);
    const median = repeats[1];
    test.info().annotations.push({ type: 'timing', description: `첫 조회 ${first.toFixed(0)}ms / 반복 조회 중앙값 ${median.toFixed(0)}ms` });

    expect(median, `캐시 적중 시 첫 조회(${first.toFixed(0)}ms)보다 빨라야 함`).toBeLessThan(first);
  });

  test('LIVE-ITIN-09 저장된 일정에 좌표·시간이 없는 장소가 없음', { tag: '@P2' }, async ({ page }) => {
    const trips = await backendData<LiveTripSummary[]>(page.request, '/api/travel-plans/me');
    const completed = trips.filter((t) => !t.status || t.status === 'COMPLETED').slice(0, 5);
    test.skip(completed.length === 0, '완료된(COMPLETED) 여행이 없음');

    const broken: string[] = [];
    let checked = 0;
    for (const trip of completed) {
      const plan = await backendData<LiveItinerary>(page.request, `/api/travel-plans/${trip.travel_plan_id}/itinerary`);
      for (const day of plan.itinerary_days ?? plan.days ?? []) {
        for (const item of day.items) {
          checked += 1;
          const missing = (['latitude', 'longitude', 'start_time', 'end_time'] as const).filter((key) => item[key] == null);
          if (missing.length) {
            broken.push(`#${trip.travel_plan_id} DAY${day.day_number} ${item.place_name ?? item.itinerary_item_id}: ${missing.join(', ')}`);
          }
        }
      }
    }
    test.info().annotations.push({ type: 'checked', description: `여행 ${completed.length}개 · 장소 ${checked}개 검사` });
    expect(checked, '검사한 장소가 없음 — 일정 응답 구조(days / itinerary_days) 확인').toBeGreaterThan(0);
    expect(broken, '좌표/시간 누락 장소').toEqual([]);
  });

  test('LIVE-ITIN-19 종료일이 지난 여행은 "다음 여행"으로 노출되지 않음(자동 종료)', { tag: '@P1' }, async ({ page }) => {
    test.info().annotations.push({
      type: 'BE',
      description: '스케줄러가 도는 시점 자체는 검증하지 않고, 결과(지난 여행이 진행 중으로 남지 않음)만 확인. 종료 상태 필드는 BE 합의 필요',
    });
    const today = todayKst();
    const trips = await backendData<LiveTripSummary[]>(page.request, '/api/travel-plans/me');
    const ended = trips.filter((t) => t.end_date && t.end_date < today);
    test.skip(ended.length === 0, '종료일이 지난 여행이 없음');

    const upcoming = await backendData<LiveTripSummary | null>(page.request, '/api/travel-plans/upcoming');
    if (upcoming?.end_date) {
      expect(upcoming.end_date >= today, `종료된 여행 #${upcoming.travel_plan_id}(${upcoming.end_date})이 다음 여행으로 남아 있음`).toBe(true);
    }

    const homeUpcoming = waitForApi(page, 'GET', '/api/travel-plans/upcoming');
    await page.goto('/home');
    await homeUpcoming;
    for (const trip of ended) {
      await expect(page.locator('.hero-card').filter({ hasText: trip.title })).toHaveCount(0);
    }
  });

  test('LIVE-CONC-01 동일한 생성 요청을 동시에 두 번 보내도 서버는 한 번만 처리', { tag: '@P0' }, async ({ page, api }) => {
    test.skip(!LIVE_GENERATE, '실제 여행이 생성되고 LLM 이 호출됨 — .env.e2e 에 E2E_LIVE_GENERATE=true 일 때만 실행');

    // 앱이 실제로 만드는 요청 body 를 가로채고(백엔드로는 보내지 않음), 같은 body 를 동시에 두 번 보낸다.
    await goToPlacesStep(page, LIVE_BASIC);
    let body: unknown;
    api.once('POST', '/api/travel-plans', (req) => {
      body = req.body;
      return { abort: true };
    });
    await generateButton(page).click();
    await expect.poll(() => body).toBeTruthy();

    const responses = await Promise.all([
      backendRequest(page.request, 'POST', '/api/travel-plans', body),
      backendRequest(page.request, 'POST', '/api/travel-plans', body),
    ]);
    const statuses = responses.map((r) => r.status());
    const planIds = new Set<number>();
    for (const response of responses.filter((r) => r.ok())) {
      planIds.add((await response.json()).data.travel_plan_id);
    }

    test.info().annotations.push({ type: 'responses', description: `status ${statuses.join(', ')} / travel_plan_id ${[...planIds].join(', ')}` });
    expect(statuses.some((s) => s < 300), `최소 한 번은 접수돼야 함: ${statuses}`).toBe(true);
    // 두 번째 요청은 거절(409 등)되거나 같은 여행을 돌려줘야 한다.
    expect(planIds.size, `서로 다른 여행이 2개 생성됨: ${[...planIds]}`).toBe(1);
  });
});
