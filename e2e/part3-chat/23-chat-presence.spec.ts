import { test, expect } from '../support/fixtures';

test.describe('23. 서비스 이용 중 채팅 온라인 상태 유지', () => {
  test('채팅 탭에서 다른 탭으로 이동해도 WebSocket 연결을 유지한다', async ({ page }) => {
    let openConnections = 0;
    let openedConnections = 0;

    await page.routeWebSocket('ws://api.e2e.test/ws/chat', (socket) => {
      openedConnections += 1;
      openConnections += 1;
      socket.onClose(() => {
        openConnections -= 1;
      });
      socket.onMessage((frame) => {
        if (typeof frame === 'string' && frame.startsWith('CONNECT\n')) {
          socket.send('CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\u0000');
        }
      });
    });

    await page.goto('/chat');
    await expect.poll(() => openConnections).toBe(1);

    await page.getByRole('link', { name: '홈' }).click();
    await expect(page).toHaveURL(/\/home$/);
    await page.getByRole('link', { name: '매칭' }).click();
    await expect(page).toHaveURL(/\/matching$/);
    await page.getByRole('link', { name: '마이' }).click();
    await expect(page).toHaveURL(/\/my$/);
    await page.getByRole('button', { name: /이용약관 및 개인정보/ }).click();
    await expect(page).toHaveURL(/\/policies$/);

    await expect.poll(() => openConnections).toBe(1);
    expect(openedConnections).toBe(1);
  });
});
