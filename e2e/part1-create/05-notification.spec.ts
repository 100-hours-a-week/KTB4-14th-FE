import { test, expect, knownGap } from '../support/fixtures';
import { notification } from '../support/data';
import { generationScript } from '../support/mock-backend';

/** 5. 생성 완료 알림 (SSE: GET /api/notifications/subscribe) */
test.describe('5. 생성 완료 알림', () => {
  test('NOTI-01 생성 완료 시 알림이 생성되고 빨간 뱃지 표시', { tag: '@P0' }, async ({ page, api }) => {
    const { url } = api.createGeneration(generationScript({ status: 'GENERATING', done: 2 }, { status: 'COMPLETED', done: 4 }));
    await page.goto(url);
    await expect(page).toHaveURL(/\/output\/\d+\/places$/, { timeout: 10_000 });

    await expect(page.locator('.toast')).toContainText('생성된 여행 일정을 확인해 보세요.');
    await expect(page.getByRole('button', { name: '알림' }).locator('.badge-dot')).toBeVisible();
    expect(api.notifications.filter((n) => n.type === 'TRAVEL_COMPLETE')).toHaveLength(1);
  });

  test('NOTI-02 알림함에서 생성 완료 알림이 최신순으로 노출되고 클릭 시 해당 여행으로 이동', { tag: '@P0' }, async ({ page, api }) => {
    api.notifications = [
      notification({ notification_id: 3, title: '부산 여행 일정이 완성됐어요', created_at: '2026-10-01T08:30:00+09:00', travel_plan_id: 88, target_id: 88 }),
      notification({ notification_id: 2, title: '서울 여행 일정이 완성됐어요', created_at: '2026-09-30T20:00:00+09:00', travel_plan_id: 77, target_id: 77 }),
      notification({ notification_id: 1, type: 'TRAVEL_BEFORE', title: '여행 하루 전이에요', created_at: '2026-09-29T09:00:00+09:00', is_read: true }),
    ];

    await page.goto('/home');
    await page.getByRole('button', { name: '알림' }).click();
    await expect(page).toHaveURL(/\/notifications$/);

    await expect(page.locator('.noti-row strong')).toHaveText([
      '부산 여행 일정이 완성됐어요',
      '서울 여행 일정이 완성됐어요',
      '여행 하루 전이에요',
    ]);

    await page.locator('.noti-row').filter({ hasText: '서울 여행 일정이 완성됐어요' }).click();
    await expect(page).toHaveURL(/\/output\/77\/places$/);
    expect(api.callsTo('PATCH', '/api/notifications/2/read')).toHaveLength(1);
  });

  test('NOTI-03 "모두 읽음" 시 모든 알림이 읽음 처리(투명도 60%)되고 뱃지 제거', { tag: '@P1' }, async ({ page, api }) => {
    knownGap('읽은 알림 투명도 60% 스타일 없음 (pages.css)');
    api.notifications = [
      notification({ notification_id: 2, title: '알림 A' }),
      notification({ notification_id: 1, title: '알림 B' }),
    ];
    await page.goto('/home');
    await expect(page.getByRole('button', { name: '알림' }).locator('.badge-dot')).toBeVisible();

    await page.getByRole('button', { name: '알림' }).click();
    await page.getByRole('button', { name: '모두 읽음' }).click();

    expect(api.callsTo('POST', '/api/notifications/read-all')).toHaveLength(1);
    await expect(page.locator('.noti-row.unread')).toHaveCount(0);
    for (const row of await page.locator('.noti-row').all()) {
      await expect(row).toHaveCSS('opacity', '0.6');
    }

    await page.getByRole('button', { name: '뒤로' }).click();
    await expect(page.getByRole('button', { name: '알림' }).locator('.badge-dot')).toHaveCount(0);
  });

  test('NOTI-04 알림이 없으면 "알림이 없습니다" 안내', { tag: '@P2' }, async ({ page }) => {
    await page.goto('/notifications');
    await expect(page.getByText('알림이 없습니다.')).toBeVisible();
  });

  test('NOTI-05 생성 최종 실패 시 실패 알림 발송', { tag: '@P1' }, async ({ page, api }) => {
    const { url } = api.createGeneration(generationScript({ status: 'FAILED', done: 1 }));
    await page.goto(url);
    await expect(page.getByRole('heading', { name: '최적의 여행을 만드는 데 실패하였습니다.' })).toBeVisible({ timeout: 10_000 });

    await page.goto('/notifications');
    await expect(page.locator('.noti-row').first()).toContainText('여행 생성에 실패했어요');
  });
});
