import { mockMatchingSettings, mockNotifications, mockNotificationSettings } from '@/mocks/data';
import { apiRequest, USE_MOCK } from '@/api/client';
import type { AppNotification, MatchingSettings, NotificationSettings } from '@/types';

let localNotifications = mockNotifications.map((item) => ({ ...item }));
let localNotiSettings = { ...mockNotificationSettings };
let localMatching = { ...mockMatchingSettings };

export const notificationsApi = {
  /** GET /api/notifications */
  async list(): Promise<AppNotification[]> {
    if (USE_MOCK) return localNotifications;
    return apiRequest<AppNotification[]>('/api/notifications');
  },

  /** GET /api/notifications/unread-count */
  async unreadCount() {
    if (USE_MOCK) return { count: localNotifications.filter((item) => !item.is_read).length };
    return apiRequest<{ count: number }>('/api/notifications/unread-count');
  },

  /** PATCH /api/notifications/:id/read */
  async markRead(notificationId: number) {
    if (USE_MOCK) {
      localNotifications = localNotifications.map((item) =>
        item.notification_id === notificationId ? { ...item, is_read: true } : item,
      );
      return;
    }
    await apiRequest<void>(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });
  },

  /** POST /api/notifications/read-all */
  async markAllRead() {
    if (USE_MOCK) {
      localNotifications = localNotifications.map((item) => ({ ...item, is_read: true }));
      return;
    }
    await apiRequest<void>('/api/notifications/read-all', { method: 'POST' });
  },

  /** GET /api/notification-settings */
  async getSettings() {
    if (USE_MOCK) return localNotiSettings;
    return apiRequest<NotificationSettings>('/api/notification-settings');
  },

  /** PATCH /api/notification-settings */
  async updateSettings(settings: NotificationSettings) {
    if (USE_MOCK) {
      localNotiSettings = settings;
      return settings;
    }
    return apiRequest<NotificationSettings>('/api/notification-settings', {
      method: 'PATCH',
      body: settings,
    });
  },
};

export const matchingApi = {
  /** GET /api/matching/settings */
  async getSettings() {
    if (USE_MOCK) return localMatching;
    return apiRequest<MatchingSettings>('/api/matching/settings');
  },

  /** PATCH /api/matching/settings */
  async updateSettings(settings: MatchingSettings) {
    if (USE_MOCK) {
      localMatching = settings;
      return settings;
    }
    return apiRequest<MatchingSettings>('/api/matching/settings', {
      method: 'PATCH',
      body: settings,
    });
  },
};
