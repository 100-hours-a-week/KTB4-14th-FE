import { notificationsApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { AppNotification } from '@/types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type NotificationContextValue = {
  unread: number;
  refreshUnread: () => Promise<void>;
  markOneReadLocally: () => void;
  markAllReadLocally: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const toast = useToast();
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnread(0);
      return;
    }
    const response = await notificationsApi.unreadCount();
    setUnread(response.count);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return undefined;
    }

    let cancelled = false;
    let eventSource: EventSource | null = null;

    const connect = async () => {
      await refreshUnread().catch(() => setUnread(0));
      if (cancelled) return;
      eventSource = notificationsApi.subscribe((notification: AppNotification) => {
        setUnread((current) => current + 1);
        toast.show(notification.body || notification.title);
      });
    };

    void connect();

    return () => {
      cancelled = true;
      eventSource?.close();
    };
  }, [refreshUnread, toast, user]);

  const markOneReadLocally = useCallback(() => {
    setUnread((current) => Math.max(0, current - 1));
  }, []);

  const markAllReadLocally = useCallback(() => {
    setUnread(0);
  }, []);

  const value = useMemo(
    () => ({ unread, refreshUnread, markOneReadLocally, markAllReadLocally }),
    [markAllReadLocally, markOneReadLocally, refreshUnread, unread],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('NotificationProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
