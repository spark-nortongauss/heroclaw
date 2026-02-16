'use client';

import { Menu, PanelLeftClose } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeSwitcher } from '@/components/layout/theme-switcher';
import { NotificationBell } from '@/components/layout/notification-bell';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/components/providers/locale-provider';

export function Topbar({ email, onOpenSidebar, onToggleSidebar }: { email?: string; onOpenSidebar: () => void; onToggleSidebar: () => void }) {
  const router = useRouter();
  const { t } = useLocale();

  const onLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:px-6">
      {/*
        Header interactivity playbook:
        1) Any header control using state/events/window APIs must stay in a client component.
        2) shadcn DropdownMenu must keep Trigger(asChild)+Content under the same Root.
      */}
      <div className="flex items-center gap-2">
        <button className="rounded-md p-2 hover:bg-muted md:hidden" onClick={onOpenSidebar} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <button className="hidden rounded-md p-2 transition hover:bg-muted md:inline-flex" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
      <div className="relative z-40 flex items-center gap-3 pointer-events-auto">
        <NotificationBell />
        <LanguageSwitcher />
        <ThemeSwitcher />
        <span className="hidden rounded-full bg-muted px-3 py-1 text-xs text-mutedForeground md:inline-flex">{email ?? 'Unknown user'}</span>
        <Button variant="secondary" size="sm" onClick={onLogout} className="transition-colors hover:bg-muted">
          {t('common.logout')}
        </Button>
      </div>
    </header>
  );
}
