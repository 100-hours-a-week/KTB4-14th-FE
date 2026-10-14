import { apiRequest, USE_MOCK } from '@/api/client';
import type {
  ChatMessageCatchUpResponse,
  ChatMessageSendRequest,
  ChatMessageSendResponse,
  ChatRoomListResponse,
  ChatRoomReadResponse,
} from '@/types';

let mockMessageId = 0;
const mockRoomSequences = new Map<number, number>();

export const chatApi = {
  /** 채팅방 목록 조회 API: GET /api/v2/chat/rooms */
  async listRooms(params?: {
    chat_name?: string;
    cursor_time?: string;
    cursor_id?: number;
    size?: number;
  }) {
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

  /** 채팅방 읽음 처리 API: PATCH /api/v2/chat/rooms/{roomId}/read */
  async markRoomRead(roomId: number, lastReadChatId: number) {
    if (USE_MOCK) {
      return {
        chat_room_id: roomId,
        last_read_chat_id: lastReadChatId,
        read_count: 0,
        read_at: null,
      } satisfies ChatRoomReadResponse;
    }
    return apiRequest<ChatRoomReadResponse>(`/api/v2/chat/rooms/${roomId}/read`, {
      method: 'PATCH',
      body: { last_read_chat_id: lastReadChatId },
    });
  },

  /** 채팅방 나가기 API: DELETE /api/v2/chat/rooms/{roomId} */
  async leaveRoom(roomId: number): Promise<void> {
    if (USE_MOCK) return;
    return apiRequest<void>(`/api/v2/chat/rooms/${roomId}`, { method: 'DELETE' });
  },

  /** 메시지 전송 API: POST /api/v2/chat/rooms/{roomId}/messages */
  async sendMessage(roomId: number, request: ChatMessageSendRequest) {
    if (USE_MOCK) {
      const sequence = (mockRoomSequences.get(roomId) ?? 0) + 1;
      mockRoomSequences.set(roomId, sequence);
      mockMessageId += 1;
      return {
        message_id: mockMessageId,
        room_id: roomId,
        sender_id: 0,
        client_message_id: request.client_message_id,
        message_seq: sequence,
        content: request.content,
        sent_at: new Date().toISOString(),
      } satisfies ChatMessageSendResponse;
    }
    return apiRequest<ChatMessageSendResponse>(`/api/v2/chat/rooms/${roomId}/messages`, {
      method: 'POST',
      body: request,
    });
  },

  /** 이전 메시지 이어서 조회 API: GET /api/v2/chat/rooms/{roomId}/messages?after_message_seq=... */
  async getMessagesAfter(roomId: number, afterMessageSequence: number, size = 100) {
    if (USE_MOCK) {
      return {
        messages: [],
        size: 0,
        next_after_message_seq: afterMessageSequence,
        has_next: false,
      } satisfies ChatMessageCatchUpResponse;
    }
    return apiRequest<ChatMessageCatchUpResponse>(`/api/v2/chat/rooms/${roomId}/messages`, {
      query: { after_message_seq: afterMessageSequence, size },
    });
  },

};
