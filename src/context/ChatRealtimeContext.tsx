import { USE_MOCK } from '@/api/client';
import type { ChatRealtimeEvent } from '@/api/chatRealtime';
import { useAuth } from '@/context/AuthContext';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type ChatRealtimeSubscriber = {
  onEvent?: (event: ChatRealtimeEvent) => void;
  onConnected?: () => void;
};

type ChatRealtimeContextValue = {
  connected: boolean;
  subscribe: (subscriber: ChatRealtimeSubscriber) => () => void;
};

const ChatRealtimeContext = createContext<ChatRealtimeContextValue | null>(null);

export function ChatRealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const connectedRef = useRef(connected);
  const subscribersRef = useRef(new Set<ChatRealtimeSubscriber>());
  connectedRef.current = connected;

  const subscribe = useCallback((subscriber: ChatRealtimeSubscriber) => {
    subscribersRef.current.add(subscriber);
    if (connectedRef.current) subscriber.onConnected?.();
    return () => {
      subscribersRef.current.delete(subscriber);
    };
  }, []);

  useEffect(() => {
    if (!user?.user_id || USE_MOCK) {
      connectedRef.current = false;
      setConnected(false);
      return;
    }

    let active = true;
    let disconnect: (() => void) | null = null;
    connectedRef.current = false;
    setConnected(false);

    void import('@/api/chatRealtime').then(({ connectChatRealtime }) => {
      if (!active) return;
      disconnect = connectChatRealtime(
        null,
        (event) => {
          subscribersRef.current.forEach((subscriber) => subscriber.onEvent?.(event));
        },
        (nextConnected) => {
          if (!active) return;
          connectedRef.current = nextConnected;
          setConnected(nextConnected);
        },
        () => {
          if (!active) return;
          subscribersRef.current.forEach((subscriber) => subscriber.onConnected?.());
        },
      );
    });

    return () => {
      active = false;
      disconnect?.();
    };
  }, [user?.user_id]);

  const value = useMemo(() => ({ connected, subscribe }), [connected, subscribe]);
  return <ChatRealtimeContext.Provider value={value}>{children}</ChatRealtimeContext.Provider>;
}

export function useChatRealtime() {
  const context = useContext(ChatRealtimeContext);
  if (!context) throw new Error('ChatRealtimeProvider 안에서만 사용할 수 있습니다.');
  return context;
}
