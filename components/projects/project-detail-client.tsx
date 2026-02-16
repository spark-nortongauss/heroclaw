'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { formatDate, formatDateTime } from '@/lib/mission-control';

type TicketRow = {
  id: string;
  ticket_no: number | null;
  title: string;
  status: string | null;
  priority: string | null;
  owner_name: string | null;
  updated_at: string | null;
  due_at: string | null;
};

export default function ProjectDetailClient({
  projectId,
  tickets,
  initialError
}: {
  projectId: string;
  tickets: TicketRow[];
  initialError?: string | null;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'tickets'>('tickets');
  const [openCreate, setOpenCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isPending, startTransition] = useTransition();

  const sortedTickets = useMemo(
    () => [...tickets].sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()),
    [tickets]
  );

  const onCreate = () => {
    setError(null);
    if (!title.trim()) {
      setError('Ticket title is required.');
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData.user?.id;

      let reporterAgentId: string | null = null;
      if (authUserId) {
        const { data: mapData } = await supabase
          .from('mc_agent_auth_map')
          .select('agent_id')
          .eq('auth_user_id', authUserId)
          .maybeSingle();
        reporterAgentId = mapData?.agent_id ?? null;
      }

      const { data: inserted, error: insertError } = await (supabase as any)
        .from('mc_tickets')
        .insert({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || null,
          priority,
          status: 'inbox',
          reporter_agent_id: reporterAgentId
        })
        .select('id, status')
        .single();

      if (insertError) {
        setError(`Ticket creation failed: ${insertError.message}`);
        return;
      }

      if (inserted?.id) {
        await (supabase as any).from('mc_ticket_events').insert({
          ticket_id: inserted.id,
          actor_agent_id: reporterAgentId,
          event_type: 'ticket_created',
          before: null,
          after: { status: inserted.status, project_id: projectId }
        });
      }

      setOpenCreate(false);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b">
        <button className={`px-3 py-2 text-sm ${activeTab === 'overview' ? 'border-b-2 border-[#172B4D] font-semibold' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`px-3 py-2 text-sm ${activeTab === 'tickets' ? 'border-b-2 border-[#172B4D] font-semibold' : ''}`} onClick={() => setActiveTab('tickets')}>Tickets</button>
      </div>

      {activeTab === 'overview' ? (
        <p className="text-sm text-muted-foreground">Use the tickets tab to track project execution and GTD workflow states.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Project Tickets</h2>
            <Button onClick={() => setOpenCreate(true)}>Create ticket</Button>
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Ticket No</TableHeaderCell>
                <TableHeaderCell>Title</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Priority</TableHeaderCell>
                <TableHeaderCell>Owner</TableHeaderCell>
                <TableHeaderCell>Updated At</TableHeaderCell>
                <TableHeaderCell>Due At</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedTickets.map((ticket) => (
                <TableRow key={ticket.id} className="cursor-pointer" onClick={() => router.push(`/tickets/${ticket.id}`)}>
                  <TableCell>{ticket.ticket_no ?? '—'}</TableCell>
                  <TableCell className="font-medium">{ticket.title}</TableCell>
                  <TableCell><Badge variant="default">{ticket.status ?? 'inbox'}</Badge></TableCell>
                  <TableCell>{ticket.priority ?? 'medium'}</TableCell>
                  <TableCell>{ticket.owner_name ?? 'Unassigned'}</TableCell>
                  <TableCell>{formatDateTime(ticket.updated_at)}</TableCell>
                  <TableCell>{formatDate(ticket.due_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl space-y-3 rounded-xl border bg-white p-4 shadow-lg">
            <h3 className="text-lg font-semibold">Create ticket</h3>
            <Input placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <Textarea placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} rows={5} />
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpenCreate(false)}>Cancel</Button>
              <Button onClick={onCreate} disabled={isPending}>{isPending ? 'Creating…' : 'Create'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
