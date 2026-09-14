import { Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import { TabBar } from '@/components/TabBar';

export function TabLayout() {
  return (
    <div className="screen">
      <div className="phone-body">
        <Outlet />
      </div>
      <TabBar />
    </div>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return <section className="screen">{children}</section>;
}
