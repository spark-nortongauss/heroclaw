'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Json } from '@/lib/supabase/types';

type AgentOption = {
  id: string;
  display_name: string | null;
};

type ParentTicketOption = {
  id: string;
  title: string;
  ticket_no: number | null;
};

type CreateTicketModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
};

const NONE_VALUE = '__none__';
const STATUS_OPTIONS = ['open', 'in_progress', 'done'] as const;
const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const;

export default function CreateTicketModal({ open, onClose, onCreated }: CreateTicketModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('open');
  const [priority, setPriority] = useState<(typeof PRIORITY_OPTIONS)[number]>('medium');
  const [ownerAgentId, setOwnerAgentId] = useState(NONE_VALUE);
  const [dueAt, setDueAt] = useState('');
  const [labels, setLabels] = useState('');
  const [parentTicketId, setParentTicketId] = useState(NONE_VALUE);
  const [parentQuery, setParentQuery] = useState('');
  const [contextText, setContextText] = useState('');
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [openTickets, setOpenTickets] = useState<ParentTicketOption[]>([]);
  const [reporterAgentId, setReporterAgentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const supabase = createClient();

    void supabase
      .from('mc_agents')
      .select('id, display_name')
      .eq('is_active', true)
      .order('display_name', { ascending: true })
      .then(({ data, error: agentError }) => {
        if (agentError) {
          setError(agentError.message);
          return;
        }
        setAgents((data ?? []) as AgentOption[]);
      });

    void supabase.auth.getUser().then(async ({ data: authData, error: authError }) => {
      if (authError) {
        setError(authError.message);
        return;
      }

      if (!authData.user?.id) {
        setReporterAgentId(null);
        return;
      }

      const { data: mapData, error: mapError } = await supabase
        .from('mc_agent_auth_map')
        .select('agent_id')
        .eq('auth_user_id', authData.user.id)
        .maybeSingle();

      if (mapError) {
        setError(mapError.message);
        return;
      }

      setReporterAgentId(mapData?.agent_id ?? null);
    });

    void supabase
      .from('mc_tickets')
      .select('id, title, ticket_no, status')
      .not('status', 'in', '(done,closed)')
      .order('updated_at', { ascending: false })
      .then(({ data, error: ticketError }) => {
        if (ticketError) {
          setError(ticketError.message);
          return;
        }

        setOpenTickets(((data ?? []) as Array<ParentTicketOption & { status: string | null }>).map(({ id, title, ticket_no }) => ({ id, title, ticket_no })));
      });
  }, [open]);

  const filteredParentTickets = useMemo(() => {
    const query = parentQuery.trim().toLowerCase();
    if (!query) return openTickets;

    return openTickets.filter((ticket) => {
      const titleMatch = ticket.title.toLowerCase().includes(query);
      const keyMatch = `MC-${ticket.ticket_no ?? ''}`.toLowerCase().includes(query);
      return titleMatch || keyMatch;
    });
  }, [openTickets, parentQuery]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus('open');
    setPriority('medium');
    setOwnerAgentId(NONE_VALUE);
    setDueAt('');
    setLabels('');
    setParentTicketId(NONE_VALUE);
    setParentQuery('');
    setContextText('');
    setError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    let context: Json | null = null;
    if (contextText.trim().length > 0) {
      try {
        context = JSON.parse(contextText) as Json;
      } catch {
        setError('Context must be valid JSON.');
        return;
      }
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const normalizedLabels = labels
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const { error: insertError } = await supabase.from('mc_tickets').insert({
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      owner_agent_id: ownerAgentId === NONE_VALUE ? null : ownerAgentId,
      reporter_agent_id: reporterAgentId,
      due_at: dueAt ? new Date(`${dueAt}T00:00:00.000Z`).toISOString() : null,
      labels: normalizedLabels.length > 0 ? normalizedLabels : null,
      parent_ticket_id: parentTicketId === NONE_VALUE ? null : parentTicketId,
      context
    });

    setIsSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    await onCreated();
    handleClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-white p-4 shadow-xl">
        <h2 className="text-lg font-semibold text-[#172B4D]">Create Ticket</h2>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#172B4D]">Title *</label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#172B4D]">Description</label>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#172B4D]">Status</label>
              <Select value={status} onValueChange={(value) => setStatus(value as (typeof STATUS_OPTIONS)[number])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#172B4D]">Priority</label>
              <Select value={priority} onValueChange={(value) => setPriority(value as (typeof PRIORITY_OPTIONS)[number])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#172B4D]">Assignee</label>
              <Select value={ownerAgentId} onValueChange={setOwnerAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Unassigned</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.display_name ?? 'Unnamed Agent'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#172B4D]">Due date</label>
              <Input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#172B4D]">Labels (comma-separated)</label>
            <Input value={labels} onChange={(event) => setLabels(event.target.value)} placeholder="bug, backend" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#172B4D]">Parent ticket</label>
            <Input value={parentQuery} onChange={(event) => setParentQuery(event.target.value)} placeholder="Search by title or MC-#" className="mb-2" />
            <Select value={parentTicketId} onValueChange={setParentTicketId}>
              <SelectTrigger>
                <SelectValue placeholder="No parent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>No parent</SelectItem>
                {filteredParentTickets.map((ticket) => (
                  <SelectItem key={ticket.id} value={ticket.id}>
                    MC-{ticket.ticket_no ?? '-'} · {ticket.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#172B4D]">Context (JSON)</label>
            <Textarea
              value={contextText}
              onChange={(event) => setContextText(event.target.value)}
              rows={3}
              placeholder='{"source":"tickets_page"}'
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#D9FF35] text-[#172B4D] hover:bg-[#cde934]" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
