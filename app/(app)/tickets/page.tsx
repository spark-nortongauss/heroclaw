'use client';

import { useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TicketTable } from '@/components/ui/ticket-table';
import type { TicketRowItem } from '@/components/ui/ticket-row';

async function fetchTickets() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('mc_tickets')
    .select(
      'id, title, status, owner_agent_id, reporter_agent_id, updated_at, owner:mc_agents!mc_tickets_owner_agent_id_fkey(id, display_name), reporter:mc_agents!mc_tickets_reporter_agent_id_fkey(id, display_name)'
    )
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

const relativeTime = (dateValue: string) => {
  const timeMs = new Date(dateValue).getTime();
  const diffMinutes = Math.round((timeMs - Date.now()) / 60000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, 'day');
};

const choosePriority = (status: string): TicketRowItem['priority'] => {
  if (status === 'ongoing') return 'high';
  if (status === 'not_done') return 'medium';
  return 'low';
};

export default function TicketsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [assignee, setAssignee] = useState('all');
  const [priority, setPriority] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const attachmentCountCache = useRef<Map<string, number>>(new Map());
  const [attachmentCounts, setAttachmentCounts] = useState<Record<string, number>>({});
  const [loadingAttachmentIds, setLoadingAttachmentIds] = useState<Record<string, boolean>>({});
  const { data = [], isLoading } = useQuery({ queryKey: ['tickets'], queryFn: fetchTickets });

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
    return data.map((ticket, index) => ({
      id: ticket.id,
      issueKey: `MC-${String(index + 101)}`,
      summary: ticket.title,
      status: ticket.status,
      assignee: ticket.owner?.display_name ?? ticket.owner_agent_id ?? 'Unassigned',
      reporter: ticket.reporter?.display_name ?? ticket.reporter_agent_id ?? 'System',
      parent: null,
      updatedLabel: relativeTime(ticket.updated_at),
      priority: choosePriority(ticket.status)
    }));
  }, [data]);

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

  return (
    <div className="page-transition space-y-4">
      <div>
        <h1 className="h1 font-[var(--font-heading)]">Tickets</h1>
        <p className="text-body">Track tickets and monitor status transitions.</p>
        <form action={signOut} className="mt-2">
          <Button type="submit" variant="secondary" size="sm">
            Sign out
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <Input
            placeholder="Search issues"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xl"
            aria-label="Search issues"
          />
          <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-3">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="not_done">To Do</SelectItem>
                <SelectItem value="ongoing">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger aria-label="Filter by assignee">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                {assignees.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item === 'all' ? 'All assignees' : item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger aria-label="Filter by priority">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="highest">Highest</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="bg-[#D9FF35] text-[#172B4D] hover:bg-[#cde934]">
            <Plus className="mr-1 h-4 w-4" />
            Create Ticket
          </Button>
        </div>
      </div>

      <TicketTable
        tickets={filtered}
        loading={isLoading}
        selectedId={selectedId}
        onSelect={setSelectedId}
        attachmentCounts={attachmentCounts}
        loadingAttachmentIds={loadingAttachmentIds}
        onAttachmentHover={loadAttachmentCount}
        onAttachmentClick={(id) => {
          setSelectedId(id);
          router.push(`/tickets/${id}#attachments`);
        }}
      />
    </div>
  );
}
