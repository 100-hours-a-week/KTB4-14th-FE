import { AlertIcon, BellIcon, CalendarIcon, ChatBubbleIcon, CheckIcon, SparkIcon, UsersIcon } from '@/components/Icons';
import { PlannerHeader } from '@/components/PlannerHeader';
import { useNotifications } from '@/context/NotificationContext';
import { useToast } from '@/context/ToastContext';
import type { AppNotification, NotificationType } from '@/types';
import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

/** 알림 종류별 장식용 아이콘 · 색 (화면 표시 전용) */
const ICONS: Record<NotificationType, { icon: ReactNode; tone: string }> = {
  MATCH_SUCCESS: { icon: <UsersIcon size={18} />, tone: 'indigo' },
  NEW_MESSAGE: { icon: <ChatBubbleIcon size={18} />, tone: 'mint' },
  TRAVEL_BEFORE: { icon: <CalendarIcon size={18} />, tone: 'coral' },
  TRAVEL_COMPLETE: { icon: <SparkIcon size={18} />, tone: 'violet' },
  TRAVEL_FAILED: { icon: <AlertIcon size={18} />, tone: 'coral' },
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
  const { items, refreshUnread } = notifications;

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  const unreadCount = items.filter((item) => !item.is_read).length;

  return (
    <section className="screen jn-screen notifications-screen">
      <PlannerHeader
        title="알림"
        onBack={() => navigate('/home', { replace: true })}
        right={
          <button
            type="button"
            className="jn-read-all"
            onClick={async () => {
              try { await notifications.markAllRead(); } catch (error) {
                if (!(error instanceof Error && error.name === 'AbortError')) toast.show('읽음 처리에 실패했어요. 다시 시도해 주세요.');
              }
            }}>
            <CheckIcon size={13} />
            모두 읽음
          </button>
        }
      />
      <div className="scroll">
        {items.length === 0 ? (
          <div className="empty-box jn-empty">
            <span className="jn-empty-icon" aria-hidden="true"><BellIcon size={24} /></span>
            알림이 없습니다.
          </div>
        ) : null}
        {unreadCount > 0 ? <p className="jn-count">새 알림 {unreadCount}개</p> : null}
        {items.length === 0 ? null : (
          items.map((item) => (
            <button
              key={item.notification_id}
              type="button"
              className={`noti-row${item.is_read ? '' : ' unread'}`}
              onClick={async () => {
                const destination = notificationDestination(item);
                try {
                  if (!await notifications.markRead(item.notification_id)) return;
                } catch (error) {
                  if (!(error instanceof Error && error.name === 'AbortError')) toast.show('읽음 처리에 실패했어요. 다시 시도해 주세요.');
                  return;
                }
                if (!destination) {
                  toast.show('연결된 화면을 열 수 없어요.');
                  return;
                }
                navigate(destination, {
                  state: item.type === 'MATCH_SUCCESS' ? { notificationBody: item.body } : undefined,
                });
              }}>
              <span className={`menu-icon jn-icon ${ICONS[item.type]?.tone ?? 'indigo'}`} aria-hidden="true">
                {ICONS[item.type]?.icon ?? <BellIcon size={18} />}
              </span>
              <span className="noti-content">
                <strong>{item.title}</strong>
                <div className="place-addr noti-message">{item.body}</div>
              </span>
              <small className="place-addr noti-date">{timeLabel(item.created_at)}</small>
              {item.is_read ? null : <span className="jn-unread-dot" aria-hidden="true" />}
            </button>
          ))
        )}
      </div>
    </section>
  );
}
