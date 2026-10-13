import { apiRequest, USE_MOCK } from '@/api/client';
import type { ChatRoomDetailResponse } from '@/types/chat-detail';

export const chatRoomDetailApi = {
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
