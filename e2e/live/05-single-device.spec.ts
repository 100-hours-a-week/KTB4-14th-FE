import { test, expect } from '../support/live-fixtures';
import { API_BASE_URL, AUTH_COOKIES_PREV } from '../support/env';
import { isSessionValid, parseCookieHeader } from '../support/live-session';

/**
 * [live] 5. 단일 기기 세션
 * 정책: 한 계정은 한 기기만 로그인할 수 있다(유저당 리프레시 토큰 1개).
 * 이전 기기 = E2E_AUTH_COOKIES_PREV(먼저 로그인한 기기), 현재 기기 = E2E_AUTH_COOKIES(나중에 로그인한 기기).
 * 액세스 토큰은 만료 전까지 쓸 수 있으므로, 이전 기기가 재발급을 받지 못하는지로 확인한다.
 */
test.describe('[live] 5. 단일 기기 세션', () => {
  test('LIVE-SESS-05 같은 계정으로 새 기기에서 로그인하면 이전 기기 세션 만료', { tag: '@P2' }, async ({ page, playwright }) => {
    test.skip(!AUTH_COOKIES_PREV, '이전 기기 쿠키 없음 — .env.e2e 에 E2E_AUTH_COOKIES_PREV 를 넣으면 실행');

    const previous = await playwright.request.newContext({
      storageState: { cookies: parseCookieHeader(AUTH_COOKIES_PREV!), origins: [] },
    });
    try {
      const refreshed = await previous.post(`${API_BASE_URL}/users/refresh`);
      expect(refreshed.status(), '새 로그인 이후에도 이전 기기가 토큰을 재발급받음(단일 기기 정책 위반)').toBe(401);
    } finally {
      await previous.dispose();
    }

    // 이전 토큰 재사용 시도 때문에 현재 기기 세션까지 끊기면 안 된다.
    expect(await isSessionValid(page.request), '이전 기기의 재발급 시도 후 현재 기기 세션도 끊김').toBe(true);
  });
});
