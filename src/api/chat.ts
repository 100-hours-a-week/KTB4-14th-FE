import { apiRequest, USE_MOCK } from '@/api/client';
import type { ChatRoomListResponse } from '@/types';

export const chatApi = {
  /** GET /api/v2/chat/rooms */
  async listRooms(params?: { cursor_time?: string; cursor_id?: number; size?: number }) {
    if (USE_MOCK) {
      return {
        rooms: [],
        size: 0,
        cursor_time: null,
        cursor_id: null,
        has_next: false,
      } satisfies ChatRoomListResponse;
    }
    return apiRequest<ChatRoomListResponse>('/api/v2/chat/rooms', { query: params });
  },
};
