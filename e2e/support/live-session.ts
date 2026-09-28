import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { APIRequest, APIRequestContext, BrowserContext, Page } from '@playwright/test';
import { API_BASE_URL, APP_ORIGIN, AUTH_STATE_PATH } from './env';

type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;
type Cookie = StorageState['cookies'][number];

export function readAuthState(path = AUTH_STATE_PATH): StorageState | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as StorageState;
  } catch {
    return null;
  }
}

export function writeAuthState(state: StorageState, path = AUTH_STATE_PATH) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2));
}

/**
 * 백엔드 쿠키는 Vite 프록시를 거쳐 앱 도메인(localhost)에 저장된다(vite.config.ts 가 Domain · Secure 를 떼어 냄).
 * 주입 쿠키와 예전(프록시 이전) 세션 파일의 백엔드 도메인 쿠키도 같은 모양으로 맞춘다.
 */
function asAppCookie(name: string, value: string): Cookie {
  return {
    name,
    value,
    domain: new URL(APP_ORIGIN).hostname,
    path: '/',
    expires: -1,
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  };
}

/**
 * "a=1; b=2" 형태의 Cookie 헤더 값을 앱 도메인 쿠키로 바꾼다.
 * 앞에 "Cookie:" 가 붙어 있거나 따옴표로 감싸도 된다.
 */
export function parseCookieHeader(header: string): Cookie[] {
  return header
    .trim()
    .replace(/^cookie:\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const index = part.indexOf('=');
      if (index <= 0) throw new Error(`쿠키 형식이 올바르지 않습니다: "${part}" (name=value; name=value 형태로 넣어 주세요)`);
      return asAppCookie(part.slice(0, index).trim(), part.slice(index + 1).trim());
    });
}

/**
 * 백엔드 요청(브라우저 컨텍스트 쿠키 공유).
 * 액세스 토큰이 만료됐으면 /users/refresh 후 한 번 재시도한다.
 * 백엔드는 인증 실패 시 401 이 아니라 403 을 준다(SecurityConfig 에 AuthenticationEntryPoint 없음) — 둘 다 재발급 대상으로 본다.
 */
export async function backendRequest(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  data?: unknown,
) {
  const send = () => request.fetch(`${API_BASE_URL}${path}`, { method, data });
  let response = await send();
  if (response.status() === 401 || response.status() === 403) {
    const refreshed = await request.post(`${API_BASE_URL}/users/refresh`);
    if (refreshed.ok()) response = await send();
  }
  return response;
}

/** `{ message, data }` 봉투에서 data 를 꺼낸다. */
export async function backendData<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await backendRequest(request, 'GET', path);
  if (!response.ok()) {
    throw new Error(`GET ${path} → ${response.status()} ${await response.text()}`);
  }
  const json = await response.json();
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

/** 저장된 세션으로 백엔드 인증이 되는지 확인한다(GET /api/users/me). */
export async function isSessionValid(request: APIRequestContext) {
  const response = await backendRequest(request, 'GET', '/api/users/me');
  return response.ok();
}

type Me = { user_id: number; nickname: string; profile_image_url?: string | null };

/**
 * live 세션 준비.
 * 1) 저장된 세션 파일(재발급으로 갱신된 최신 토큰)이 유효하면 그대로 쓴다.
 * 2) 아니면 .env.e2e 의 쿠키를 주입해서 확인한다.
 * 유효하면 쿠키 + localStorage(audigo.user: 앱이 로그인 후 저장하는 값)를 세션 파일에 저장하고 true.
 */
export async function prepareSession(
  requestFactory: APIRequest,
  { statePath, cookieHeader }: { statePath: string; cookieHeader?: string },
): Promise<{ ok: true; source: 'saved' | 'env'; nickname: string } | { ok: false; reason: string }> {
  const candidates: Array<{ source: 'saved' | 'env'; cookies: Cookie[] }> = [];
  const saved = readAuthState(statePath);
  if (saved?.cookies.length) {
    const appHost = new URL(APP_ORIGIN).hostname;
    const cookies = saved.cookies.map((c) => (c.domain === appHost ? c : asAppCookie(c.name, c.value)));
    candidates.push({ source: 'saved', cookies });
  }
  if (cookieHeader) candidates.push({ source: 'env', cookies: parseCookieHeader(cookieHeader) });
  if (candidates.length === 0) return { ok: false, reason: '저장된 세션도, 주입할 쿠키도 없음' };

  for (const candidate of candidates) {
    const request = await requestFactory.newContext({ storageState: { cookies: candidate.cookies, origins: [] } });
    try {
      const response = await backendRequest(request, 'GET', '/api/users/me');
      if (!response.ok()) continue;
      const me = ((await response.json()).data ?? {}) as Me;
      const user = { user_id: me.user_id, nickname: me.nickname, profile_image_url: me.profile_image_url ?? null, is_new_user: false };
      // 재발급됐으면 새 쿠키가 들어 있다.
      const { cookies } = await request.storageState();
      writeAuthState(
        { cookies, origins: [{ origin: APP_ORIGIN, localStorage: [{ name: 'audigo.user', value: JSON.stringify(user) }] }] },
        statePath,
      );
      return { ok: true, source: candidate.source, nickname: me.nickname };
    } finally {
      await request.dispose();
    }
  }
  return { ok: false, reason: `인증 실패(${candidates.map((c) => c.source).join(', ')} 모두 401) — 쿠키가 만료됐거나 잘못됨` };
}

/** 앱이 로그인 후 localStorage 에 넣는 사용자 정보 */
export async function storedUser(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('audigo.user');
    return raw ? (JSON.parse(raw) as { user_id: number; nickname: string }) : null;
  });
}
