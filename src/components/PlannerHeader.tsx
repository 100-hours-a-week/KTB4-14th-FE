import { BellIcon, ChevronLeftIcon } from '@/components/Icons';
import { useNotifications } from '@/context/NotificationContext';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 플래너 인디고 테마 화면용 상단 헤더.
 * 기존 Header 와 동작(뒤로가기 · 알림 이동 · 안 읽은 알림 점)은 같고 모양만 다르다.
 * - onBack 이 없으면 왼쪽은 빈 칸(탭 화면)
 * - right 를 넘기면 알림 버튼 대신 그 내용을 오른쪽에 둔다
 * - showBell={false} 면 오른쪽을 비운다
 */
export function PlannerHeader({
  title,
  onBack,
  right,
  showBell = true,
  className,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  showBell?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const { unread } = useNotifications();

  const rightSlot = right ?? (showBell ? (
    <button type="button" className="jp-header-btn" onClick={() => navigate('/notifications')} aria-label="알림">
      <BellIcon size={20} />
      {unread > 0 ? <span className="badge-dot jp-header-badge" aria-hidden="true" /> : null}
    </button>
  ) : <span className="jp-header-spacer" aria-hidden="true" />);

  return (
    <header className={`jp-header${className ? ` ${className}` : ''}`}>
      {onBack ? (
        <button type="button" className="jp-header-btn" onClick={onBack} aria-label="뒤로">
          <ChevronLeftIcon size={20} />
        </button>
      ) : (
        <span className="jp-header-spacer" aria-hidden="true" />
      )}
      <h1 className="jp-header-title">{title}</h1>
      {rightSlot}
    </header>
  );
}
