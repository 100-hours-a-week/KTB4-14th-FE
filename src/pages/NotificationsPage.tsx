import { notificationsApi } from '@/api';
import { Header } from '@/components/Header';
import { useNotifications } from '@/context/NotificationContext';
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

export function NotificationsPage() {
  const navigate = useNavigate();
  const notifications = useNotifications();
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
                const wasUnread = !item.is_read;
                await notificationsApi.markRead(item.notification_id);
                if (wasUnread) notifications.markOneReadLocally();
                await load();
                if (item.travel_plan_id) navigate(`/itinerary/${item.travel_plan_id}`);
              }}>
              <span className="menu-icon" style={{ background: 'var(--sand)' }}>
                {ICONS[item.type]}
              </span>
              <span style={{ flex: 1 }}>
                <strong>{item.title}</strong>
                <div className="place-addr">{item.body}</div>
              </span>
              <small className="place-addr">{timeLabel(item.created_at)}</small>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
