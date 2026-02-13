'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from '@/components/ui/sidebar';
import { Topbar } from '@/components/ui/topbar';

export function AppShell({ children, email }: { children: ReactNode; email?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div className="neon-grid min-h-screen md:flex">
      <Sidebar isOpen={isOpen} onNavigate={() => setIsOpen(false)} />
      {isOpen && <button className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setIsOpen(false)} aria-label="Close menu" />}
      <div className="relative z-10 flex-1">
        <Topbar email={email} onOpenSidebar={() => setIsOpen(true)} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
