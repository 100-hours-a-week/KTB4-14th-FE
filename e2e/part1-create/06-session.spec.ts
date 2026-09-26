import { test, expect, knownGap } from '../support/fixtures';
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
    expect(api.callsTo('POST', '/users/refresh')).toHaveLength(1);
    // 401 받은 요청 이후 같은 요청이 한 번 더(재시도) 호출되어야 한다
    const refreshedAt = api.callsTo('POST', '/users/refresh')[0].at;
    expect(api.callsTo('GET', '/api/travel-plans/upcoming').filter((c) => c.at >= refreshedAt).length).toBeGreaterThanOrEqual(1);
  });

  test('SESS-02 마법사 작성 도중 토큰 만료 — 입력 데이터 손실 없이 정상 제출', { tag: '@P0' }, async ({ page, api }) => {
    await goToPlacesStep(page);
    api.once('POST', '/api/travel-plans', { status: 401, body: { message: 'unauthorized' } });

    await generateButton(page).click();

    await expect(page).toHaveURL(/\/generating\/\d+/);
    const creates = api.callsTo('POST', '/api/travel-plans');
    expect(creates).toHaveLength(2);
    expect(creates[1].body).toEqual(creates[0].body);
    expect(creates[1].body).toMatchObject({ region_id: 11, companion_type: 'FRIEND' });
    expect(api.callsTo('POST', '/users/refresh')).toHaveLength(1);
  });

  test('SESS-03 리프레시 토큰까지 만료되면 401 후 로그인 화면으로 이동', { tag: '@P1' }, async ({ page, api }) => {
    knownGap('리프레시 실패 시 로그인 화면 이동 없음 (api/client.ts)');
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
    expect(api.callsTo('POST', '/users/refresh')).toHaveLength(1);
    await expect(page.getByRole('heading', { name: '서울 1박 2일 여행' })).toBeVisible();
  });

  test.skip('SESS-05 동일 계정 다중 기기 로그인 시 두 기기 모두 작동', { tag: ['@P2', '@BE'] }, async () => {
    // 세션 동시 허용 정책은 백엔드(리프레시 토큰 저장 방식) 책임.
    // → 백엔드 통합 테스트 또는 스테이징에서 실제 기기 2대로 수동 확인.
  });
});
