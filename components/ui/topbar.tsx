'use client';

import { Menu, PanelLeftClose } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

export function Topbar({ email, onOpenSidebar, onToggleSidebar }: { email?: string; onOpenSidebar: () => void; onToggleSidebar: () => void }) {
  const router = useRouter();

  const onLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-2">
        <button className="rounded-md p-2 hover:bg-muted md:hidden" onClick={onOpenSidebar} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <button className="hidden rounded-md p-2 transition hover:bg-muted md:inline-flex" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <PanelLeftClose className="h-4 w-4" />
        </button>
        <h1 className="font-[var(--font-heading)] text-lg font-semibold">Mission Control</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden rounded-full bg-muted px-3 py-1 text-xs text-mutedForeground md:inline-flex">{email ?? 'Unknown user'}</span>
        <Button variant="secondary" size="sm" onClick={onLogout} className="transition-colors hover:bg-muted">
          Logout
        </Button>
      </div>
    </header>
  );
}
