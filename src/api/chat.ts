import { apiRequest, USE_MOCK } from '@/src/api/client';
import type { ChatRoom } from '@/src/types';

/**
 * 채팅 도메인은 현재 서비스 준비중 화면만 노출한다.
 * 백엔드 채팅 도메인 개발 시 아래 통로를 연결한다.
 *
 * GET /chat/rooms?chat_name=
 * GET /chat/rooms?cursor_time=&cursor_id=&size=
 */
export const chatApi = {
  async listRooms(params?: { chat_name?: string; cursor_time?: string; cursor_id?: number; size?: number }) {
    if (USE_MOCK) return { rooms: [] as ChatRoom[], has_next: false };
    return apiRequest<{ rooms: ChatRoom[]; has_next: boolean }>('/chat/rooms', { query: params });
  },
};
