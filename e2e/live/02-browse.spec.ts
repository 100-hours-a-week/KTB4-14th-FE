import { test, expect } from '../support/live-fixtures';
import { backendData } from '../support/live-session';
import { dataOf, waitForApi, type LiveTripSummary } from '../support/live-flows';

/**
 * [live] 2. 조회 화면 (홈 · 여행 기록 · 일정 · 알림)
 * 실제 계정의 데이터에 따라 결과가 달라지므로, 백엔드 응답과 화면이 일치하는지를 검증한다.
 */
test.describe('[live] 2. 조회 화면', () => {
  test('LIVE-HOME-01 홈에서 다음 여행 · 최근 여행을 백엔드에서 불러와 표시', { tag: '@P0' }, async ({ page }) => {
    const upcomingResponse = waitForApi(page, 'GET', '/api/travel-plans/upcoming');
    const recentResponse = waitForApi(page, 'GET', '/api/travel-plans/recent');
    await page.goto('/home');

    const upcoming = await upcomingResponse;
    const recent = await recentResponse;
    expect(upcoming.status()).toBe(200);
    expect(recent.status()).toBe(200);

    const next = await dataOf<LiveTripSummary | null>(upcoming);
    if (next) await expect(page.locator('.hero-card')).toContainText(next.title);
    else await expect(page.getByText('여행을 만들어볼까요?')).toBeVisible();

    const recentTrips = await dataOf<LiveTripSummary[]>(recent);
    if (recentTrips.length) await expect(page.locator('.list-card').first()).toContainText(recentTrips[0].title);
    else await expect(page.getByText('최근에 다녀온 여행이 없습니다.')).toBeVisible();
  });

  test('LIVE-TRIP-01 여행 기록 목록이 백엔드 응답과 일치', { tag: '@P1' }, async ({ page }) => {
    const mine = waitForApi(page, 'GET', '/api/travel-plans/me');
    await page.goto('/my-trips');

    const response = await mine;
    expect(response.status()).toBe(200);
    const trips = await dataOf<LiveTripSummary[]>(response);
    test.skip(trips.length === 0, '계정에 여행 기록이 없음');
    await expect(page.locator('.list-card strong').first()).toHaveText(trips[0].title);
  });

  test('LIVE-ITIN-01 생성된 여행의 일정 · 이동 경로가 표시', { tag: '@P0' }, async ({ page }) => {
    const trips = await backendData<LiveTripSummary[]>(page.request, '/api/travel-plans/me');
    const trip = trips.find((t) => !t.status || t.status === 'COMPLETED');
    test.skip(!trip, '완료된(COMPLETED) 여행이 없음 — E2E_LIVE_GENERATE=true 로 LIVE-ASY-01 을 먼저 실행하면 생긴다');

    const itinerary = waitForApi(page, 'GET', `/api/travel-plans/${trip!.travel_plan_id}/itinerary`);
    await page.goto(`/output/${trip!.travel_plan_id}/places`);

    expect((await itinerary).status()).toBe(200);
    await expect(page.getByRole('heading', { name: trip!.title })).toBeVisible();
    await expect(page.locator('.output-place-row').first()).toBeVisible();

    await page.getByRole('tab', { name: '이동 경로' }).click();
    await expect(page).toHaveURL(new RegExp(`/output/${trip!.travel_plan_id}/routes$`));
  });

  test('LIVE-ITIN-02 일정 조회 중 토큰 만료(401)돼도 실제 재발급 후 일정 표시', { tag: '@P1' }, async ({ page, api }) => {
    const trips = await backendData<LiveTripSummary[]>(page.request, '/api/travel-plans/me');
    const trip = trips.find((t) => !t.status || t.status === 'COMPLETED');
    test.skip(!trip, '완료된(COMPLETED) 여행이 없음');

    api.once('GET', '/api/travel-plans/:id/itinerary', { status: 401, body: { message: 'unauthorized' } });
    const refresh = waitForApi(page, 'POST', '/users/refresh');
    await page.goto(`/output/${trip!.travel_plan_id}/places`);

    expect((await refresh).status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { name: trip!.title })).toBeVisible();
    await expect(page.locator('.output-place-row').first()).toBeVisible();
  });

  test('LIVE-NOTI-01 알림함이 백엔드 알림 목록과 일치', { tag: '@P1' }, async ({ page }) => {
    const list = waitForApi(page, 'GET', '/api/notifications');
    await page.goto('/notifications');

    const response = await list;
    expect(response.status()).toBe(200);
    const notifications = await dataOf<Array<{ title: string }>>(response);
    if (notifications.length) {
      await expect(page.locator('.noti-row')).toHaveCount(notifications.length);
      await expect(page.locator('.noti-row strong').first()).toHaveText(notifications[0].title);
    } else {
      await expect(page.getByText('알림이 없습니다.')).toBeVisible();
    }
  });
});
