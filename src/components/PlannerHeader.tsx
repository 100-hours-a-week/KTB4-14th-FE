import { BellIcon, ChevronLeftIcon } from '@/components/Icons';
import { useNotifications } from '@/context/NotificationContext';
import { useNavigate } from 'react-router-dom';

/**
 * 플래너 인디고 테마 화면(여행 기록 · 추천 경로)용 상단 헤더.
 * 기존 Header 와 동작(뒤로가기 · 알림 이동 · 안 읽은 알림 점)은 같고 모양만 다르다.
 */
export function PlannerHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const navigate = useNavigate();
  const { unread } = useNotifications();

  return (
    <header className="jp-header">
      <button type="button" className="jp-header-btn" onClick={onBack} aria-label="뒤로">
        <ChevronLeftIcon size={20} />
      </button>
      <h1 className="jp-header-title">{title}</h1>
      <button type="button" className="jp-header-btn" onClick={() => navigate('/notifications')} aria-label="알림">
        <BellIcon size={20} />
        {unread > 0 ? <span className="badge-dot jp-header-badge" aria-hidden="true" /> : null}
      </button>
    </header>
  );
}
