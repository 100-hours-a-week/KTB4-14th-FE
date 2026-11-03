import { test, expect } from '../support/fixtures';
import { notification, user } from '../support/data';
import type { Page } from '@playwright/test';

type StreamTest = {
  emit: (name: string, data?: unknown) => void;
  fail: () => void;
  late: (data: unknown) => void;
  opened: () => number;
  closed: () => boolean;
};
declare global { interface Window { notificationStreamTest: StreamTest } }

async function installStream(page: Page) {
  await page.addInitScript(() => {
    const streams: TestEventSource[] = [];
    class TestEventSource extends EventTarget {
      static OPEN = 1;
      static CLOSED = 2;
      static CONNECTING = 0;
      readyState = 0;
      constructor(readonly url: string, readonly options?: EventSourceInit) {
        super();
        streams.push(this);
        queueMicrotask(() => {
          if (this.readyState === 2) return;
          this.readyState = 1;
          this.dispatchEvent(new Event('open'));
          this.dispatchEvent(new MessageEvent('connected', { data: '{"connected":true}' }));
          this.dispatchEvent(new MessageEvent('resync_required', { data: '{"reason":"sse_connected"}' }));
        });
      }
      close() { this.readyState = 2; }
    }
    Object.defineProperty(window, 'EventSource', { value: TestEventSource, configurable: true });
    window.notificationStreamTest = {
      emit(name, data) { streams.at(-1)?.dispatchEvent(new MessageEvent(name, { data: JSON.stringify(data) })); },
      fail() { streams.at(-1)?.dispatchEvent(new Event('error')); },
      late(data) { streams.filter((stream) => stream.readyState === 2).forEach((stream) =>
        stream.dispatchEvent(new MessageEvent('notification', { data: JSON.stringify(data) }))); },
      opened: () => streams.length,
      closed: () => streams.every((stream) => stream.readyState === 2),
    };
  });
}

async function emit(page: Page, name: string, data?: unknown) {
  await page.evaluate(({ name, data }) => window.notificationStreamTest.emit(name, data), { name, data });
}

test.beforeEach(async ({ page }) => { await installStream(page); });

test('live notifications update an open list, duplicate delivery and replay after read do not change counts', async ({ page, api }) => {
  api.notifications = [notification({ notification_id: 1, title: '기존 알림' })];
  await page.goto('/notifications');
  await expect(page.locator('.noti-row')).toHaveCount(1);
  const live = api.pushNotification({ notification_id: 2, title: '실시간 알림', body: '새 채팅 도착' });
  await emit(page, 'notification', live);
  await emit(page, 'notification', live);
  await expect(page.locator('.noti-row')).toHaveCount(2);
  await expect(page.locator('.jn-count')).toHaveText('새 알림 2개');
  await expect(page.locator('.toast')).toHaveText('새 채팅 도착');
  await page.getByRole('button', { name: '모두 읽음' }).click();
  await expect(page.locator('.noti-row.unread')).toHaveCount(0);
  await emit(page, 'notification', live);
  await expect(page.locator('.noti-row.unread')).toHaveCount(0);
});

test('Redis resync recovers stored notifications silently and suppresses later replay', async ({ page, api }) => {
  api.notifications = [notification({ notification_id: 1 })];
  await page.goto('/notifications');
  await expect(page.locator('.noti-row')).toHaveCount(1);
  const missed = api.pushNotification({ notification_id: 2, title: '연결 중단 중 알림', body: '복구 알림' });
  await emit(page, 'resync_required', { reason: 'redis_subscription_ready' });
  await expect(page.locator('.noti-row')).toHaveCount(2);
  await expect(page.locator('.jn-count')).toHaveText('새 알림 2개');
  await emit(page, 'notification', missed);
  await expect(page.locator('.toast')).toHaveCount(0);
});

test('malformed stream payloads are ignored and content-only payloads remain usable', async ({ page, api }) => {
  api.notifications = [notification({ notification_id: 1 })];
  await page.goto('/notifications');
  await expect(page.locator('.noti-row')).toHaveCount(1);
  await emit(page, 'notification', { notification_id: 2, type: 'NEW_MESSAGE' });
  await emit(page, 'notification', notification({ notification_id: -1 }));
  await expect(page.locator('.noti-row')).toHaveCount(1);
  await expect(page.locator('.toast')).toHaveCount(0);
  const fallback = { ...notification({ notification_id: 3 }), body: null, content: '호환 알림 본문' };
  await emit(page, 'notification', fallback);
  await expect(page.locator('.noti-row')).toHaveCount(2);
  await expect(page.locator('.toast')).toHaveText('호환 알림 본문');
});

test('reconnection synchronizes missed notifications while retaining the login', async ({ page, api }) => {
  api.notifications = [notification({ notification_id: 1 })];
  await page.goto('/notifications');
  await expect(page.locator('.noti-row')).toHaveCount(1);
  api.pushNotification({ notification_id: 2, title: '재연결 복구' });
  const before = await page.evaluate(() => window.notificationStreamTest.opened());
  await page.evaluate(() => window.notificationStreamTest.fail());
  await expect.poll(() => page.evaluate(() => window.notificationStreamTest.opened())).toBeGreaterThan(before);
  await expect(page.locator('.noti-row')).toHaveCount(2);
  await expect(page.locator('.toast')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('audigo.user'))).not.toBeNull();
});

test('returning to the visible app refreshes server read state and the list', async ({ page, api }) => {
  api.notifications = [notification({ notification_id: 1 })];
  await page.goto('/notifications');
  await expect(page.locator('.noti-row.unread')).toHaveCount(1);
  api.notifications = [notification({ notification_id: 2 }), notification({ notification_id: 1, is_read: true })];
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
  await expect(page.locator('.noti-row')).toHaveCount(2);
  await expect(page.locator('.noti-row.unread')).toHaveCount(1);
  await expect(page.locator('.toast')).toHaveCount(0);
});

test('a delayed query cannot erase a notification arriving during synchronization', async ({ page, api }) => {
  const old = notification({ notification_id: 1 });
  api.notifications = [old];
  await page.goto('/notifications');
  await expect(page.locator('.noti-row')).toHaveCount(1);
  let release!: () => void;
  const gate = new Promise<void>((done) => { release = done; });
  const before = api.callsTo('GET', '/api/notifications').length;
  api.once('GET', '/api/notifications', async () => { await gate; return { body: [old] }; });
  await emit(page, 'resync_required', { reason: 'redis_subscription_ready' });
  await expect.poll(() => api.callsTo('GET', '/api/notifications').length).toBeGreaterThan(before);
  const live = api.pushNotification({ notification_id: 2, title: '조회 중 도착' });
  await emit(page, 'notification', live);
  release();
  await expect(page.locator('.noti-row')).toHaveCount(2);
  await expect.poll(() => api.callsTo('GET', '/api/notifications').length).toBeGreaterThanOrEqual(before + 2);
  await expect(page.locator('.jn-count')).toHaveText('새 알림 2개');
});

test('expired SSE authentication refreshes once and reconnects', async ({ page, api }) => {
  api.notifications = [notification({ notification_id: 1 })];
  await page.goto('/notifications');
  await expect(page.locator('.noti-row')).toHaveCount(1);
  api.once('GET', '/api/users/me', { status: 403, body: { message: 'unauthorized' } });
  const before = await page.evaluate(() => window.notificationStreamTest.opened());
  await page.evaluate(() => { window.notificationStreamTest.fail(); window.notificationStreamTest.fail(); });
  await expect.poll(() => api.callsTo('POST', '/users/refresh').length).toBe(1);
  await expect.poll(() => page.evaluate(() => window.notificationStreamTest.opened())).toBeGreaterThan(before);
  expect(await page.evaluate(() => localStorage.getItem('audigo.user'))).not.toBeNull();
});

test('an expired refresh token closes streams and returns to login', async ({ page, api }) => {
  api.notifications = [notification({ notification_id: 1 })];
  await page.goto('/notifications');
  await expect(page.locator('.noti-row')).toHaveCount(1);
  api.once('GET', '/api/users/me', { status: 403, body: { message: 'unauthorized' } });
  api.once('POST', '/users/refresh', { status: 401, body: { message: 'refresh_token_expired' } });
  await page.evaluate(() => window.notificationStreamTest.fail());
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('audigo.user'))).toBeNull();
  expect(await page.evaluate(() => window.notificationStreamTest.closed())).toBe(true);
});

test('network or refresh service outages retry without logging the user out', async ({ page, api }) => {
  api.notifications = [notification({ notification_id: 1 })];
  await page.goto('/notifications');
  await expect(page.locator('.noti-row')).toHaveCount(1);
  api.once('GET', '/api/users/me', { status: 403, body: { message: 'unauthorized' } });
  api.once('POST', '/users/refresh', { status: 503, body: { message: 'unavailable' } });
  const before = await page.evaluate(() => window.notificationStreamTest.opened());
  await page.evaluate(() => window.notificationStreamTest.fail());
  await expect.poll(() => api.callsTo('POST', '/users/refresh').length).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('audigo.user'))).not.toBeNull();
  await expect.poll(() => page.evaluate(() => window.notificationStreamTest.opened())).toBeGreaterThan(before);
  await expect(page).toHaveURL(/\/notifications$/);
});

test('account changes clear old state and ignore events from closed streams', async ({ page, api }) => {
  api.notifications = [notification({ notification_id: 1, title: '이전 계정 알림' })];
  await page.goto('/notifications');
  await expect(page.locator('.noti-row')).toHaveCount(1);
  api.notifications = [notification({ notification_id: 20, title: '새 계정 알림' })];
  const nextUser = user({ user_id: 2, nickname: '새 계정' });
  await page.evaluate((next) => {
    localStorage.setItem('audigo.user', JSON.stringify(next));
    window.dispatchEvent(new StorageEvent('storage', { key: 'audigo.user', newValue: JSON.stringify(next) }));
  }, nextUser);
  await expect(page.locator('.noti-row')).toHaveText(/새 계정 알림/);
  await page.evaluate((old) => window.notificationStreamTest.late(old), notification({ notification_id: 99, title: '이전 계정 지연 이벤트' }));
  await expect(page.locator('.noti-row')).toHaveCount(1);
  await expect(page.getByText('이전 계정 지연 이벤트')).toHaveCount(0);
  await expect(page.locator('.toast')).toHaveCount(0);
});

test('logout immediately closes streams and ignores late events', async ({ page, api }) => {
  api.notifications = [notification({ notification_id: 1 })];
  await page.goto('/my');
  await expect.poll(() => api.callsTo('GET', '/api/notifications').length).toBeGreaterThan(0);
  await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => window.notificationStreamTest.closed())).toBe(true);
  await page.evaluate((old) => window.notificationStreamTest.late(old), notification({ notification_id: 99 }));
  await expect(page.locator('.toast')).toHaveCount(0);
});
