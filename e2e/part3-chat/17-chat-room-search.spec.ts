import { test, expect } from '../support/fixtures';

const EMPTY_CHAT_ROOM_PAGE = {
  rooms: [],
  size: 0,
  cursor_time: null,
  cursor_id: null,
  has_next: false,
};

test.describe('채팅방 목록 검색', () => {
  test('검색어가 한 글자면 안내하고 검색 요청을 보내지 않는다', async ({ page, api }) => {
    api.on('GET', '/api/v2/chat/rooms', { body: EMPTY_CHAT_ROOM_PAGE });
    await page.goto('/chat');

    await page.getByRole('searchbox', { name: '상대 닉네임으로 채팅방 검색' }).fill('민');
    await page.getByRole('button', { name: '검색' }).click();

    await expect(page.locator('#chat-room-search-error')).toHaveText('검색어는 2자 이상 입력해 주세요.');
    expect(api.callsTo('GET', '/api/v2/chat/rooms').filter((call) => call.query.get('chat_name') === '민')).toHaveLength(0);
  });

  test('검색어가 두 글자면 채팅방 검색 API를 호출한다', async ({ page, api }) => {
    api.on('GET', '/api/v2/chat/rooms', { body: EMPTY_CHAT_ROOM_PAGE });
    await page.goto('/chat');

    await page.getByRole('searchbox', { name: '상대 닉네임으로 채팅방 검색' }).fill('민지');
    await page.getByRole('button', { name: '검색' }).click();

    await expect.poll(() =>
      api.callsTo('GET', '/api/v2/chat/rooms').filter((call) => call.query.get('chat_name') === '민지').length,
    ).toBe(1);
  });
});
