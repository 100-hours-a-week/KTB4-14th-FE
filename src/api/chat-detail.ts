import { apiRequest, USE_MOCK } from '@/api/client';
import type { ChatMessageContextResponse, ChatMessageSearchResponse, ChatRoomDetailResponse } from '@/types/chat-detail';

export const chatRoomDetailApi = {
  async searchMessages(roomId: number, keyword: string, cursor?: { cursor_time: string; cursor_id: number }): Promise<ChatMessageSearchResponse> {
    if (USE_MOCK) return { matches: [], cursor_time: null, cursor_id: null, has_next: false };
    return apiRequest<ChatMessageSearchResponse>(`/api/v2/chat/rooms/${roomId}/messages/search`, {
      query: { keyword, ...cursor },
    });
  },

  async getMessageContext(roomId: number, chatId: number): Promise<ChatMessageContextResponse> {
    if (USE_MOCK) return { chats: [], has_older: false, has_newer: false };
    return apiRequest<ChatMessageContextResponse>(`/api/v2/chat/rooms/${roomId}/messages/${chatId}/context`);
  },
  /** 채팅방 상세 조회 API: GET /api/v2/chat/rooms/{roomId} */
  async getRoomDetail(
    roomId: number,
    params?: {
      size?: number;
      chat_cursor_time?: string;
      chat_cursor_id?: number;
    },
  ): Promise<ChatRoomDetailResponse> {
    if (USE_MOCK) {
      return {
        chat_room_id: roomId,
        status: 'ACTIVE',
        opponent: {
          user_id: 0,
          chat_name: '대화 상대',
          profile_image_url: null,
          is_online: false,
        },
        chats: [],
        size: 0,
        chat_cursor_time: null,
        chat_cursor_id: null,
        has_next: false,
      };
    }
    return apiRequest<ChatRoomDetailResponse>(`/api/v2/chat/rooms/${roomId}`, { query: params });
  },
};
