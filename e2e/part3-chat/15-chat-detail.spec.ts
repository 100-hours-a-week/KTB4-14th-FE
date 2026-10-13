import { test, expect } from '../support/fixtures';

const roomId = 54;
const olderCursorTime = '2026-10-01T08:30:00+09:00';
const initialOldestTime = '2026-10-01T08:59:00+09:00';
const initialSingleMessageTime = '2026-10-01T09:00:00+09:00';

test.describe('15. 채팅방 상세 조회', () => {
  test('CHAT-01 목록에서 대화방을 열고 상대방의 읽음 상태와 최신 메시지를 표시', { tag: '@P0' }, async ({ page, api }) => {
    api.on('GET', '/api/v2/chat/rooms', {
      body: {
        rooms: [{
          room_id: roomId,
          chat_name: '지민',
          status: 'ACTIVE',
          is_online: true,
          last_message: '반가워요',
          last_message_at: '2026-10-01T09:00:00+09:00',
          profile_image_url: null,
          unread_count: 0,
        }],
        size: 1,
        cursor_time: null,
        cursor_id: null,
        has_next: false,
      },
    });
    api.on('GET', '/api/v2/chat/rooms/:roomId', {
      body: {
        chat_room_id: roomId,
        status: 'ACTIVE',
        opponent: {
          user_id: 2,
          chat_name: '지민',
          profile_image_url: null,
          is_online: true,
        },
        chats: [{
          chat_id: 102,
          sender_id: 2,
          content: '안녕하세요',
          sent_at: '2026-10-01T08:59:00+09:00',
          is_read: true,
        }, {
          chat_id: 103,
          sender_id: api.user.user_id,
          content: '반가워요',
          sent_at: '2026-10-01T09:00:00+09:00',
          is_read: false,
        }],
        size: 2,
        chat_cursor_time: initialOldestTime,
        chat_cursor_id: 102,
        has_next: true,
      },
    });

    await page.goto('/chat');
    await page.getByRole('button', { name: '지민 채팅방 열기' }).click();

    await expect(page).toHaveURL(`/chat/${roomId}`);
    await expect(page.getByRole('heading', { name: '지민' })).toBeVisible();
    await expect(page.getByText('온라인')).toBeVisible();
    await expect(page.locator('.chat-message-bubble')).toHaveText(['안녕하세요', '반가워요']);
    await expect(page.getByText('안 읽음')).toBeVisible();

    const initialDetailCall = api.callsTo('GET', `/api/v2/chat/rooms/${roomId}`)[0];
    expect(initialDetailCall.query.get('size')).toBe('20');
    expect(initialDetailCall.query.has('chat_cursor_time')).toBe(false);
  });

  test('CHAT-02 이전 대화를 compound cursor로 가져와 앞에 붙이고 읽음 표시를 반영', { tag: '@P0' }, async ({ page, api }) => {
    api.on('GET', '/api/v2/chat/rooms', {
      body: {
        rooms: [{
          room_id: roomId,
          chat_name: '지민',
          status: 'ACTIVE',
          is_online: false,
          last_message: '반가워요',
          last_message_at: '2026-10-01T09:00:00+09:00',
          profile_image_url: null,
          unread_count: 0,
        }],
        size: 1,
        cursor_time: null,
        cursor_id: null,
        has_next: false,
      },
    });
    api.on('GET', '/api/v2/chat/rooms/:roomId', (request) => ({
      body: request.query.has('chat_cursor_time') ? {
        chat_room_id: roomId,
        status: 'ACTIVE',
        opponent: { user_id: 2, chat_name: '지민', profile_image_url: null, is_online: false },
        chats: [{
          chat_id: 101,
          sender_id: api.user.user_id,
          content: '읽은 메시지예요',
          sent_at: olderCursorTime,
          is_read: true,
        }],
        size: 1,
        chat_cursor_time: null,
        chat_cursor_id: null,
        has_next: false,
      } : {
        chat_room_id: roomId,
        status: 'ACTIVE',
        opponent: { user_id: 2, chat_name: '지민', profile_image_url: null, is_online: false },
        chats: [{
          chat_id: 103,
          sender_id: api.user.user_id,
          content: '반가워요',
          sent_at: '2026-10-01T09:00:00+09:00',
          is_read: false,
        }],
        size: 1,
        chat_cursor_time: initialSingleMessageTime,
        chat_cursor_id: 103,
        has_next: true,
      },
    }));

    await page.goto(`/chat/${roomId}`);
    await page.getByRole('button', { name: '이전 대화 불러오기' }).click();

    await expect(page.locator('.chat-message-bubble')).toHaveText(['읽은 메시지예요', '반가워요']);
    await expect(page.getByText('읽음', { exact: true })).toBeVisible();
    await expect(page.getByText('안 읽음', { exact: true })).toBeVisible();

    const detailCalls = api.callsTo('GET', `/api/v2/chat/rooms/${roomId}`);
    expect(detailCalls.length).toBeGreaterThanOrEqual(2);
    const olderPageCall = detailCalls.at(-1);
    expect(olderPageCall?.query.get('size')).toBe('20');
    expect(olderPageCall?.query.get('chat_cursor_time')).toBe(initialSingleMessageTime);
    expect(olderPageCall?.query.get('chat_cursor_id')).toBe('103');
    expect(detailCalls.every((call) => call.method === 'GET')).toBe(true);
  });
});
