import { test, expect } from '../support/live-fixtures';
import { backendData, storedUser } from '../support/live-session';
import { waitForApi } from '../support/live-flows';

/**
 * [live] 1. 인증 · 세션
 * 주입한 백엔드 인증 쿠키(.env.e2e → e2e/.auth/live-user.json)로 백엔드 인증을 확인한다.
 * 토큰 만료 같은 예외 상황만 api.once() 로 401 을 끼워 넣고, 재발급(/users/refresh)은 실제 백엔드가 처리한다.
 */
test.describe('[live] 1. 인증 · 세션', () => {
  test('LIVE-AUTH-01 주입한 세션으로 백엔드 인증 후 홈에 닉네임 표시', { tag: '@P0' }, async ({ page }) => {
    const me = await backendData<{ user_id: number; nickname: string; provider?: string }>(page.request, '/api/users/me');
    expect(me.user_id).toBeTruthy();
    expect(me.nickname).toBeTruthy();

    await page.goto('/home');
    const user = await storedUser(page);
    expect(user, 'localStorage.audigo.user 가 없습니다(npm run test:e2e:live:session 으로 세션 다시 준비)').not.toBeNull();
    expect(user!.user_id).toBe(me.user_id);
    await expect(page.getByText(`안녕하세요, ${user!.nickname}님`)).toBeVisible();
  });

  test('LIVE-AUTH-02 마이페이지에서 실제 내 정보 조회', { tag: '@P1' }, async ({ page }) => {
    const me = waitForApi(page, 'GET', '/api/users/me');
    await page.goto('/my');

    const response = await me;
    expect(response.status()).toBe(200);
    const { data } = await response.json();
    await expect(page.getByText(data.nickname).first()).toBeVisible();
  });

  test('LIVE-SESS-01 액세스 토큰 만료(401) 시 실제 백엔드에서 재발급 후 원래 요청 재시도', { tag: '@P0' }, async ({ page, api }) => {
    // 예외 주입: 첫 upcoming 요청만 401
    api.once('GET', '/api/travel-plans/upcoming', { status: 401, body: { message: 'unauthorized' } });
    const refresh = waitForApi(page, 'POST', '/users/refresh');
    const retried = waitForApi(page, 'GET', '/api/travel-plans/upcoming', (r) => r.status() !== 401);

    await page.goto('/home');

    expect((await refresh).status(), '/users/refresh 실패 — 리프레시 토큰 쿠키 확인').toBeLessThan(400);
    expect((await retried).status()).toBe(200);
    await expect(page).toHaveURL(/\/home$/);
    expect(api.callsTo('POST', '/users/refresh')).toHaveLength(1);
  });
});
