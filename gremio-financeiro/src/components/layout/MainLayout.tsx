// ===== MAIN LAYOUT COMPONENT =====
import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, Header } from './index';

export function MainLayout() {
  return (
    <div className="min-h-screen bg-primary flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <Header />
        <main className="flex-1 overflow-y-auto bg-primary">
          <Outlet />
        </main>
      </div>
    </div>
  );
}