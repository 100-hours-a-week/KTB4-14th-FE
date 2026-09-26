import { test, expect, knownGap } from '../support/fixtures';
import { summary } from '../support/data';
import { placeRow, toggleCompletion } from '../support/flows';

/** 14. 오프라인 · 네트워크 예외 */
test.describe('14. 오프라인 · 네트워크 예외', () => {
  test('ITIN-22 오프라인 상태에서 일정 화면에 들어가면 오프라인 안내 토스트', { tag: '@P1' }, async ({ page, context, api }) => {
    knownGap('오프라인 안내 토스트 없음 (OutputPage.tsx)');
    api.upcoming = summary();
    await page.goto('/home');
    await expect(page.getByRole('button', { name: '일정 이어보기' })).toBeVisible();

    api.offline = true;
    await context.setOffline(true);
    await page.getByRole('button', { name: '일정 이어보기' }).click();

    await expect(page.locator('.toast')).toContainText(/오프라인|네트워크/);
  });

  test('ITIN-23 오프라인에서 완료 체크 실패 → 온라인 복귀 후 다시 체크', { tag: '@P2' }, async ({ page, context, api }) => {
    await page.goto('/output/77/places');
    await expect(placeRow(page, '경복궁')).toBeVisible();

    api.offline = true;
    await context.setOffline(true);
    await toggleCompletion(page, '경복궁');
    await expect(page.getByRole('alert')).toContainText('일정 완료 상태를 저장하지 못했어요.');
    await expect(placeRow(page, '경복궁')).not.toHaveClass(/completed/);

    api.offline = false;
    await context.setOffline(false);
    await toggleCompletion(page, '경복궁');
    await expect(placeRow(page, '경복궁')).toHaveClass(/completed/);
  });
});
