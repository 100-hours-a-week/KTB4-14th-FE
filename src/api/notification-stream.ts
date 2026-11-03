import { API_BASE_URL, ApiError, apiRequest, getAuthSessionVersion, refreshAccessToken } from '@/api/client';
import type { AppNotification } from '@/types';

export type NotificationStreamHandlers = {
  onNotification: (notification: AppNotification) => void;
  onConnected: () => void;
  onResyncRequired: () => void;
  onAuthenticationLost: () => void;
};

export type NotificationConnection = { close: () => void; reconnect: (force?: boolean) => void };

const notificationTypes = new Set(['MATCH_SUCCESS', 'NEW_MESSAGE', 'TRAVEL_BEFORE', 'TRAVEL_COMPLETE', 'TRAVEL_FAILED']);

export function parseNotification(value: unknown): AppNotification | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as AppNotification;
  if (!Number.isSafeInteger(item.notification_id) || item.notification_id <= 0
      || !notificationTypes.has(item.type) || typeof item.title !== 'string'
      || typeof item.is_read !== 'boolean' || typeof item.created_at !== 'string'
      || !Number.isFinite(Date.parse(item.created_at))
      || (typeof item.body !== 'string' && typeof item.content !== 'string')) return null;
  return { ...item, body: typeof item.body === 'string' ? item.body : item.content! };
}

export function openNotificationStream(handlers: NotificationStreamHandlers): NotificationConnection {
  const version = getAuthSessionVersion();
  const controller = new AbortController();
  let source: EventSource | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  let recovering = false;
  let failures = 0;
  const current = () => !closed && version === getAuthSessionVersion();

  const closeSource = () => {
    const previous = source;
    source = null;
    previous?.close();
  };
  const close = () => {
    closed = true;
    clearTimeout(timer);
    controller.abort();
    closeSource();
  };

  const recover = async () => {
    if (!current() || recovering) return;
    recovering = true;
    try {
      // EventSource does not expose HTTP status; distinguish expired credentials from a network outage.
      await apiRequest('/api/users/me', { skipRefresh: true, signal: controller.signal });
    } catch (error) {
      if (!current()) return;
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        try {
          if (!await refreshAccessToken()) {
            if (current()) {
              close();
              handlers.onAuthenticationLost();
            }
            return;
          }
        } catch {
          // A refresh network/5xx failure is retried; it must not log out a valid session.
        }
      }
    } finally {
      recovering = false;
    }
    if (!current()) return;
    const delay = Math.min(1_000 * 2 ** Math.min(failures++, 5), 30_000);
    timer = setTimeout(connect, delay);
  };

  function connect() {
    if (!current()) return;
    clearTimeout(timer);
    closeSource();
    let next: EventSource;
    try {
      next = new EventSource(`${API_BASE_URL}/api/notifications/subscribe`, { withCredentials: true });
    } catch {
      void recover();
      return;
    }
    source = next;
    let opened = false;
    const valid = () => current() && source === next;
    const connected = () => {
      if (!valid() || opened) return;
      opened = true;
      failures = 0;
      handlers.onConnected();
    };
    next.addEventListener('open', connected);
    next.addEventListener('connected', connected);
    next.addEventListener('resync_required', () => {
      if (valid()) handlers.onResyncRequired();
    });
    next.addEventListener('notification', (event) => {
      if (!valid()) return;
      let notification: AppNotification | null;
      try { notification = parseNotification(JSON.parse((event as MessageEvent).data)); } catch { return; }
      if (notification) handlers.onNotification(notification);
    });
    next.addEventListener('error', () => {
      if (!valid()) return;
      closeSource();
      void recover();
    });
  }

  connect();
  return {
    close,
    reconnect(force = false) {
      if (!current() || recovering) return;
      if (!force && source?.readyState === EventSource.OPEN) return;
      connect();
    },
  };
}
