import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/home', label: '홈', icon: '⌂' },
  { to: '/matching', label: '매칭', icon: '✦' },
  { to: '/chat', label: '채팅', icon: '💬' },
  { to: '/my', label: '마이', icon: '☺' },
];

export function TabBar() {
  return (
    <nav className="tab-bar">
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}>
          <span className="tab-icon">{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
