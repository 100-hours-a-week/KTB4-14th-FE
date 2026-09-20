import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

export function Header({
  title,
  onBack,
  right,
  showBell,
  unread = 0,
  className,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  showBell?: boolean;
  unread?: number;
  className?: string;
}) {
  const navigate = useNavigate();
  return (
    <header className={`header${className ? ` ${className}` : ''}`}>
      <div className="header-side">
        {onBack ? (
          <button type="button" className="icon-btn" onClick={onBack} aria-label="뒤로">
            <span className="header-back-mark" aria-hidden="true">
              ‹
            </span>
          </button>
        ) : null}
      </div>
      <h1 className="header-title">{title}</h1>
      <div className="header-side right">
        {showBell ? (
          <button type="button" className="icon-btn" onClick={() => navigate('/notifications')} aria-label="알림">
            🔔
            {unread > 0 ? <span className="badge-dot" /> : null}
          </button>
        ) : (
          right
        )}
      </div>
    </header>
  );
}
