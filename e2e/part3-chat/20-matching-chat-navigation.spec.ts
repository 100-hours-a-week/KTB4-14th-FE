import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { notification } from '../support/data';
import type { MockBackend } from '../support/mock-backend';

const connectionId = 1201;
const roomId = 2201;
const selectedBody = '매칭상대01님과 매칭이 완료되었습니다.';

async function openCandidates(page: Page, api: MockBackend) {
  api.on('GET', '/api/v2/matching-requests/me', { body: {
    matching_request_id: 101,
    user_id: api.user.user_id,
    preferred_companion_gender: 'MALE',
    theme: ['FOOD'],
    pace: 'RELAXED',
    budget_min: 300000,
    budget_max: 800000,
    status: 'ACTIVE',
    latest_attempt_status: 'SUCCEEDED',
    retry_count: 0,
    remaining_retry_count: 3,
    can_rematch: true,
    has_result: true,
  } });
  api.on('GET', '/api/v2/matches/candidates', { body: {
    candidates: [201, 202].map((id, index) => ({
      user_id: id,
      nickname: `매칭상대0${index + 1}`,
      profile_image_url: null,
      theme: ['FOOD'],
      pace: 'RELAXED',
      match_rate: 91,
    })),
    count: 2,
    retry_count: 0,
    remaining_retry_count: 3,
    can_rematch: true,
  } });
  await page.goto('/matching');
  await expect(page.getByText('매칭상대01', { exact: true })).toBeVisible();
}

test.describe('20. 매칭 채팅방 복귀 경로', () => {
  test.beforeEach(async ({ api }) => {
    api.on('GET', '/api/v2/chat/rooms/:roomId', (request) => ({ body: {
      chat_room_id: Number(request.params.roomId),
      status: 'ACTIVE',
      opponent: { user_id: 201, chat_name: '매칭상대01', profile_image_url: null, is_online: false },
      chats: [],
      size: 0,
      chat_cursor_time: null,
      chat_cursor_id: null,
      has_next: false,
    } }));
  });

  test('MATCH-CHAT-01 선택한 상대의 완료 화면으로 돌아오며 다른 후보 선택을 다시 열지 않는다', { tag: '@P0' }, async ({ page, api }) => {
    await openCandidates(page, api);
    await page.getByRole('button', { name: '매칭상대01님과 채팅 시작하기' }).click();
    await expect(page).toHaveURL(`/chat/${roomId}`);
    await page.getByRole('button', { name: '뒤로', exact: true }).click();

    await expect(page).toHaveURL(`/matching/result?matchConnectionId=${connectionId}`);
    await expect(page.getByText(selectedBody)).toBeVisible();
    await expect(page.getByRole('button', { name: '채팅 시작하기', exact: true })).toBeInViewport();
    await expect(page.locator('.matching-candidate-card')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '매칭 다시하기' })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('audigo.matching_candidates_result'))).toBeNull();

    await page.getByRole('button', { name: '채팅 시작하기', exact: true }).click();
    await expect(page).toHaveURL(`/chat/${roomId}`);
    expect(api.callsTo('POST', '/api/v2/matches/responses')).toHaveLength(1);
    expect(api.callsTo('POST', `/api/v2/match-connections/${connectionId}/chat-room`)).toHaveLength(2);
    await page.getByRole('button', { name: '뒤로', exact: true }).click();
    await page.getByRole('button', { name: '뒤로', exact: true }).click();
    await expect(page).toHaveURL('/home');
  });

  test('MATCH-CHAT-02 브라우저 뒤로가기도 종료된 후보 목록 대신 선택 완료 화면을 연다', async ({ page, api }) => {
    await openCandidates(page, api);
    await page.getByRole('button', { name: '매칭상대01님과 채팅 시작하기' }).click();
    await expect(page).toHaveURL(`/chat/${roomId}`);
    await page.goBack();

    await expect(page).toHaveURL(`/matching/result?matchConnectionId=${connectionId}`);
    await expect(page.getByText(selectedBody)).toBeVisible();
    await expect(page.locator('.matching-candidate-card')).toHaveCount(0);
    expect(api.callsTo('POST', '/api/v2/matches/responses')).toHaveLength(1);
  });

  test('MATCH-CHAT-03 선택 후 채팅방 준비 실패 시 후보를 재선택하지 않고 같은 연결로 재시도한다', { tag: '@P0' }, async ({ page, api }) => {
    api.once('POST', `/api/v2/match-connections/${connectionId}/chat-room`, {
      status: 500, body: { message: 'internal_server_error' },
    });
    await openCandidates(page, api);
    await page.getByRole('button', { name: '매칭상대01님과 채팅 시작하기' }).click();

    await expect(page).toHaveURL(`/matching/result?matchConnectionId=${connectionId}`);
    await expect(page.locator('.toast')).toHaveText('채팅방을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.');
    await page.getByRole('button', { name: '채팅 시작하기', exact: true }).click();
    await expect(page).toHaveURL(`/chat/${roomId}`);
    expect(api.callsTo('POST', '/api/v2/matches/responses')).toHaveLength(1);
  });

  test('MATCH-CHAT-04 알림에서 시작한 채팅은 매칭 상세와 알림, 홈으로 순서대로 복귀한다', { tag: '@P0' }, async ({ page, api }) => {
    const body = '알림상대님과 매칭이 완료되었습니다.';
    api.notifications = [notification({
      notification_id: 124,
      type: 'MATCH_SUCCESS',
      title: '매칭 성공',
      body,
      target_type: 'MATCH_CONNECTION',
      target_id: 700,
      travel_plan_id: undefined,
    })];
    await page.goto('/notifications');
    await page.locator('.noti-row').click();
    await page.getByRole('button', { name: '채팅 시작하기' }).click();
    await expect(page).toHaveURL('/chat/1700');
    await page.getByRole('button', { name: '뒤로', exact: true }).click();

    await expect(page).toHaveURL('/matching/result?matchConnectionId=700');
    await expect(page.getByText(body)).toBeVisible();
    await page.getByRole('button', { name: '뒤로', exact: true }).click();
    await expect(page).toHaveURL('/notifications');
    await page.getByRole('button', { name: '뒤로', exact: true }).click();
    await expect(page).toHaveURL('/home');
  });

  test('MATCH-CHAT-05 채팅 목록에서 진입한 경우 매칭 결과가 아닌 목록으로 복귀한다', async ({ page, api }) => {
    api.on('GET', '/api/v2/chat/rooms', { body: {
      rooms: [{
        room_id: roomId, chat_name: '매칭상대01', status: 'ACTIVE', is_online: false,
        last_message: '안녕하세요', last_message_at: '2026-10-01T09:00:00+09:00',
        profile_image_url: null, unread_count: 0,
      }],
      size: 1, cursor_time: null, cursor_id: null, has_next: false,
    } });
    await page.goto('/chat');
    await page.getByRole('button', { name: '매칭상대01 채팅방 열기' }).click();
    await expect(page).toHaveURL(`/chat/${roomId}`);
    await page.getByRole('button', { name: '뒤로', exact: true }).click();
    await expect(page).toHaveURL('/chat');
  });

  test('MATCH-CHAT-06 직접 진입하여 복귀 정보가 없으면 채팅 목록으로 이동한다', async ({ page }) => {
    await page.goto(`/chat/${roomId}`);
    await page.reload();
    await page.getByRole('button', { name: '뒤로', exact: true }).click();
    await expect(page).toHaveURL('/chat');
  });

  test('MATCH-CHAT-07 새로고침 후 복귀 정보가 남아 있으면 같은 매칭 완료 화면으로 돌아온다', async ({ page, api }) => {
    await openCandidates(page, api);
    await page.getByRole('button', { name: '매칭상대01님과 채팅 시작하기' }).click();
    await expect(page).toHaveURL(`/chat/${roomId}`);
    await page.reload();
    await page.getByRole('button', { name: '뒤로', exact: true }).click();
    await expect(page).toHaveURL(`/matching/result?matchConnectionId=${connectionId}`);
    await expect(page.getByText(selectedBody)).toBeVisible();
  });

  for (const invalidReturn of [
    { matchConnectionId: -1, origin: 'matching' },
    { matchConnectionId: '1201', origin: 'matching' },
    { matchConnectionId: connectionId, origin: 'https://example.com' },
  ]) {
    test(`MATCH-CHAT-08 잘못된 복귀 정보는 무시한다: ${JSON.stringify(invalidReturn)}`, async ({ page }) => {
      await page.goto(`/chat/${roomId}`);
      await page.evaluate((matchingReturn) => {
        history.replaceState({ ...history.state, usr: { matchingReturn } }, '');
      }, invalidReturn);
      await page.reload();
      await page.getByRole('button', { name: '뒤로', exact: true }).click();
      await expect(page).toHaveURL('/chat');
    });
  }
});
