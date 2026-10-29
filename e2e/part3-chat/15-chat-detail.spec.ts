import { test, expect } from '../support/fixtures';

const roomId = 54;
const limitRoomId = 55;
const olderCursorTime = '2026-10-01T08:30:00+09:00';
const initialOldestTime = '2026-10-01T08:59:00+09:00';

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
    const initialMessages = Array.from({ length: 20 }, (_, index) => ({
      chat_id: 103 + index,
      sender_id: api.user.user_id,
      content: `최근 메시지 ${index + 1} ${'대화 내용 '.repeat(8)}`,
      sent_at: index === 0
        ? initialOldestTime
        : new Date(Date.parse(initialOldestTime) + index * 60_000).toISOString(),
      is_read: index !== 0,
    }));

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
        chats: initialMessages,
        size: initialMessages.length,
        chat_cursor_time: initialOldestTime,
        chat_cursor_id: 103,
        has_next: true,
      },
      delayMs: request.query.has('chat_cursor_time') ? 200 : undefined,
    }));

    await page.goto(`/chat/${roomId}`);
    const scrollContainer = page.locator('.chat-detail-scroll');
    const anchorMessage = page.getByText(initialMessages[0].content, { exact: true });
    const getAnchorOffset = () => anchorMessage.evaluate((message) => {
      const container = message.closest('.chat-detail-scroll');
      return message.getBoundingClientRect().top - (container?.getBoundingClientRect().top ?? 0);
    });
    await scrollContainer.evaluate((container) => { container.scrollTop = 0; });
    await expect(page.getByRole('status').filter({ hasText: '이전 메시지를 불러오는 중입니다.' })).toBeVisible();
    const anchorOffsetBeforeLoad = await getAnchorOffset();

    await expect(page.locator('.chat-message-bubble')).toHaveCount(21);
    await expect(page.locator('.chat-message-bubble').first()).toHaveText('읽은 메시지예요');
    await expect(page.locator('#chat-message-101').getByText('읽음', { exact: true })).toBeVisible();
    await expect(page.getByText('안 읽음', { exact: true })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: '이전 메시지를 불러오는 중입니다.' })).toHaveCount(0);

    const anchorOffsetAfterLoad = await getAnchorOffset();
    expect(Math.abs(anchorOffsetAfterLoad - anchorOffsetBeforeLoad)).toBeLessThan(3);

    const detailCalls = api.callsTo('GET', `/api/v2/chat/rooms/${roomId}`);
    expect(detailCalls.length).toBeGreaterThanOrEqual(2);
    const olderPageCall = detailCalls.at(-1);
    expect(olderPageCall?.query.get('size')).toBe('20');
    expect(olderPageCall?.query.get('chat_cursor_time')).toBe(initialOldestTime);
    expect(olderPageCall?.query.get('chat_cursor_id')).toBe('103');
    expect(detailCalls.every((call) => call.method === 'GET')).toBe(true);
  });

  test('CHAT-03 채팅 입력은 공백 포함 500자까지만 허용하고 초과 붙여넣기를 자른다', { tag: '@P1' }, async ({ page, api }) => {
    api.on('GET', '/api/v2/chat/rooms/:roomId', {
      body: {
        chat_room_id: limitRoomId,
        status: 'ACTIVE',
        opponent: {
          user_id: 2,
          chat_name: '지민',
          profile_image_url: null,
          is_online: false,
        },
        chats: [],
        size: 0,
        chat_cursor_time: null,
        chat_cursor_id: null,
        has_next: false,
      },
    });
    api.on('GET', '/api/v2/chat/rooms/:roomId/messages', {
      body: { messages: [], size: 0, next_after_message_seq: 0, has_next: false },
    });

    await page.goto(`/chat/${limitRoomId}`);

    const composer = page.getByRole('textbox', { name: '메시지 입력' });
    await expect(composer).toBeVisible();

    const atLimit = `${' '.repeat(499)}가`;
    await composer.fill(atLimit);
    await expect(composer).toHaveValue(atLimit);
    await expect(page.getByText('유니코드 문자 기준 (공백 포함) 500/500')).toBeVisible();

    await composer.press('End');
    await page.keyboard.insertText('나');
    await expect(composer).toHaveValue(atLimit);

    await composer.fill('');
    await page.keyboard.insertText('나'.repeat(510));
    await expect(composer).toHaveValue('나'.repeat(500));
    await expect(page.getByText('유니코드 문자 기준 (공백 포함) 500/500')).toBeVisible();
  });

  test('CHAT-04 엔터로 전송한 뒤 입력창 포커스를 유지해 다음 메시지를 바로 입력한다', { tag: '@P1' }, async ({ page, api }) => {
    const focusRoomId = 56;
    const sentMessages: string[] = [];

    api.on('GET', '/api/v2/chat/rooms/:roomId', {
      body: {
        chat_room_id: focusRoomId,
        status: 'ACTIVE',
        opponent: {
          user_id: 2,
          chat_name: '지민',
          profile_image_url: null,
          is_online: false,
        },
        chats: [],
        size: 0,
        chat_cursor_time: null,
        chat_cursor_id: null,
        has_next: false,
      },
    });
    api.on('GET', '/api/v2/chat/rooms/:roomId/messages', {
      body: { messages: [], size: 0, next_after_message_seq: 0, has_next: false },
    });
    api.on('POST', `/api/v2/chat/rooms/${focusRoomId}/messages`, (request) => {
      const content = String(request.body?.content ?? '');
      sentMessages.push(content);
      return {
        status: 201,
        body: {
          message_id: 800 + sentMessages.length,
          room_id: focusRoomId,
          sender_id: api.user.user_id,
          client_message_id: request.body?.client_message_id,
          message_seq: sentMessages.length,
          content,
          sent_at: '2026-10-01T09:00:00+09:00',
        },
      };
    });

    await page.goto(`/chat/${focusRoomId}`);

    const composer = page.getByRole('textbox', { name: '메시지 입력' });
    await expect(composer).toBeVisible();
    await composer.fill('첫 번째 메시지');
    await composer.press('Enter');

    await expect(page.locator('.chat-message-bubble')).toHaveText(['첫 번째 메시지']);
    await expect(composer).toBeFocused();

    await page.keyboard.type('두 번째 메시지');
    await expect(composer).toHaveValue('두 번째 메시지');
    await composer.press('Enter');

    await expect(page.locator('.chat-message-bubble')).toHaveText(['첫 번째 메시지', '두 번째 메시지']);
    await expect(composer).toBeFocused();
    expect(sentMessages).toEqual(['첫 번째 메시지', '두 번째 메시지']);
  });
});
