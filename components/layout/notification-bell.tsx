'use client';

import Link from 'next/link';
import { Bell, CircleAlert, CircleCheck, CircleDot, Loader2 } from 'lucide-react';
import { type ComponentType, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AppNotification, useNotifications } from '@/hooks/use-notifications';

const severityIcon: Record<AppNotification['severity'], ComponentType<{ className?: string }>> = {
  info: CircleDot,
  warning: CircleAlert,
  critical: CircleAlert
};

function formatTime(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 'Unknown time';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(parsed));
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAllAsRead, isLoading, error } = useNotifications();

  useEffect(() => {
    if (!open) return;

    const onDocumentClick = (event: MouseEvent) => {
      if (wrapperRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', onDocumentClick);
    return () => {
      document.removeEventListener('mousedown', onDocumentClick);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapperRef}>
      <Button type="button" variant="ghost" size="sm" className="relative h-9 w-9 p-0" onClick={() => setOpen((prev) => !prev)} aria-label="Notifications">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[360px] rounded-lg border bg-popover p-2 shadow-soft">
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-sm font-semibold">Notifications</p>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          </div>

          <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
            {isLoading && (
              <p className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading notifications…
              </p>
            )}

            {!isLoading && error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

            {!isLoading && !error && notifications.length === 0 && (
              <p className="rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground">No notifications yet.</p>
            )}

            {notifications.map((notification) => {
              const Icon = severityIcon[notification.severity] ?? CircleCheck;
              return (
                <Link
                  key={notification.id}
                  href={notification.href ?? '#'}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'block rounded-md border border-border/60 px-3 py-2 transition hover:bg-muted/70',
                    notification.severity === 'critical' && 'border-destructive/40'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', notification.severity === 'critical' ? 'text-destructive' : 'text-muted-foreground')} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{notification.title}</p>
                      {notification.body && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>}
                      <p className="mt-1 text-[11px] text-muted-foreground">{formatTime(notification.created_at)}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
