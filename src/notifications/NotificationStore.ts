import type { AppNotification } from '../types';
import type { NotificationConnection, NotificationStreamHandlers } from '../api/notification-stream';

export type NotificationApi = {
  list: (signal?: AbortSignal) => Promise<AppNotification[]>;
  unreadCount: (signal?: AbortSignal) => Promise<{ count: number }>;
  markRead: (id: number, signal?: AbortSignal) => Promise<void>;
  markAllRead: (signal?: AbortSignal) => Promise<void>;
  subscribe: (handlers: NotificationStreamHandlers) => NotificationConnection | null;
};

type Snapshot = { items: AppNotification[]; unread: number };
const empty = (): Snapshot => ({ items: [], unread: 0 });

/** One account's state. A changed revision invalidates in-flight server snapshots. */
export class NotificationStore {
  private snapshot = empty();
  private readonly listeners = new Set<() => void>();
  private readonly seen = new Set<number>();
  private initialized = false;
  private active = false;
  private epoch = 0;
  private revision = 0;
  private controller = new AbortController();
  private connection: NotificationConnection | null = null;
  private flight: Promise<void> | null = null;
  private pending = false;
  private retry: ReturnType<typeof setTimeout> | undefined;
  private retryDelay = 1_000;

  constructor(private readonly api: NotificationApi) {}

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  start(onToast: (message: string) => void, onAuthenticationLost: () => void) {
    this.active = true;
    const epoch = ++this.epoch;
    this.controller = new AbortController();
    const current = () => this.active && epoch === this.epoch;
    this.connection = this.api.subscribe({
      onConnected: () => { if (current()) void this.synchronize(); },
      onResyncRequired: () => { if (current()) void this.synchronize(); },
      onAuthenticationLost: () => { if (current()) onAuthenticationLost(); },
      onNotification: (notification) => {
        if (!current() || this.seen.has(notification.notification_id)) return;
        this.seen.add(notification.notification_id);
        this.revision += 1;
        this.update([...this.snapshot.items, notification]);
        if (this.initialized && !notification.is_read) onToast(notification.body || notification.title);
        if (this.flight) this.pending = true;
      },
    });
    if (!this.connection) void this.synchronize();
    return () => { if (epoch === this.epoch) this.stop(); };
  }

  private stop() {
    this.active = false;
    this.epoch += 1;
    this.connection?.close();
    this.connection = null;
    this.controller.abort();
    clearTimeout(this.retry);
    this.retry = undefined;
    this.flight = null;
    this.pending = false;
    this.initialized = false;
    this.seen.clear();
    this.snapshot = empty();
    this.listeners.forEach((listener) => listener());
  }

  synchronize = (): Promise<void> => {
    if (!this.active) return Promise.resolve();
    clearTimeout(this.retry);
    this.retry = undefined;
    if (this.flight) {
      this.pending = true;
      return this.flight;
    }
    const epoch = this.epoch;
    const current = () => this.active && epoch === this.epoch;
    let flight: Promise<void>;
    flight = Promise.resolve().then(async () => {
      try {
        do {
          this.pending = false;
          const revision = this.revision;
          const [items, { count }] = await Promise.all([
            this.api.list(this.controller.signal), this.api.unreadCount(this.controller.signal),
          ]);
          if (!current()) return;
          if (revision !== this.revision) {
            this.pending = true;
            continue;
          }
          const unique = [...new Map(items.map((item) => [item.notification_id, item])).values()];
          // Separate API snapshots may straddle a server write. Retry inconsistent reads.
          if (unique.filter((item) => !item.is_read).length !== count) {
            this.scheduleRetry(epoch);
            return;
          }
          unique.forEach((item) => this.seen.add(item.notification_id));
          this.initialized = true;
          this.retryDelay = 1_000;
          this.update(unique);
        } while (this.pending && current());
      } catch (error) {
        if (!current() || (error instanceof Error && error.name === 'AbortError')) return;
        if (error && typeof error === 'object' && 'status' in error
            && (error.status === 401 || error.status === 403)) this.connection?.reconnect(true);
        this.scheduleRetry(epoch);
      } finally {
        if (this.flight === flight) this.flight = null;
      }
    });
    this.flight = flight;
    return flight;
  };

  resume = () => {
    if (!this.active) return;
    this.connection?.reconnect();
    void this.synchronize();
  };

  markRead = async (id: number): Promise<boolean> => {
    if (!this.active) return false;
    const epoch = this.epoch;
    await this.api.markRead(id, this.controller.signal);
    if (!this.active || epoch !== this.epoch) return false;
    this.revision += 1;
    this.update(this.snapshot.items.map((item) => item.notification_id === id ? { ...item, is_read: true } : item));
    await this.synchronize();
    return this.active && epoch === this.epoch;
  };

  markAllRead = async (): Promise<boolean> => {
    if (!this.active) return false;
    const epoch = this.epoch;
    const ids = new Set(this.snapshot.items.map((item) => item.notification_id));
    await this.api.markAllRead(this.controller.signal);
    if (!this.active || epoch !== this.epoch) return false;
    this.revision += 1;
    this.update(this.snapshot.items.map((item) => ids.has(item.notification_id) ? { ...item, is_read: true } : item));
    await this.synchronize();
    return this.active && epoch === this.epoch;
  };

  private scheduleRetry(epoch: number) {
    if (this.retry !== undefined) return;
    this.retry = setTimeout(() => {
      this.retry = undefined;
      if (this.active && epoch === this.epoch) void this.synchronize();
    }, this.retryDelay);
    this.retryDelay = Math.min(this.retryDelay * 2, 30_000);
  }

  private update(items: AppNotification[]) {
    const sorted = [...items].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
      || b.notification_id - a.notification_id);
    this.snapshot = { items: sorted, unread: sorted.filter((item) => !item.is_read).length };
    this.listeners.forEach((listener) => listener());
  }
}
