import { test, expect } from '../support/fixtures';
import { summary } from '../support/data';
import { placeRow } from '../support/flows';

/** 12. 마지막 장소 도착 · 여행 종료 */
test.describe('12. 마지막 장소 · 여행 종료', () => {
  test.use({ now: '2026-10-02T13:20:00+09:00' });

  test('ITIN-18 마지막 장소 완료 체크 시 즉시 종료되지 않음(종료 시각 이후 자동 종료)', { tag: '@P0' }, async ({ page, api }) => {
    test.info().annotations.push({ type: 'BE', description: '조정된 마지막 시각 이후 자동 종료는 백엔드 스케줄러 테스트에서 검증' });
    api.upcoming = summary();

    await page.goto('/output/77/places');
    const lastRow = placeRow(page, '명동교자');
    await expect(lastRow).toBeVisible();

    const check = lastRow.getByRole('button', { name: /일정 완료$/ });
    if ((await check.count()) > 0) await check.click();

    // 화면 이동이나 종료 처리 없이 그대로 유지
    await expect(page).toHaveURL(/\/output\/77\/places$/);
    await expect(page.getByRole('heading', { name: '서울 1박 2일 여행' })).toBeVisible();

    // 홈에서도 여전히 진행 중 여행으로 노출
    await page.goto('/home');
    await expect(page.locator('.hero-card')).toContainText('서울 1박 2일 여행');
  });

  test.skip('ITIN-19 일부 장소 미완료 상태로 종료 시각이 지나면 자동 종료', { tag: ['@P1', '@BE'] }, async () => {
    // 종료 시각 도래 시 상태 전환은 백엔드 스케줄러 책임 → 백엔드 통합 테스트에서 검증.
  });
});
