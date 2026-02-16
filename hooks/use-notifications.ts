'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type AppNotification = {
  id: string;
  type: 'ticket' | 'project' | 'agent' | 'inbox' | 'request' | 'system';
  title: string;
  body?: string;
  created_at: string;
  href?: string;
  severity: 'info' | 'warning' | 'critical';
};

const POLL_MS = 45_000;

function safeIso(value: string | null | undefined) {
  if (!value) return new Date(0).toISOString();
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return new Date(0).toISOString();
  return new Date(parsed).toISOString();
}

function sortByNewest(list: AppNotification[]) {
  return [...list].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function useNotifications() {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});
  const refreshTimer = useRef<number | null>(null);

  const storageKey = useMemo(() => (userId ? `mc-notifications-read:${userId}` : null), [userId]);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
    });

    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') {
      setReadMap({});
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      setReadMap(raw ? (JSON.parse(raw) as Record<string, boolean>) : {});
    } catch {
      setReadMap({});
    }
  }, [storageKey]);

  const persistReadMap = useCallback((next: Record<string, boolean>) => {
    setReadMap(next);
    if (!storageKey || typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }, [storageKey]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [ticketEventsRes, projectsRes, agentsRes, inboxRes, requestsRes] = await Promise.all([
        supabase.from('mc_ticket_events').select('id, event_type, created_at, ticket_id, after').order('created_at', { ascending: false }).limit(12),
        supabase.from('mc_projects').select('id, key, name, created_at').order('created_at', { ascending: false }).limit(12),
        supabase.from('mc_agents').select('id, display_name, updated_at, created_at').order('updated_at', { ascending: false }).limit(12),
        supabase.from('mc_inbox').select('id, kind, subject, body, created_at').order('created_at', { ascending: false }).limit(12),
        supabase.from('mc_requests').select('id, request_type, status, created_at, result').order('created_at', { ascending: false }).limit(12)
      ]);

      const next: AppNotification[] = [];

      for (const item of ticketEventsRes.data ?? []) {
        const rawType = String((item as { event_type?: string }).event_type ?? 'updated').toLowerCase();
        const createdAt = safeIso((item as { created_at?: string }).created_at);
        const ticketId = (item as { ticket_id?: string | null }).ticket_id;
        const isCreated = rawType.includes('created');
        const isStopped = rawType.includes('stopped') || rawType.includes('halted');

        next.push({
          id: `ticket-event:${(item as { id: string }).id}`,
          type: 'ticket',
          title: isStopped ? 'VM stopped' : isCreated ? 'New ticket created' : 'Ticket activity updated',
          body: `Event type: ${rawType}${ticketId ? ` · ticket ${ticketId}` : ''}`,
          created_at: createdAt,
          href: ticketId ? `/tickets/${ticketId}` : '/tickets',
          severity: isStopped ? 'critical' : 'info'
        });
      }

      for (const item of projectsRes.data ?? []) {
        const project = item as { id: string; key?: string | null; name?: string | null; created_at?: string };
        next.push({
          id: `project:${project.id}`,
          type: 'project',
          title: 'New project created',
          body: `${project.key ?? 'PRJ'} · ${project.name ?? 'Untitled project'}`,
          created_at: safeIso(project.created_at),
          href: `/projects/${project.id}`,
          severity: 'info'
        });
      }

      for (const item of agentsRes.data ?? []) {
        const agent = item as { id: string; display_name?: string | null; updated_at?: string; created_at?: string };
        const createdAt = safeIso(agent.updated_at ?? agent.created_at);
        next.push({
          id: `agent:${agent.id}:${createdAt}`,
          type: 'agent',
          title: 'New agent activity',
          body: `${agent.display_name ?? 'Unknown agent'} profile changed`,
          created_at: createdAt,
          severity: 'info'
        });
      }

      for (const item of inboxRes.data ?? []) {
        const inbox = item as { id: string; kind?: string | null; subject?: string | null; body?: string | null; created_at?: string };
        next.push({
          id: `inbox:${inbox.id}`,
          type: 'inbox',
          title: inbox.subject?.trim() || 'New inbox item',
          body: inbox.body?.slice(0, 140) || (inbox.kind ? `Type: ${inbox.kind}` : undefined),
          created_at: safeIso(inbox.created_at),
          href: '/project-files',
          severity: 'info'
        });
      }

      for (const item of requestsRes.data ?? []) {
        const request = item as { id: string; request_type?: string | null; status?: string | null; created_at?: string };
        const failed = ['failed', 'error'].includes(String(request.status ?? '').toLowerCase());
        next.push({
          id: `request:${request.id}`,
          type: 'request',
          title: failed ? 'Request failed' : 'Request update',
          body: `${request.request_type ?? 'unknown request'} is ${request.status ?? 'unknown'}`,
          created_at: safeIso(request.created_at),
          href: '/dashboard',
          severity: failed ? 'critical' : 'warning'
        });
      }

      setNotifications(sortByNewest(next).slice(0, 25));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void refresh();
    refreshTimer.current = window.setInterval(() => {
      void refresh();
    }, POLL_MS);

    return () => {
      if (refreshTimer.current) {
        window.clearInterval(refreshTimer.current);
      }
    };
  }, [refresh]);

  const unreadCount = useMemo(() => notifications.filter((item) => !readMap[item.id]).length, [notifications, readMap]);

  const markAllAsRead = useCallback(() => {
    const next = { ...readMap };
    for (const item of notifications) {
      next[item.id] = true;
    }
    persistReadMap(next);
  }, [notifications, persistReadMap, readMap]);

  return {
    notifications,
    unreadCount,
    markAllAsRead,
    isLoading,
    error,
    refresh
  };
}
