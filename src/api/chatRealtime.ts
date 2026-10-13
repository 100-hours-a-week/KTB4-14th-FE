import { Client, type IMessage } from '@stomp/stompjs';
import { API_BASE_URL } from '@/api/client';
import type { ChatMessageSendResponse } from '@/types';

export type ChatRealtimeEvent = {
  event_type: 'MESSAGE_CREATED';
  data: ChatMessageSendResponse;
};

function websocketUrl() {
  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  return `${baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')}/ws/chat`;
}

function parseMessage(frame: IMessage): ChatRealtimeEvent | null {
  try {
    const event = JSON.parse(frame.body) as Partial<ChatRealtimeEvent>;
    if (
      event.event_type !== 'MESSAGE_CREATED' ||
      !event.data ||
      typeof event.data.message_id !== 'number' ||
      typeof event.data.room_id !== 'number' ||
      typeof event.data.sender_id !== 'number' ||
      typeof event.data.client_message_id !== 'string' ||
      typeof event.data.message_seq !== 'number' ||
      typeof event.data.content !== 'string' ||
      typeof event.data.sent_at !== 'string'
    ) {
      return null;
    }
    return event as ChatRealtimeEvent;
  } catch {
    return null;
  }
}

export function connectChatRealtime(
  roomId: number,
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
        if (event?.data.room_id === roomId) onMessage(event);
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
