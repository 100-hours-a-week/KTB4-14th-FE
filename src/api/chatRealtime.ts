import { Client, type IMessage } from '@stomp/stompjs';
import { API_BASE_URL } from '@/api/client';
import type { ChatMessageSendResponse } from '@/types';

export type ChatMessageCreatedEvent = {
  event_type: 'MESSAGE_CREATED';
  data: ChatMessageSendResponse;
};

export type ChatReadReceiptUpdatedEvent = {
  event_type: 'READ_RECEIPT_UPDATED';
  room_id: number;
  reader_id: number;
  read_through_message_seq: number;
  read_at: string | null;
};

export type ChatPresenceUpdatedEvent = {
  event_type: 'PRESENCE_UPDATED';
  user_id: number;
  is_online: boolean;
};

export type ChatRealtimeEvent =
  | ChatMessageCreatedEvent
  | ChatReadReceiptUpdatedEvent
  | ChatPresenceUpdatedEvent;

function websocketUrl() {
  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  return `${baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')}/ws/chat`;
}

function parseMessage(frame: IMessage): ChatRealtimeEvent | null {
  try {
    const event = JSON.parse(frame.body) as Record<string, unknown>;
    if (event.event_type === 'MESSAGE_CREATED') {
      if (typeof event.data !== 'object' || event.data === null) return null;
      const data = event.data as Partial<ChatMessageSendResponse>;
      if (
        typeof data.message_id !== 'number' ||
        typeof data.room_id !== 'number' ||
        typeof data.sender_id !== 'number' ||
        typeof data.client_message_id !== 'string' ||
        typeof data.message_seq !== 'number' ||
        typeof data.content !== 'string' ||
        typeof data.sent_at !== 'string'
      ) {
        return null;
      }
      return event as unknown as ChatMessageCreatedEvent;
    }

    if (
      event.event_type === 'READ_RECEIPT_UPDATED' &&
      typeof event.room_id === 'number' &&
      typeof event.reader_id === 'number' &&
      typeof event.read_through_message_seq === 'number' &&
      (typeof event.read_at === 'string' || event.read_at === null)
    ) {
      return event as unknown as ChatReadReceiptUpdatedEvent;
    }

    if (
      event.event_type === 'PRESENCE_UPDATED' &&
      typeof event.user_id === 'number' &&
      typeof event.is_online === 'boolean'
    ) {
      return event as unknown as ChatPresenceUpdatedEvent;
    }

    return null;
  } catch {
    return null;
  }
}

export function connectChatRealtime(
  roomId: number | null,
  onMessage: (event: ChatRealtimeEvent) => void,
  onConnectionChange: (connected: boolean) => void,
  onConnected: () => void,
) {
  const client = new Client({
    brokerURL: websocketUrl(),
    reconnectDelay: 3_000,
    heartbeatIncoming: 10_000,
    heartbeatOutgoing: 10_000,
    onConnect: () => {
      onConnectionChange(true);
      client.subscribe('/user/queue/chat/messages', (frame) => {
        const event = parseMessage(frame);
        const eventRoomId = event?.event_type === 'MESSAGE_CREATED'
          ? event.data.room_id
          : event?.event_type === 'READ_RECEIPT_UPDATED'
            ? event.room_id
            : null;
        if (
          event &&
          (event.event_type === 'PRESENCE_UPDATED' || roomId === null || eventRoomId === roomId)
        ) onMessage(event);
      });
      onConnected();
    },
    onWebSocketClose: () => onConnectionChange(false),
    onWebSocketError: () => onConnectionChange(false),
    onStompError: () => onConnectionChange(false),
  });

  client.activate();
  return () => {
    onConnectionChange(false);
    void client.deactivate();
  };
}
