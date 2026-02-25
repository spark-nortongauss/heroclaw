'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logSupabaseError } from '@/lib/supabase/log-error';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TicketTable } from '@/components/ui/ticket-table';
import CreateTicketModal from './CreateTicketModal';
import type { TicketRowItem } from '@/components/ui/ticket-row';
import { useLocale } from '@/components/providers/locale-provider';

type TicketWithAgents = {
  id: string;
  ticket_no: number | null;
  title: string;
  status: string;
  owner_agent_id: string | null;
  reporter_agent_id: string | null;
  updated_at: string | null;
  owner_name: string | null;
  reporter_name: string | null;
};

function relationDisplayName(value: { display_name: string | null } | { display_name: string | null }[] | null | undefined) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.display_name ?? null;
  return value.display_name ?? null;
}

async function fetchTickets() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('mc_tickets')
    .select('id, ticket_no, title, status, owner_agent_id, reporter_agent_id, updated_at, owner_agent:mc_agents!mc_tickets_owner_agent_id_fkey(display_name), reporter_agent:mc_agents!mc_tickets_reporter_agent_id_fkey(display_name)')
    .order('updated_at', { ascending: false });

  if (error) {
    logSupabaseError('mc_tickets', error, 'tickets.fetch');
    return [];
  }

  return ((data ?? []) as Array<
    Omit<TicketWithAgents, 'owner_name' | 'reporter_name'> & {
      owner_agent: { display_name: string | null } | { display_name: string | null }[] | null;
      reporter_agent: { display_name: string | null } | { display_name: string | null }[] | null;
    }
  >).map((ticket) => ({
    id: ticket.id,
    ticket_no: ticket.ticket_no,
    title: ticket.title,
    status: ticket.status,
    owner_agent_id: ticket.owner_agent_id,
    reporter_agent_id: ticket.reporter_agent_id,
    updated_at: ticket.updated_at,
    owner_name: relationDisplayName(ticket.owner_agent),
    reporter_name: relationDisplayName(ticket.reporter_agent)
  }));
}

const relativeTime = (dateValue: string | null) => {
  if (!dateValue) return 'Unknown';
  const timeMs = new Date(dateValue).getTime();
  if (Number.isNaN(timeMs)) return 'Unknown';

  const diffMinutes = Math.round((timeMs - Date.now()) / 60000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, 'day');
};

const normalizeStatus = (status: string): TicketRowItem['status'] => {
  if (status === 'ongoing' || status === 'done' || status === 'not_done') return status;
  if (['in_progress', 'waiting', 'blocked', 'next'].includes(status)) return 'ongoing';
  if (['closed', 'resolved'].includes(status)) return 'done';
  return 'not_done';
};

const choosePriority = (status: string): TicketRowItem['priority'] => {
  if (status === 'ongoing') return 'high';
  if (status === 'not_done') return 'medium';
  return 'low';
};

export default function TicketsPage() {
  const router = useRouter();
  const { notify } = useToast();
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [assignee, setAssignee] = useState('all');
  const [priority, setPriority] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [ticketsData, setTicketsData] = useState<TicketWithAgents[]>([]);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const attachmentCountCache = useRef<Map<string, number>>(new Map());
  const [attachmentCounts, setAttachmentCounts] = useState<Record<string, number>>({});
  const [loadingAttachmentIds, setLoadingAttachmentIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        logSupabaseError('auth.sessions', error, 'tickets.getSession');
      }
      setIsAuthenticated(Boolean(data.session));
      setIsSessionReady(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['tickets'],
    queryFn: fetchTickets,
    enabled: isSessionReady && isAuthenticated
  });

  useEffect(() => {
    if (!data) return;
    setTicketsData(data);
  }, [data]);

  useEffect(() => {
    if (isAuthenticated) return;
    setTicketsData([]);
  }, [isAuthenticated]);

  const loadAttachmentCount = async (ticketId: string) => {
    if (attachmentCountCache.current.has(ticketId) || loadingAttachmentIds[ticketId]) return;

    setLoadingAttachmentIds((prev) => ({ ...prev, [ticketId]: true }));
    const supabase = createClient();
    const { data: files, error } = await supabase.storage.from('ticket-attachments').list(`tickets/${ticketId}`, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' }
    });

    const count = error ? 0 : (files ?? []).filter((file) => file.name && !file.name.startsWith('.emptyFolderPlaceholder')).length;
    attachmentCountCache.current.set(ticketId, count);
    setAttachmentCounts((prev) => ({ ...prev, [ticketId]: count }));
    setLoadingAttachmentIds((prev) => {
      const next = { ...prev };
      delete next[ticketId];
      return next;
    });
  };

  const ticketRows = useMemo<TicketRowItem[]>(() => {
    return ticketsData.map((ticket) => ({
      id: ticket.id,
      issueKey: `MC-${ticket.ticket_no ?? '—'}`,
      summary: ticket.title,
      status: normalizeStatus(ticket.status),
      assignee: ticket.owner_name?.trim() || 'Unassigned',
      reporter: ticket.reporter_name?.trim() || 'Unknown',
      parent: null,
      updatedLabel: relativeTime(ticket.updated_at),
      priority: choosePriority(ticket.status)
    }));
  }, [ticketsData]);

  const filtered = useMemo(
    () =>
      ticketRows.filter((ticket) => {
        const matchesSearch = ticket.summary.toLowerCase().includes(search.toLowerCase()) || ticket.issueKey.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = status === 'all' || ticket.status === status;
        const matchesAssignee = assignee === 'all' || ticket.assignee === assignee;
        const matchesPriority = priority === 'all' || ticket.priority === priority;
        return matchesSearch && matchesStatus && matchesAssignee && matchesPriority;
      }),
    [assignee, priority, search, status, ticketRows]
  );

  const assignees = useMemo(() => ['all', ...new Set(ticketRows.map((ticket) => ticket.assignee))], [ticketRows]);
  const allVisibleSelected = filtered.length > 0 && filtered.every((ticket) => selectedIds.includes(ticket.id));

  const toggleSelectAllVisible = (checked: boolean) => {
    const visibleIds = filtered.map((ticket) => ticket.id);
    if (checked) {
      setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])]);
      return;
    }
    setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
  };

  const toggleSelectedTicket = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      return;
    }
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    setIsDeleting(true);
    const deletingIds = [...selectedIds];
    const supabase = createClient();
    const { error } = await supabase.from('mc_tickets').delete().in('id', deletingIds);

    if (error) {
      logSupabaseError('mc_tickets', error, 'tickets.delete');
      setIsDeleting(false);
      notify(`${t('toast.deleteFailed')} ${error.message}`, 'error');
      return;
    }

    const refreshed = await queryClient.fetchQuery({ queryKey: ['tickets'], queryFn: fetchTickets });
    setIsDeleting(false);

    const deletedSet = new Set(deletingIds);
    const stillPresent = refreshed.filter((ticket) => deletedSet.has(ticket.id)).map((ticket) => ticket.id);
    if (stillPresent.length > 0) {
      notify(`${t('toast.deleteFailed')} ${stillPresent.length}/${deletingIds.length} blocked by policy.`, 'error');
      return;
    }

    setTicketsData(refreshed);
    setSelectedIds([]);
    setConfirmOpen(false);
    notify(t('toast.deleted'));
    await queryClient.invalidateQueries({ queryKey: ['tickets'] });
    router.refresh();
  };

  if (!isSessionReady) {
    return (
      <div className="page-transition space-y-4">
        <div>
          <h1 className="h1 font-[var(--font-heading)]">{t('tickets.title')}</h1>
          <p className="text-body">{t('tickets.subtitle')}</p>
        </div>
        <TicketTable
          tickets={[]}
          loading
          selectedId={null}
          onSelect={() => {}}
          selectedIds={[]}
          allVisibleSelected={false}
          onToggleSelectAll={() => {}}
          onToggleTicket={() => {}}
          attachmentCounts={{}}
          loadingAttachmentIds={{}}
          onAttachmentHover={() => {}}
          emptyText={t('tickets.empty')}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page-transition space-y-4">
        <div>
          <h1 className="h1 font-[var(--font-heading)]">{t('tickets.title')}</h1>
          <p className="text-body">Please sign in to view tickets.</p>
        </div>
        <Button onClick={() => router.push('/login')}>Go to login</Button>
      </div>
    );
  }

  return (
    <div className="page-transition space-y-4">
      <div>
        <h1 className="h1 font-[var(--font-heading)]">{t('tickets.title')}</h1>
        <p className="text-body">{t('tickets.subtitle')}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <Input placeholder={t('tickets.searchIssues')} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xl" aria-label={t('tickets.searchIssues')} />
          <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-3">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label={t('tickets.filterStatus')}><SelectValue placeholder={t('common.status')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tickets.allStatuses')}</SelectItem>
                <SelectItem value="not_done">To Do</SelectItem>
                <SelectItem value="ongoing">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger aria-label={t('tickets.filterAssignee')}><SelectValue placeholder={t('common.assignee')} /></SelectTrigger>
              <SelectContent>
                {assignees.map((item) => (
                  <SelectItem key={item} value={item}>{item === 'all' ? t('tickets.allAssignees') : item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger aria-label={t('tickets.filterPriority')}><SelectValue placeholder={t('common.priority')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tickets.allPriorities')}</SelectItem>
                <SelectItem value="highest">Highest</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />{t('tickets.createTicket')}
          </Button>
          <Button variant="secondary" disabled={selectedIds.length === 0 || isDeleting} onClick={() => setConfirmOpen(true)}>
            {isDeleting ? 'Deleting…' : t('common.delete')}
          </Button>
        </div>
      </div>

      <TicketTable
        tickets={filtered}
        loading={isLoading || isFetching}
        selectedId={selectedId}
        onSelect={setSelectedId}
        selectedIds={selectedIds}
        allVisibleSelected={allVisibleSelected}
        onToggleSelectAll={toggleSelectAllVisible}
        onToggleTicket={toggleSelectedTicket}
        attachmentCounts={attachmentCounts}
        loadingAttachmentIds={loadingAttachmentIds}
        onAttachmentHover={loadAttachmentCount}
        emptyText={t('tickets.empty')}
        onAttachmentClick={(id) => {
          setSelectedId(id);
          router.push(`/tickets/${id}#attachments`);
        }}
      />

      <CreateTicketModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={async (createdTicket) => {
          if (createdTicket) {
            setTicketsData((prev) => [createdTicket, ...prev]);
          }
          await queryClient.invalidateQueries({ queryKey: ['tickets'] });
        }}
      />

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg space-y-3 rounded-xl border bg-card p-4 shadow-lg">
            <h3 className="text-lg font-semibold">{t('tickets.deleteSelectedTitle')}</h3>
            <p className="text-sm text-muted-foreground">{t('tickets.deleteSelectedDescription', { count: selectedIds.length })}</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={isDeleting}>
                {t('common.cancel')}
              </Button>
              <Button variant="secondary" className="text-destructive" onClick={() => void handleDeleteSelected()} disabled={isDeleting}>
                {isDeleting ? 'Deleting…' : t('tickets.deleteButton')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
