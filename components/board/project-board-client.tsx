'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { formatDate, GTD_COLUMNS, normalizeTicketStatus } from '@/lib/mission-control';

type ProjectOption = { id: string; key: string | null; name: string; status: string | null };
type TicketCard = {
  id: string;
  ticket_no: number | null;
  title: string;
  status: string | null;
  priority: string | null;
  due_at: string | null;
  labels: string[] | null;
  owner_name: string | null;
};

export default function ProjectBoardClient({ projects, initialProjectId, initialTickets }: { projects: ProjectOption[]; initialProjectId: string | null; initialTickets: TicketCard[] }) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(initialProjectId ?? projects[0]?.id ?? '');
  const [tickets, setTickets] = useState(initialTickets);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, TicketCard[]>();
    GTD_COLUMNS.forEach((column) => map.set(column.key, []));
    for (const ticket of tickets) {
      map.get(normalizeTicketStatus(ticket.status))?.push(ticket);
    }
    return map;
  }, [tickets]);

  const onProjectChange = (value: string) => {
    setProjectId(value);
    router.push(`/board?projectId=${value}`);
  };

  const moveCard = async (ticketId: string, toStatus: string) => {
    const ticket = tickets.find((item) => item.id === ticketId);
    if (!ticket) return;
    const beforeStatus = normalizeTicketStatus(ticket.status);
    if (beforeStatus === toStatus) return;

    const optimistic = tickets.map((item) => item.id === ticketId ? { ...item, status: toStatus } : item);
    setTickets(optimistic);
    setError(null);

    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    let actorAgentId: string | null = null;
    if (authData.user?.id) {
      const { data: mapData } = await supabase.from('mc_agent_auth_map').select('agent_id').eq('auth_user_id', authData.user.id).maybeSingle();
      actorAgentId = mapData?.agent_id ?? null;
    }

    const { error: updateError } = await (supabase as any)
      .from('mc_tickets')
      .update({ status: toStatus, updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    if (updateError) {
      setTickets(tickets);
      setError(`Unable to move ticket due to permission or policy constraints: ${updateError.message}`);
      return;
    }

    await (supabase as any).from('mc_ticket_events').insert({
      ticket_id: ticketId,
      actor_agent_id: actorAgentId,
      event_type: 'status_changed',
      before: { status: beforeStatus },
      after: { status: toStatus }
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-medium">Project space</p>
        <Select value={projectId} onValueChange={onProjectChange}>
          <SelectTrigger className="max-w-md"><SelectValue placeholder="Select project" /></SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>{project.key ?? '—'} · {project.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-3 lg:grid-cols-5">
        {GTD_COLUMNS.map((column) => (
          <section
            key={column.key}
            className="rounded-xl border bg-slate-50 p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (draggingId) void moveCard(draggingId, column.key);
              setDraggingId(null);
            }}
          >
            <h2 className="mb-3 text-sm font-semibold">{column.label}</h2>
            <div className="space-y-2">
              {(grouped.get(column.key) ?? []).map((ticket) => (
                <article
                  key={ticket.id}
                  draggable
                  onDragStart={() => setDraggingId(ticket.id)}
                  onClick={() => router.push(`/tickets/${ticket.id}`)}
                  className="cursor-pointer rounded-lg border bg-white p-3 shadow-sm"
                >
                  <p className="text-xs text-muted-foreground">MC-{ticket.ticket_no ?? '—'}</p>
                  <p className="mt-1 text-sm font-medium">{ticket.title}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="default">{ticket.priority ?? 'medium'}</Badge>
                    {ticket.owner_name && <Badge variant="not_done">{ticket.owner_name}</Badge>}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Due: {formatDate(ticket.due_at)}</p>
                  {!!ticket.labels?.length && <p className="mt-1 text-xs text-muted-foreground">{ticket.labels.join(', ')}</p>}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
