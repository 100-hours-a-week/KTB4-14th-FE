import { NavLink, useLocation } from 'react-router-dom';

const TABS = [
  { to: '/home', label: '홈', icon: '⌂', activePaths: ['/home'] },
  { to: '/matching', label: '매칭', icon: '✦', activePaths: ['/matching'] },
  { to: '/chat', label: '채팅', icon: '💬', activePaths: ['/chat'] },
  { to: '/my', label: '마이', icon: '☺', activePaths: ['/my'] },
];

export function TabBar() {
  const location = useLocation();

  return (
    <nav className="tab-bar">
      {TABS.map((tab) => {
        const active = tab.activePaths.some((path) => (
          location.pathname === path || location.pathname.startsWith(`${path}/`)
        ));

        return (
          <NavLink key={tab.to} to={tab.to} className={`tab-item${active ? ' active' : ''}`}>
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
