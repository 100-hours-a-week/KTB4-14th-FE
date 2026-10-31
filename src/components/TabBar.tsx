import { ChatIcon, HomeIcon, MatchingIcon, UserIcon } from '@/components/Icons';
import type { ComponentType } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

type TabIcon = ComponentType<{ size?: number; filled?: boolean }>;

const TABS: { to: string; label: string; Icon: TabIcon; activePaths: string[] }[] = [
  { to: '/home', label: '홈', Icon: HomeIcon, activePaths: ['/home'] },
  { to: '/matching', label: '매칭', Icon: MatchingIcon, activePaths: ['/matching'] },
  { to: '/chat', label: '채팅', Icon: ChatIcon, activePaths: ['/chat'] },
  { to: '/my', label: '마이', Icon: UserIcon, activePaths: ['/my'] },
];

export function TabBar() {
  const location = useLocation();

  return (
    <nav className="tab-bar" aria-label="주요 메뉴">
      {TABS.map(({ to, label, Icon, activePaths }) => {
        const active = activePaths.some((path) => (
          location.pathname === path || location.pathname.startsWith(`${path}/`)
        ));

        return (
          <NavLink key={to} to={to} className={`tab-item${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
            <span className="tab-icon">
              <Icon size={22} filled={active} />
            </span>
            <span className="tab-label">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
