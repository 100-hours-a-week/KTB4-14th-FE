import type { ChatRoomStatus } from '@/types';

export type ChatRoomDetailOpponent = {
  user_id: number;
  chat_name: string;
  profile_image_url: string | null;
  is_online: boolean;
};

export type ChatRoomDetailMessage = {
  chat_id: number;
  /** 메시지 전송/동기화 API가 제공하는 방별 순번. 상세 조회 응답에는 생략될 수 있다. */
  message_seq?: number;
  sender_id: number;
  content: string;
  sent_at: string;
  /** 수신자가 메시지를 읽었는지 여부 */
  is_read: boolean;
};

export type ChatRoomDetailResponse = {
  chat_room_id: number;
  status: ChatRoomStatus;
  opponent: ChatRoomDetailOpponent;
  /** 시간 오름차순으로 반환되어 화면에 그대로 표시한다. */
  chats: ChatRoomDetailMessage[];
  size: number;
  chat_cursor_time: string | null;
  chat_cursor_id: number | null;
  has_next: boolean;
};

export type ChatMessageSearchResponse = {
  matches: { chat_id: number; sent_at: string }[];
  cursor_time: string | null;
  cursor_id: number | null;
  has_next: boolean;
};

export type ChatMessageContextResponse = {
  chats: ChatRoomDetailMessage[];
  has_older: boolean;
  has_newer: boolean;
};
