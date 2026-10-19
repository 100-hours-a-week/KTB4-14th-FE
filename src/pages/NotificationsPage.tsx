import { notificationsApi } from '@/api';
import { Header } from '@/components/Header';
import { useNotifications } from '@/context/NotificationContext';
import { useToast } from '@/context/ToastContext';
import type { AppNotification, NotificationType } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ICONS: Record<NotificationType, string> = {
  MATCH_SUCCESS: '✓',
  NEW_MESSAGE: '💬',
  TRAVEL_BEFORE: '📅',
  TRAVEL_COMPLETE: '✦',
  TRAVEL_FAILED: '!',
};

function timeLabel(value: string) {
  const date = new Date(value);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function isPositiveId(value: number | undefined): value is number {
  return Number.isSafeInteger(value) && Boolean(value && value > 0);
}

function notificationDestination(item: AppNotification) {
  if (item.type === 'NEW_MESSAGE' && item.target_type === 'CHAT_ROOM' && isPositiveId(item.target_id)) {
    return `/chat/${item.target_id}`;
  }
  if (
    item.type === 'MATCH_SUCCESS'
    && item.target_type === 'MATCH_CONNECTION'
    && isPositiveId(item.target_id)
  ) {
    return `/matching/result?matchConnectionId=${item.target_id}`;
  }
  if (
    ['TRAVEL_BEFORE', 'TRAVEL_COMPLETE', 'TRAVEL_FAILED'].includes(item.type)
    && (!item.target_type || item.target_type === 'TRAVEL_PLAN')
  ) {
    const travelPlanId = item.target_id ?? item.travel_plan_id;
    if (isPositiveId(travelPlanId)) return `/output/${travelPlanId}/places`;
  }
  return null;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const toast = useToast();
  const [items, setItems] = useState<AppNotification[]>([]);
  const load = async () => {
    setItems(await notificationsApi.list());
    await notifications.refreshUnread();
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="screen">
      <Header
        title="알림"
        onBack={() => navigate(-1)}
        right={
          <button
            type="button"
            className="logout"
            style={{ padding: 0 }}
            onClick={async () => {
              await notificationsApi.markAllRead();
              notifications.markAllReadLocally();
              await load();
            }}>
            모두 읽음
          </button>
        }
      />
      <div className="scroll">
        {items.length === 0 ? (
          <div className="empty-box">알림이 없습니다.</div>
        ) : (
          items.map((item) => (
            <button
              key={item.notification_id}
              type="button"
              className={`noti-row${item.is_read ? '' : ' unread'}`}
              onClick={async () => {
                const destination = notificationDestination(item);
                const wasUnread = !item.is_read;
                await notificationsApi.markRead(item.notification_id);
                if (wasUnread) notifications.markOneReadLocally();
                await load();
                if (!destination) {
                  toast.show('연결된 화면을 열 수 없어요.');
                  return;
                }
                navigate(destination, {
                  state: item.type === 'MATCH_SUCCESS' ? { notificationBody: item.body } : undefined,
                });
              }}>
              <span className="menu-icon" style={{ background: 'var(--sand)' }}>
                {ICONS[item.type]}
              </span>
              <span className="noti-content">
                <strong>{item.title}</strong>
                <div className="place-addr noti-message">{item.body}</div>
              </span>
              <small className="place-addr noti-date">{timeLabel(item.created_at)}</small>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
