// ===== MAIN LAYOUT COMPONENT =====
import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, Header } from './index';

export function MainLayout() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-primary flex">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-primary">
          <Outlet />
        </main>
      </div>
    </div>
  );
}