import { mockMatchingSettings, mockNotifications, mockNotificationSettings } from '@/mocks/data';
import { API_BASE_URL, apiRequest, USE_MOCK } from '@/api/client';
import type {
  AppNotification,
  CreateMatchingRequestRequest,
  MatchConnectionResponse,
  MatchingCandidatesResponse,
  MatchingChatRoomResponse,
  MatchingConditionDraft,
  MatchingRequestResponse,
  MatchingSettings,
  NotificationSettings,
  UpdateMatchingSettingsRequest,
} from '@/types';

let localNotifications = mockNotifications.map((item) => ({ ...item }));
let localNotiSettings = { ...mockNotificationSettings };
let localMatching = { ...mockMatchingSettings };

const mockMatchingCandidates: MatchingCandidatesResponse = {
  candidates: [
    {
      user_id: 201,
      nickname: '닉네임1',
      profile_image_url: null,
      theme: ['NATURE', 'FOOD'],
      pace: 'RELAXED',
      match_rate: 89,
    },
    {
      user_id: 202,
      nickname: '닉네임2',
      profile_image_url: null,
      theme: ['NATURE', 'FOOD'],
      pace: 'BALANCED',
      match_rate: 76,
    },
    {
      user_id: 203,
      nickname: '닉네임3',
      profile_image_url: null,
      theme: ['CULTURE', 'SNS'],
      pace: 'PACKED',
      match_rate: 49,
    },
  ],
  count: 3,
};

let nextMockMatchConnectionId = 300;
let nextMockChatRoomId = 400;
const mockMatchConnections = new Map<number, number>();
const mockChatRooms = new Map<number, number>();

function toCreateMatchingRequest(condition: MatchingConditionDraft): CreateMatchingRequestRequest {
  if (!condition.preferred_companion_gender || !condition.pace) {
    throw new Error('매칭 조건을 모두 선택해주세요.');
  }
  return {
    preferred_companion_gender: condition.preferred_companion_gender,
    theme: condition.themes,
    pace: condition.pace,
    budget_min: condition.budget_min,
    budget_max: condition.budget_max,
  };
}

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

  subscribe(onNotification: (notification: AppNotification) => void) {
    if (USE_MOCK) return null;
    const eventSource = new EventSource(`${API_BASE_URL}/api/notifications/subscribe`, {
      withCredentials: true,
    });
    eventSource.addEventListener('notification', (event) => {
      try {
        onNotification(JSON.parse(event.data) as AppNotification);
      } catch {
        // 잘못된 SSE payload는 화면 흐름을 막지 않는다.
      }
    });
    return eventSource;
  },
};

export const matchingApi = {
  /** GET /api/v2/matching-profiles/me */
  async getSettings() {
    if (USE_MOCK) return localMatching;
    return apiRequest<MatchingSettings>('/api/v2/matching-profiles/me');
  },

  /** PUT /api/v2/matching-profiles/me */
  async updateSettings(settings: UpdateMatchingSettingsRequest) {
    if (USE_MOCK) {
      localMatching = {
        exists: true,
        is_active: settings.is_active,
        gender: settings.gender,
        pace: settings.pace,
        themes: settings.themes,
        is_complete: Boolean(settings.gender && settings.pace && settings.themes.length > 0),
        can_match: Boolean(settings.is_active && settings.gender && settings.pace && settings.themes.length > 0),
      };
      return localMatching;
    }
    return apiRequest<MatchingSettings>('/api/v2/matching-profiles/me', {
      method: 'PUT',
      body: settings,
    });
  },

  /** POST /api/v2/matching-requests */
  async createRequest(condition: MatchingConditionDraft) {
    const body = toCreateMatchingRequest(condition);
    if (USE_MOCK) {
      return {
        matching_request_id: Date.now(),
        user_id: 0,
        preferred_companion_gender: body.preferred_companion_gender,
        theme: body.theme,
        pace: body.pace,
        budget_min: body.budget_min,
        budget_max: body.budget_max,
      } satisfies MatchingRequestResponse;
    }
    return apiRequest<MatchingRequestResponse>('/api/v2/matching-requests', {
      method: 'POST',
      body,
    });
  },

  /** DELETE /api/v2/matching-requests/me */
  async cancelRequest() {
    if (USE_MOCK) return;
    await apiRequest<void>('/api/v2/matching-requests/me', { method: 'DELETE' });
  },

  /** GET /api/v2/matches/candidates */
  async getCandidates() {
    if (USE_MOCK) return mockMatchingCandidates;
    return apiRequest<MatchingCandidatesResponse>('/api/v2/matches/candidates');
  },

  /** POST /api/v2/matches/responses */
  async respondCandidate(targetUserId: number) {
    if (USE_MOCK) {
      let matchConnectionId = mockMatchConnections.get(targetUserId);
      if (!matchConnectionId) {
        matchConnectionId = nextMockMatchConnectionId++;
        mockMatchConnections.set(targetUserId, matchConnectionId);
      }
      return {
        match_connection_id: matchConnectionId,
        matching_request_id: 1,
        target_user_id: targetUserId,
        status: 'ACTIVE',
        selected_at: new Date().toISOString(),
      } satisfies MatchConnectionResponse;
    }
    return apiRequest<MatchConnectionResponse>('/api/v2/matches/responses', {
      method: 'POST',
      body: { target_user_id: targetUserId },
    });
  },

  /** POST /api/v2/match-connections/{matchConnectionId}/chat-room */
  async prepareChatRoom(matchConnectionId: number) {
    if (USE_MOCK) {
      let chatRoomId = mockChatRooms.get(matchConnectionId);
      if (!chatRoomId) {
        chatRoomId = nextMockChatRoomId++;
        mockChatRooms.set(matchConnectionId, chatRoomId);
      }
      const targetUserId = [...mockMatchConnections.entries()]
        .find(([, connectionId]) => connectionId === matchConnectionId)?.[0];
      const candidate = mockMatchingCandidates.candidates.find((item) => item.user_id === targetUserId);
      return {
        chat_room_id: chatRoomId,
        match_connection_id: matchConnectionId,
        chat_name: candidate?.nickname ?? '채팅방',
        status: 'ACTIVE',
        member_user_ids: targetUserId === undefined ? [] : [targetUserId],
        created_at: new Date().toISOString(),
      } satisfies MatchingChatRoomResponse;
    }
    return apiRequest<MatchingChatRoomResponse>(
      `/api/v2/match-connections/${matchConnectionId}/chat-room`,
      { method: 'POST' },
    );
  },
};
