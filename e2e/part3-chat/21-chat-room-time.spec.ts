import { test, expect } from '../support/fixtures';

function room(roomId: number, time: string) {
  return {
    room_id: roomId, chat_name: `상대${roomId}`, status: 'ACTIVE', is_online: false,
    last_message: '마지막 메시지', last_message_at: time, profile_image_url: null, unread_count: 0,
  };
}

function roomPage(times: string[]) {
  return {
    rooms: times.map((time, index) => room(index + 1, time)), size: times.length,
    cursor_time: null, cursor_id: null, has_next: false,
  };
}

for (const timezoneId of ['Asia/Seoul', 'UTC', 'America/Los_Angeles']) {
  test.describe(`채팅 목록 한국 시간 표시 (${timezoneId})`, () => {
    test.use({ timezoneId, now: '2026-11-03T15:30:00+09:00' });

    test('시간대 없는 UTC·Z·명시적 오프셋을 동일한 한국 시간으로 표시한다', async ({ page, api }) => {
      api.on('GET', '/api/v2/chat/rooms', { body: roomPage([
        '2026-11-03T06:00:00.123456',
        '2026-11-03T06:00:00Z',
        '2026-11-03T15:00:00+09:00',
        '2026-11-03T01:00:00-05:00',
      ]) });
      await page.goto('/chat');
      await expect(page.locator('.chat-room-time')).toHaveText(Array(4).fill('오후 3:00'));
    });

    test('자정과 연도 경계의 오늘·날짜 판정도 한국 시간을 사용한다', async ({ page, api }) => {
      await page.clock.setFixedTime(new Date('2026-01-01T00:10:00+09:00'));
      api.on('GET', '/api/v2/chat/rooms', { body: roomPage([
        '2025-12-31T15:05:00',
        '2025-12-31T14:59:00Z',
        '2026-01-01T15:00:00',
      ]) });
      await page.goto('/chat');
      await expect(page.locator('.chat-room-time')).toHaveText(['오전 12:05', '2025. 12. 31.', '1월 2일']);
    });
  });
}

test.describe('채팅 목록 시간 회귀 검증', () => {
  test.use({ now: '2026-11-03T15:30:00+09:00' });

  test('같은 메시지의 목록 시간과 채팅방 내부 시간이 일치한다', async ({ page, api }) => {
    api.on('GET', '/api/v2/chat/rooms', { body: roomPage(['2026-11-03T06:00:00']) });
    api.on('GET', '/api/v2/chat/rooms/:roomId', { body: {
      chat_room_id: 1, status: 'ACTIVE',
      opponent: { user_id: 2, chat_name: '상대1', profile_image_url: null, is_online: false },
      chats: [{ chat_id: 1, sender_id: 2, content: '마지막 메시지', sent_at: '2026-11-03T06:00:00Z', is_read: true }],
      size: 1, chat_cursor_time: null, chat_cursor_id: null, has_next: false,
    } });
    await page.goto('/chat');
    await expect(page.locator('.chat-room-time')).toHaveText('오후 3:00');
    await page.getByRole('button', { name: '상대1 채팅방 열기' }).click();
    await expect(page.locator('.chat-message-meta time')).toHaveText('오후 3:00');
  });

  test('시간 표시를 변환해도 추가 로딩 커서와 목록 순서는 원본을 유지한다', async ({ page, api }) => {
    const cursor = '2026-11-03T05:00:00.123456';
    api.on('GET', '/api/v2/chat/rooms', (request) => ({ body: request.query.has('cursor_time') ? {
      ...roomPage([]), rooms: [room(3, '2026-11-03T04:00:00')], size: 1,
    } : {
      rooms: [room(1, '2026-11-03T06:00:00'), room(2, cursor)], size: 2,
      cursor_time: cursor, cursor_id: 2, has_next: true,
    } }));
    await page.goto('/chat');
    await expect(page.locator('.chat-room-row')).toHaveCount(3);
    await expect(page.locator('.chat-room-name')).toHaveText(['상대1', '상대2', '상대3']);
    await expect(page.locator('.chat-room-time')).toHaveText(['오후 3:00', '오후 2:00', '오후 1:00']);
    const next = api.callsTo('GET', '/api/v2/chat/rooms').find((call) => call.query.has('cursor_time'));
    expect(next?.query.get('cursor_time')).toBe(cursor);
    expect(next?.query.get('cursor_id')).toBe('2');
    await expect(page.locator('.chat-room-time').nth(1)).toHaveAttribute('datetime', cursor);
  });

  test('해석할 수 없는 시간은 잘못된 시각 대신 빈 값으로 표시한다', async ({ page, api }) => {
    api.on('GET', '/api/v2/chat/rooms', { body: roomPage(['not-a-date', '']) });
    await page.goto('/chat');
    await expect(page.locator('.chat-room-time')).toHaveText(['', '']);
  });
});
