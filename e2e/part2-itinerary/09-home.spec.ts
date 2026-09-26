import { test, expect } from '../support/fixtures';
import { summary } from '../support/data';

/**
 * 9. 앱 진입 · 홈 화면
 * 기준 시각: 2026-10-01 09:00 (여행 77번 "서울 1박 2일 여행" 1일차)
 */
test.describe('9. 앱 진입 · 홈 화면', () => {
  const completedTrips = [
    summary({ travel_plan_id: 31, title: '강릉 바다 여행', start_date: '2026-09-20', end_date: '2026-09-21' }),
    summary({ travel_plan_id: 22, title: '전주 한옥 여행', start_date: '2026-08-10', end_date: '2026-08-11' }),
    summary({ travel_plan_id: 13, title: '제주 3박 4일', start_date: '2026-07-01', end_date: '2026-07-04' }),
  ];

  test('ITIN-01 진행 중 여행이 있으면 홈 상단에 "진행 중인 여행"과 진행률 노출', { tag: '@P0' }, async ({ page, api }) => {
    api.upcoming = summary({ completed_place_count: 2, total_place_count: 5 });

    await page.goto('/home');

    const hero = page.locator('.hero-card');
    await expect(hero).toContainText('서울 1박 2일 여행');
    await expect(hero).toContainText('진행 중');
    await expect(hero).toContainText(/2\s*\/\s*5/);
  });

  test('ITIN-02 진행 중·예정 여행이 없으면 빈 상태 안내', { tag: '@P1' }, async ({ page, api }) => {
    api.upcoming = null;
    api.recent = [];

    await page.goto('/home');

    await expect(page.locator('.hero-card')).toHaveCount(0);
    await expect(page.getByText('여행을 만들어볼까요?')).toBeVisible();
    await expect(page.getByText('최근에 다녀온 여행이 없습니다.')).toBeVisible();
  });

  test('ITIN-03 여러 여행이 있어도 진행 중(가장 가까운) 여행 1개만 우선 노출', { tag: '@P2' }, async ({ page, api }) => {
    test.info().annotations.push({ type: 'BE', description: '어떤 여행을 우선 노출할지는 /api/travel-plans/upcoming 이 결정' });
    api.upcoming = summary();
    api.myTrips = [
      summary({ travel_plan_id: 90, title: '부산 가을 여행', start_date: '2026-11-01', end_date: '2026-11-02' }),
      summary(),
      ...completedTrips,
    ];

    await page.goto('/home');

    await expect(page.locator('.hero-card')).toHaveCount(1);
    await expect(page.locator('.hero-card')).toContainText('서울 1박 2일 여행');
  });

  test('ITIN-04 "여행 기록 보기"에서 완료된 여행이 최신순으로 노출되고 클릭 시 상세 이동', { tag: '@P1' }, async ({ page, api }) => {
    api.myTrips = completedTrips;

    await page.goto('/home');
    await page.getByRole('button', { name: /여행 기록 보기/ }).click();
    await expect(page).toHaveURL(/\/my-trips$/);

    await expect(page.locator('.list-card strong')).toHaveText(['강릉 바다 여행', '전주 한옥 여행', '제주 3박 4일']);
    await page.locator('.list-card').filter({ hasText: '전주 한옥 여행' }).click();
    await expect(page).toHaveURL(/\/output\/22\/places$/);
  });

  test('ITIN-05(9절) 홈 "최근 여행"에 완료 여행이 최신순 1~3개 노출되고 클릭 시 상세 이동', { tag: '@P1' }, async ({ page, api }) => {
    api.recent = completedTrips;

    await page.goto('/home');

    const cards = page.locator('.list-card');
    await expect(cards).toHaveCount(3);
    await expect(cards.locator('strong')).toHaveText(['강릉 바다 여행', '전주 한옥 여행', '제주 3박 4일']);
    await cards.first().click();
    await expect(page).toHaveURL(/\/output\/31\/places$/);
  });
});
