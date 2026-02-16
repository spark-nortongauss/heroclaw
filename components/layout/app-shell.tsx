'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from '@/components/ui/sidebar';
import { Topbar } from '@/components/ui/topbar';
import { InactivityGuard } from '@/components/layout/inactivity-guard';

const SIDEBAR_KEY = 'mc-sidebar-collapsed';

export function AppShell({ children, email }: { children: ReactNode; email?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(SIDEBAR_KEY);
    setCollapsed(saved === '1');
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div className="neon-grid min-h-screen md:flex">
      <InactivityGuard />
      <Sidebar isOpen={isOpen} collapsed={collapsed} onNavigate={() => setIsOpen(false)} onCloseMobile={() => setIsOpen(false)} onToggleCollapse={() => setCollapsed((prev) => !prev)} />
      {isOpen && <button className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setIsOpen(false)} aria-label="Close menu" />}
      <div className="relative z-10 min-w-0 flex-1">
        <Topbar email={email} onOpenSidebar={() => setIsOpen(true)} onToggleSidebar={() => setCollapsed((prev) => !prev)} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
