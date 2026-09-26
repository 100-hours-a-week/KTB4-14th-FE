import { test, expect } from '../support/fixtures';
import { placeRow, toggleCompletion } from '../support/flows';

/** 13. 세션 만료 (여행 중) */
test.describe('13. 세션 만료 (여행 중)', () => {
  test('ITIN-20 일정 확인 중 액세스 토큰이 만료돼도 자동 재발급되어 흐름 유지', { tag: '@P0' }, async ({ page, api }) => {
    api.once('GET', '/api/travel-plans/:id/itinerary', { status: 401, body: { message: 'unauthorized' } });

    await page.goto('/output/77/places');

    await expect(page.getByRole('heading', { name: '서울 1박 2일 여행' })).toBeVisible();
    await expect(page.locator('.output-place-row')).toHaveCount(5);
    expect(api.callsTo('POST', '/users/refresh')).toHaveLength(1);
    await expect(page).toHaveURL(/\/output\/77\/places$/);
  });

  test('ITIN-21 완료 체크 요청과 토큰 만료가 겹쳐도 체크가 유실되지 않음', { tag: '@P1' }, async ({ page, api }) => {
    await page.goto('/output/77/places');
    api.once('PATCH', '/api/itinerary-items/:id/completion', { status: 401, body: { message: 'unauthorized' } });

    await toggleCompletion(page, '경복궁');

    await expect(placeRow(page, '경복궁')).toHaveClass(/completed/);
    expect(api.callsTo('PATCH', '/api/itinerary-items/101/completion')).toHaveLength(2);
    expect(api.callsTo('POST', '/users/refresh')).toHaveLength(1);
    expect(api.itineraryOf(77).itinerary_days[0].items[0].is_completed).toBe(true);
  });
});
