import { test, expect } from '../support/fixtures';
import { notification } from '../support/data';
import { generationScript } from '../support/mock-backend';

/** 5. 알림 목록 및 이동 (SSE: GET /api/notifications/subscribe) */
test.describe('5. 알림 목록 및 이동', () => {
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

  test('NOTI-06 새 채팅 알림에 발신자 문구를 표시하고 해당 채팅방으로 이동한다', { tag: '@P0' }, async ({ page, api }) => {
    api.notifications = [notification({
      notification_id: 6,
      type: 'NEW_MESSAGE',
      title: '새 채팅',
      body: '김민지님이 메시지를 보냈습니다',
      target_type: 'CHAT_ROOM',
      target_id: 321,
      travel_plan_id: undefined,
    })];

    await page.goto('/notifications');
    await expect(page.getByText('김민지님이 메시지를 보냈습니다')).toBeVisible();
    await page.locator('.noti-row').click();

    await expect(page).toHaveURL(/\/chat\/321$/);
    await expect(page.getByRole('alert')).toContainText('채팅방을 찾을 수 없어요');
    expect(api.callsTo('PATCH', '/api/notifications/6/read')).toHaveLength(1);
  });

  test('NOTI-07 매칭 성공 알림에서 매칭 완료 화면을 거쳐 채팅방으로 이동한다', { tag: '@P0' }, async ({ page, api }) => {
    api.notifications = [notification({
      notification_id: 7,
      type: 'MATCH_SUCCESS',
      title: '매칭 성공',
      body: '박유혁님과 매칭이 완료되었습니다.',
      target_type: 'MATCH_CONNECTION',
      target_id: 700,
      travel_plan_id: undefined,
    })];

    await page.goto('/notifications');
    await page.locator('.noti-row').click();

    await expect(page).toHaveURL(/\/matching\/result\?matchConnectionId=700$/);
    await expect(page.getByText('박유혁님과 매칭이 완료되었습니다.')).toBeVisible();
    await page.getByRole('button', { name: '채팅 시작하기' }).click();
    await expect(page).toHaveURL(/\/chat\/1700$/);
    expect(api.callsTo('PATCH', '/api/notifications/7/read')).toHaveLength(1);
  });

  test('NOTI-08 연결 대상이 없는 알림은 읽음 처리 후 안내한다', { tag: '@P1' }, async ({ page, api }) => {
    api.notifications = [notification({
      notification_id: 8,
      type: 'NEW_MESSAGE',
      title: '새 채팅',
      body: '연결 대상이 없는 알림',
      target_type: 'CHAT_ROOM',
      target_id: undefined,
      travel_plan_id: undefined,
    })];

    await page.goto('/notifications');
    await page.locator('.noti-row').click();

    await expect(page).toHaveURL(/\/notifications$/);
    await expect(page.locator('.toast')).toHaveText('연결된 화면을 열 수 없어요.');
    await expect(page.locator('.noti-row.unread')).toHaveCount(0);
    expect(api.callsTo('PATCH', '/api/notifications/8/read')).toHaveLength(1);

    await page.reload();
    await expect(page.locator('.noti-row.unread')).toHaveCount(0);
  });

  test('NOTI-09 접근할 수 없는 매칭 연결은 안내하고 결과 화면을 유지한다', { tag: '@P1' }, async ({ page, api }) => {
    api.notifications = [notification({
      notification_id: 9,
      type: 'MATCH_SUCCESS',
      title: '매칭 성공',
      body: '접근할 수 없는 매칭 알림',
      target_type: 'MATCH_CONNECTION',
      target_id: 701,
      travel_plan_id: undefined,
    })];
    api.once('POST', '/api/v2/match-connections/701/chat-room', { status: 404, body: { message: 'match_connection_not_found' } });

    await page.goto('/notifications');
    await page.locator('.noti-row').click();
    await page.getByRole('button', { name: '채팅 시작하기' }).click();

    await expect(page).toHaveURL(/\/matching\/result\?matchConnectionId=701$/);
    await expect(page.locator('.toast')).toHaveText('매칭 정보를 확인하지 못했어요. 다시 시도해 주세요.');
  });
});

test.describe('5-2. 알림 뒤로가기', () => {
  test('NOTI-11 홈 이외의 화면에서 알림을 열어도 뒤로가기는 홈으로 이동한다', async ({ page }) => {
    await page.goto('/matching/result?matchConnectionId=700');
    await page.getByRole('button', { name: '알림', exact: true }).click();
    await expect(page).toHaveURL(/\/notifications$/);

    await page.getByRole('button', { name: '뒤로', exact: true }).click();

    await expect(page).toHaveURL(/\/home$/);
  });

  test('NOTI-12 매칭 상세에서 알림으로 돌아온 뒤 브라우저 뒤로가기로 상세가 다시 열리지 않는다', { tag: '@P0' }, async ({ page, api }) => {
    api.notifications = [notification({
      notification_id: 12,
      type: 'MATCH_SUCCESS',
      title: '매칭 성공',
      body: '여행 메이트와 매칭이 완료되었습니다.',
      target_type: 'MATCH_CONNECTION',
      target_id: 700,
      travel_plan_id: undefined,
    })];
    await page.goto('/home');
    await page.getByRole('button', { name: '알림', exact: true }).click();
    await page.locator('.noti-row').click();
    await expect(page).toHaveURL(/\/matching\/result\?matchConnectionId=700$/);

    await page.getByRole('button', { name: '뒤로', exact: true }).click();
    await expect(page).toHaveURL(/\/notifications$/);
    await expect(page.locator('.noti-row.unread')).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(/\/notifications$/);
    await page.getByRole('button', { name: '뒤로', exact: true }).click();

    await expect(page).toHaveURL(/\/home$/);
  });

  test('NOTI-13 잘못된 매칭 알림 상세에서도 알림과 홈으로 순서대로 복귀한다', async ({ page }) => {
    await page.goto('/home');
    await page.goto('/matching/result?matchConnectionId=invalid');
    await expect(page.getByRole('alert')).toContainText('매칭 정보를 확인할 수 없어요');

    await page.getByRole('button', { name: '뒤로', exact: true }).click();
    await expect(page).toHaveURL(/\/notifications$/);
    await page.goBack();

    await expect(page).toHaveURL(/\/home$/);
  });
});

test.describe('5-1. v2 알림 설정', () => {
  test('NOTI-10 D-1 항목을 제외하고 변경한 설정을 유지한다', { tag: '@P1' }, async ({ page }) => {
    await page.goto('/my');
    await page.getByRole('button', { name: /알림 설정/ }).click();

    await expect(page.getByText('여행 D-1')).toHaveCount(0);
    await expect(page.getByRole('checkbox')).toHaveCount(4);

    await page.getByRole('checkbox', { name: '새 채팅 설정' }).uncheck();
    await page.getByRole('checkbox', { name: '전체 알림 설정' }).uncheck();
    await page.getByRole('button', { name: '저장' }).click();

    await expect(page).toHaveURL(/\/my$/);
    await page.getByRole('button', { name: /알림 설정/ }).click();

    await expect(page.getByRole('checkbox', { name: '매칭 성공 설정' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: '새 채팅 설정' })).not.toBeChecked();
    await expect(page.getByRole('checkbox', { name: '여행 생성 결과 설정' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: '전체 알림 설정' })).not.toBeChecked();
  });
});
