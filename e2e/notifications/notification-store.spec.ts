import { test, expect } from '@playwright/test';
import { NotificationStore, type NotificationApi } from '../../src/notifications/NotificationStore';
import type { AppNotification } from '../../src/types';
import type { NotificationStreamHandlers } from '../../src/api/notification-stream';

function notification(id: number, isRead = false): AppNotification {
  return { notification_id: id, type: 'NEW_MESSAGE', title: '새 채팅', body: `알림 ${id}`,
    target_type: 'CHAT_ROOM', target_id: 2, is_read: isRead, created_at: '2026-11-03T09:00:00Z' };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function fixture() {
  let server: AppNotification[] = [];
  let handlers!: NotificationStreamHandlers;
  const toasts: string[] = [];
  let queries = 0;
  let closed = 0;
  const api: NotificationApi = {
    list: async () => { queries += 1; return server.map((item) => ({ ...item })); },
    unreadCount: async () => ({ count: server.filter((item) => !item.is_read).length }),
    markRead: async (id) => { server = server.map((item) => item.notification_id === id ? { ...item, is_read: true } : item); },
    markAllRead: async () => { server = server.map((item) => ({ ...item, is_read: true })); },
    subscribe: (next) => { handlers = next; return { close: () => { closed += 1; }, reconnect: () => {} }; },
  };
  const store = new NotificationStore(api);
  let stop = store.start((message) => toasts.push(message), () => {});
  return {
    api, store, toasts,
    get handlers() { return handlers; }, get queries() { return queries; }, get closed() { return closed; },
    set server(items: AppNotification[]) { server = items; },
    stop: () => stop(), restart: () => { stop = store.start((message) => toasts.push(message), () => {}); },
  };
}

test('recovered notifications populate state silently and repeated live events toast once', async () => {
  const f = fixture();
  try {
    f.server = [notification(1)];
    f.handlers.onConnected();
    await f.store.synchronize();
    expect(f.store.getSnapshot().unread).toBe(1);
    expect(f.toasts).toEqual([]);
    f.handlers.onNotification(notification(1));
    f.handlers.onNotification(notification(2));
    f.handlers.onNotification(notification(2));
    expect(f.store.getSnapshot().items.map((item) => item.notification_id)).toEqual([2, 1]);
    expect(f.store.getSnapshot().unread).toBe(2);
    expect(f.toasts).toEqual(['알림 2']);
  } finally { f.stop(); }
});

test('a delayed snapshot cannot erase a live notification and schedules a fresh snapshot', async () => {
  const f = fixture();
  try {
    await f.store.synchronize();
    const delayed = deferred<AppNotification[]>();
    const list = f.api.list;
    let first = true;
    f.api.list = () => { if (first) { first = false; return delayed.promise; } return list(); };
    const pending = f.store.synchronize();
    await Promise.resolve();
    f.server = [notification(2)];
    f.handlers.onNotification(notification(2));
    delayed.resolve([]);
    await pending;
    expect(f.store.getSnapshot().items.map((item) => item.notification_id)).toEqual([2]);
    expect(f.store.getSnapshot().unread).toBe(1);
    expect(f.toasts).toEqual(['알림 2']);
  } finally { f.stop(); }
});

test('connection and resync bursts share one outstanding request and one follow-up', async () => {
  const f = fixture();
  try {
    const gate = deferred<AppNotification[]>();
    let calls = 0;
    f.api.list = async () => ++calls === 1 ? gate.promise : [];
    f.handlers.onConnected();
    f.handlers.onResyncRequired();
    const pending = f.store.synchronize();
    await Promise.resolve();
    for (let i = 0; i < 10; i++) f.handlers.onResyncRequired();
    expect(calls).toBe(1);
    gate.resolve([]);
    await pending;
    expect(calls).toBe(2);
  } finally { f.stop(); }
});

test('read state survives duplicate creation events', async () => {
  const f = fixture();
  try {
    f.server = [notification(1)];
    await f.store.synchronize();
    expect(await f.store.markRead(1)).toBe(true);
    f.handlers.onNotification(notification(1));
    expect(f.store.getSnapshot().unread).toBe(0);
    expect(f.store.getSnapshot().items[0].is_read).toBe(true);
    expect(f.toasts).toEqual([]);
  } finally { f.stop(); }
});

test('a new notification during mark-all-read remains unread if the server did not mark it', async () => {
  const f = fixture();
  try {
    f.server = [notification(1)];
    await f.store.synchronize();
    const gate = deferred<void>();
    f.api.markAllRead = () => { f.server = [notification(1, true)]; return gate.promise; };
    const pending = f.store.markAllRead();
    f.server = [notification(2), notification(1, true)];
    f.handlers.onNotification(notification(2));
    gate.resolve();
    await pending;
    expect(f.store.getSnapshot().unread).toBe(1);
    expect(f.store.getSnapshot().items[0]).toMatchObject({ notification_id: 2, is_read: false });
  } finally { f.stop(); }
});

test('stopping aborts requests and ignores late callbacks and snapshots from the previous session', async () => {
  const f = fixture();
  const gate = deferred<AppNotification[]>();
  let signal: AbortSignal | undefined;
  f.api.list = (next) => { signal = next; return gate.promise; };
  const oldHandlers = f.handlers;
  const pending = f.store.synchronize();
  await Promise.resolve();
  f.stop();
  expect(signal?.aborted).toBe(true);
  expect(f.closed).toBe(1);
  oldHandlers.onNotification(notification(99));
  gate.resolve([notification(99)]);
  await pending;
  expect(f.store.getSnapshot()).toEqual({ items: [], unread: 0 });
  expect(f.toasts).toEqual([]);
  f.api.list = async () => [];
  f.restart();
  try {
    await f.store.synchronize();
    oldHandlers.onNotification(notification(99));
    f.handlers.onNotification(notification(99));
    expect(f.toasts).toEqual(['알림 99']);
    expect(f.store.getSnapshot().items).toHaveLength(1);
  } finally { f.stop(); }
});

test('inconsistent list/count results do not overwrite existing state', async () => {
  const f = fixture();
  try {
    f.server = [notification(1)];
    await f.store.synchronize();
    f.api.unreadCount = async () => ({ count: 9 });
    await f.store.synchronize();
    expect(f.store.getSnapshot().unread).toBe(1);
    f.api.unreadCount = async () => ({ count: 2 });
    f.server = [notification(2), notification(1)];
    await f.store.synchronize();
    expect(f.store.getSnapshot().unread).toBe(2);
    expect(f.toasts).toEqual([]);
  } finally { f.stop(); }
});

test('network failure preserves state and failed read mutations do not optimistically clear it', async () => {
  const f = fixture();
  try {
    f.server = [notification(1)];
    await f.store.synchronize();
    f.api.list = async () => { throw new Error('offline'); };
    await f.store.synchronize();
    f.api.markRead = async () => { throw new Error('read failed'); };
    await expect(f.store.markRead(1)).rejects.toThrow('read failed');
    expect(f.store.getSnapshot().unread).toBe(1);
  } finally { f.stop(); }
});
