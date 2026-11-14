import { test, expect } from '../support/fixtures';
import { summary } from '../support/data';
import { generationScript } from '../support/mock-backend';
import { generateButton, goToPlacesStep } from '../support/flows';

/**
 * 6. 세션 · 토큰
 * 액세스 토큰 만료 = 보호 API 가 401 응답 → 클라이언트가 POST /users/refresh 후 원 요청 재시도.
 */
test.describe('6. 세션 · 토큰', () => {
  test('SESS-01 액세스 토큰 만료 시 자동 재발급 후 원래 요청 재시도', { tag: '@P0' }, async ({ page, api }) => {
    api.upcoming = summary();
    api.once('GET', '/api/travel-plans/upcoming', { status: 401, body: { message: 'unauthorized' } });

    await page.goto('/home');

    await expect(page.locator('.hero-card')).toContainText('서울 1박 2일 여행');
    await expect(page).toHaveURL(/\/home$/);
    expect(api.callsTo('POST', '/users/refresh')).toHaveLength(2);
    // 401 받은 요청 이후 같은 요청이 한 번 더(재시도) 호출되어야 한다
    const refreshedAt = api.callsTo('POST', '/users/refresh')[1].at;
    expect(api.callsTo('GET', '/api/travel-plans/upcoming').filter((c) => c.at >= refreshedAt).length).toBeGreaterThanOrEqual(1);
  });

  test('SESS-02 마법사 작성 도중 토큰 만료 — 입력 데이터 손실 없이 정상 제출', { tag: '@P0' }, async ({ page, api }) => {
    await goToPlacesStep(page);
    api.once('POST', '/api/v2/travel-plans', { status: 401, body: { message: 'unauthorized' } });

    await generateButton(page).click();

    await expect(page).toHaveURL(/\/generating\/\d+/);
    const creates = api.callsTo('POST', '/api/v2/travel-plans');
    expect(creates).toHaveLength(2);
    expect(creates[1].body).toEqual(creates[0].body);
    expect(creates[1].body).toMatchObject({ region_id: 11, companion_type: 'FRIEND' });
    expect(api.callsTo('POST', '/users/refresh')).toHaveLength(2);
  });

  test('SESS-03 리프레시 토큰까지 만료되면 401 후 로그인 화면으로 이동', { tag: '@P1' }, async ({ page, api }) => {
    api.on('GET', '/api/travel-plans/upcoming', { status: 401, body: { message: 'unauthorized' } });
    api.on('GET', '/api/travel-plans/recent', { status: 401, body: { message: 'unauthorized' } });
    api.on('POST', '/users/refresh', { status: 401, body: { message: 'refresh_token_expired' } });

    await page.goto('/home');

    await expect(page).toHaveURL(/\/login$/);
  });

  test('SESS-04 생성 대기(폴링) 중 세션 만료되어도 생성 결과 유실 없음', { tag: '@P1' }, async ({ page, api }) => {
    const { url } = api.createGeneration(
      generationScript(
        { status: 'GENERATING', done: 1 },
        { status: 'GENERATING', done: 2 },
        { status: 'GENERATING', done: 3 },
        { status: 'COMPLETED', done: 4 },
      ),
    );
    await page.goto(url);
    await expect(page.locator('.step .check.done')).toHaveCount(1);

    api.once('GET', '/api/ai-generation-jobs/:id', { status: 401, body: { message: 'unauthorized' } });

    await expect(page).toHaveURL(/\/output\/\d+\/places$/, { timeout: 15_000 });
    expect(api.callsTo('POST', '/users/refresh')).toHaveLength(2);
    await expect(page.getByRole('heading', { name: '서울 1박 2일 여행' })).toBeVisible();
  });

  test('SESS-05 인증 서비스 장애 시 로그인 상태를 보존하고 재시도한다', { tag: '@P1' }, async ({ page, api }) => {
    api.on('POST', '/users/refresh', { status: 503, body: { message: 'auth_service_unavailable' } });

    await page.goto('/home');

    await expect(page.getByText('인증 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('audigo.user'))).not.toBeNull();

    api.on('POST', '/users/refresh', { body: null });
    await page.getByRole('button', { name: '다시 시도' }).click();
    await expect(page.getByRole('heading', { name: '내 여행' })).toBeVisible();
    await expect(page).toHaveURL(/\/home$/);
    expect(api.callsTo('POST', '/users/refresh')).toHaveLength(2);
  });

  test.describe('마이페이지 내 정보 조회', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/home');
      await expect(page.getByRole('link', { name: '마이' })).toBeVisible();
    });

    test('403 후 토큰 재발급에 성공하면 내 정보를 다시 조회한다', async ({ page, api }) => {
      let refreshed = false;
      api.on('POST', '/users/refresh', () => {
        refreshed = true;
        return { body: null };
      });
      api.on('GET', '/api/users/me', () => refreshed
        ? { body: { ...api.user, nickname: '새닉네임', completed_travel_count: 3, upcoming_travel_count: 1 } }
        : { status: 403 });

      await page.getByRole('link', { name: '마이' }).click();
      await expect(page.getByRole('button', { name: '새닉네임' })).toBeVisible();
      await expect(page).toHaveURL(/\/my$/);
      expect(api.callsTo('POST', '/users/refresh')).toHaveLength(2); // 앱 시작 1회와 403 복구 1회
    });

    test('403 후 재발급도 401이면 수동 로그아웃 없이 로그인 화면으로 이동한다', async ({ page, api }) => {
      api.on('GET', '/api/users/me', { status: 403 });
      api.on('POST', '/users/refresh', { status: 401, body: { message: 'invalid_refresh_token' } });

      await page.getByRole('link', { name: '마이' }).click();
      await expect(page).toHaveURL(/\/login$/);
      expect(await page.evaluate(() => localStorage.getItem('audigo.user'))).toBeNull();
      await expect(page.getByText('사용자 정보를 불러오지 못했습니다.')).toHaveCount(0);
    });

    test('사용자 정보 서버 오류는 재발급 없이 조회 오류를 안내한다', async ({ page, api }) => {
      api.on('GET', '/api/users/me', { status: 500 });
      await page.getByRole('link', { name: '마이' }).click();
      await expect(page.getByText('사용자 정보를 불러오지 못했습니다.')).toBeVisible();
      await expect(page).toHaveURL(/\/my$/);
      expect(api.callsTo('POST', '/users/refresh')).toHaveLength(1);
    });
  });
});
