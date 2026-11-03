import { notificationsApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { NotificationStore } from '@/notifications/NotificationStore';
import type { AppNotification } from '@/types';
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';

type NotificationContextValue = {
  items: AppNotification[];
  unread: number;
  refreshUnread: () => Promise<void>;
  markRead: (id: number) => Promise<boolean>;
  markAllRead: () => Promise<boolean>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, sessionVersion, expireSession } = useAuth();
  const toast = useToast();
  const userId = user?.user_id;
  const store = useMemo(() => new NotificationStore(notificationsApi), [userId, sessionVersion]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);

  useEffect(() => {
    if (!userId) return;
    const stop = store.start(toast.show, () => {
      toast.show('로그인이 만료됐습니다. 다시 로그인해 주세요.');
      expireSession();
    });
    const onVisible = () => { if (document.visibilityState === 'visible') store.resume(); };
    window.addEventListener('focus', store.resume);
    window.addEventListener('online', store.resume);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', store.resume);
      window.removeEventListener('online', store.resume);
      document.removeEventListener('visibilitychange', onVisible);
      stop();
    };
  }, [store, userId, toast.show, expireSession]);

  const value = useMemo(() => ({
    ...snapshot,
    refreshUnread: store.synchronize,
    markRead: store.markRead,
    markAllRead: store.markAllRead,
  }), [snapshot, store]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('NotificationProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
