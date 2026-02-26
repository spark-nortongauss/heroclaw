'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import type { Json } from '@/lib/supabase/types';

type AgentOption = {
  id: string;
  display_name: string | null;
};

type ParentTicketOption = {
  id: string;
  title: string;
  ticket_no: number | null;
  status: string | null;
};

type ProjectOption = {
  id: string;
  key: string;
  name: string;
};

type CreateTicketModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (
    createdTicket?: {
      id: string;
      ticket_no: number | null;
      title: string;
      status: string;
      priority: string | null;
      owner_agent_id: string | null;
      reporter_agent_id: string | null;
      updated_at: string | null;
      owner_name: string | null;
      reporter_name: string | null;
    }
  ) => Promise<void> | void;
};

const NONE_VALUE = '__none__';
const STATUS_OPTIONS = ['open', 'in_progress', 'done'] as const;
const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const;
const CLOSED_STATUSES = new Set(['done', 'closed', 'resolved']);
const ONGOING_STATUSES = new Set(['in_progress', 'waiting', 'blocked', 'next', 'ongoing']);

function statusTone(status: string | null) {
  const normalized = (status ?? '').toLowerCase();
  if (CLOSED_STATUSES.has(normalized)) return 'bg-red-500';
  if (ONGOING_STATUSES.has(normalized)) return 'bg-yellow-400';
  return 'bg-green-500';
}


function relationName(value: { display_name: string | null } | { display_name: string | null }[] | null | undefined) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.display_name ?? null;
  return value.display_name ?? null;
}

export default function CreateTicketModal({ open, onClose, onCreated }: CreateTicketModalProps) {
  const { notify } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('open');
  const [priority, setPriority] = useState<(typeof PRIORITY_OPTIONS)[number]>('medium');
  const [ownerAgentId, setOwnerAgentId] = useState(NONE_VALUE);
  const [dueAt, setDueAt] = useState('');
  const [labels, setLabels] = useState('');
  const [parentTicketId, setParentTicketId] = useState<string | null>(null);
  const [parentQuery, setParentQuery] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectQuery, setProjectQuery] = useState('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [contextText, setContextText] = useState('');
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [parentSuggestions, setParentSuggestions] = useState<ParentTicketOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [reporterAgentId, setReporterAgentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingParents, setIsSearchingParents] = useState(false);
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

    void supabase
      .from('mc_projects')
      .select('id, key, name')
      .order('name', { ascending: true })
      .then(({ data, error: projectError }) => {
        if (projectError) {
          setError(projectError.message);
          return;
        }
        setProjects((data ?? []) as ProjectOption[]);
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
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    const query = parentQuery.trim();

    const timer = window.setTimeout(async () => {
      setIsSearchingParents(true);
      let request = supabase.from('mc_tickets').select('id, title, ticket_no, status').order('updated_at', { ascending: false }).limit(8);
      const escaped = query.replaceAll('%', '\\%').replaceAll('_', '\\_');

      if (query) {
        const numeric = query.match(/\d+/)?.[0];
        if (numeric) {
          request = request.or(`ticket_no.eq.${numeric},title.ilike.%${escaped}%`);
        } else {
          request = request.ilike('title', `%${escaped}%`);
        }
      }

      const { data, error: ticketError } = await request;
      setIsSearchingParents(false);

      if (ticketError) {
        setError(ticketError.message);
        return;
      }

      setParentSuggestions((data ?? []) as ParentTicketOption[]);
    }, 280);

    return () => window.clearTimeout(timer);
  }, [open, parentQuery]);

  const showSuggestions = useMemo(() => parentQuery.trim().length > 0, [parentQuery]);
  const filteredProjects = useMemo(() => {
    const query = projectQuery.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) => project.name.toLowerCase().includes(query) || project.key.toLowerCase().includes(query));
  }, [projectQuery, projects]);
  const selectedProjectLabel = useMemo(() => {
    if (!projectId) return 'No project';
    const selected = projects.find((project) => project.id === projectId);
    return selected ? `${selected.key} · ${selected.name}` : 'Unknown project';
  }, [projectId, projects]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus('open');
    setPriority('medium');
    setOwnerAgentId(NONE_VALUE);
    setDueAt('');
    setLabels('');
    setParentTicketId(null);
    setParentQuery('');
    setProjectId(null);
    setProjectQuery('');
    setIsProjectDropdownOpen(false);
    setContextText('');
    setError(null);
    setIsSubmitting(false);
    setParentSuggestions([]);
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

    if (!reporterAgentId) {
      setError('Could not resolve your agent identity (mc_agent_auth_map). Please contact an administrator.');
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

    const { data: insertedTicket, error: insertError } = await (supabase as any)
      .from('mc_tickets')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        owner_agent_id: ownerAgentId === NONE_VALUE ? null : ownerAgentId,
        reporter_agent_id: reporterAgentId,
        due_at: dueAt ? new Date(`${dueAt}T00:00:00.000Z`).toISOString() : null,
        labels: normalizedLabels.length > 0 ? normalizedLabels : null,
        project_id: projectId,
        parent_ticket_id: parentTicketId,
        context
      })
      .select('id, ticket_no, title, status, priority, owner_agent_id, reporter_agent_id, updated_at, owner_agent:mc_agents!mc_tickets_owner_agent_id_fkey(display_name), reporter_agent:mc_agents!mc_tickets_reporter_agent_id_fkey(display_name)')
      .single();

    setIsSubmitting(false);

    if (insertError) {
      if (insertError.message.toLowerCase().includes('row-level security')) {
        setError('Ticket creation is blocked by RLS policy on mc_tickets. Please update Supabase insert policy for your role/user.');
      } else {
        setError(insertError.message);
      }
      return;
    }

    notify(`Ticket MC-${insertedTicket?.ticket_no ?? '—'} created.`);
    await onCreated(
      insertedTicket
        ? {
            id: insertedTicket.id,
            ticket_no: insertedTicket.ticket_no,
            title: insertedTicket.title,
            status: insertedTicket.status,
            priority: insertedTicket.priority,
            owner_agent_id: insertedTicket.owner_agent_id,
            reporter_agent_id: insertedTicket.reporter_agent_id,
            updated_at: insertedTicket.updated_at,
            owner_name: relationName(insertedTicket.owner_agent),
            reporter_name: relationName(insertedTicket.reporter_agent)
          }
        : undefined
    );
    handleClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-4 shadow-xl">
        <h2 className="text-lg font-semibold text-[#172B4D] dark:text-foreground">Create Ticket</h2>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#172B4D] dark:text-foreground">Title *</label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#172B4D] dark:text-foreground">Description</label>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#172B4D] dark:text-foreground">Status</label>
              <Select value={status} onValueChange={(value) => setStatus(value as (typeof STATUS_OPTIONS)[number])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#172B4D] dark:text-foreground">Priority</label>
              <Select value={priority} onValueChange={(value) => setPriority(value as (typeof PRIORITY_OPTIONS)[number])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITY_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#172B4D] dark:text-foreground">Assignee</label>
              <Select value={ownerAgentId} onValueChange={setOwnerAgentId}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Unassigned</SelectItem>
                  {agents.map((agent) => <SelectItem key={agent.id} value={agent.id}>{agent.display_name ?? 'Unnamed Agent'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#172B4D] dark:text-foreground">Due date</label>
              <Input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
            </div>
          </div>

          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-[#172B4D] dark:text-foreground">Project</label>
            <button
              type="button"
              className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-left text-sm"
              onClick={() => setIsProjectDropdownOpen((current) => !current)}
            >
              {selectedProjectLabel}
            </button>

            {isProjectDropdownOpen && (
              <div className="absolute z-20 mt-1 w-full rounded-md border bg-card p-2 shadow-lg">
                <Input
                  value={projectQuery}
                  onChange={(event) => setProjectQuery(event.target.value)}
                  placeholder="Search projects"
                  className="mb-2"
                />
                <div className="max-h-52 overflow-auto">
                  <button
                    type="button"
                    className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setProjectId(null);
                      setProjectQuery('');
                      setIsProjectDropdownOpen(false);
                    }}
                  >
                    No project
                  </button>
                  {filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setProjectId(project.id);
                        setProjectQuery('');
                        setIsProjectDropdownOpen(false);
                      }}
                    >
                      {project.key} · {project.name}
                    </button>
                  ))}
                  {filteredProjects.length === 0 && <p className="px-2 py-1.5 text-xs text-mutedForeground">No projects found.</p>}
                </div>
              </div>
            )}
            <p className="mt-1 text-xs text-mutedForeground">Optional. Assign this ticket to a project.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#172B4D] dark:text-foreground">Labels (comma-separated)</label>
            <Input value={labels} onChange={(event) => setLabels(event.target.value)} placeholder="bug, backend" />
          </div>

          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-[#172B4D] dark:text-foreground">Parent ticket</label>
            <Input value={parentQuery} onChange={(event) => {
              setParentQuery(event.target.value);
              setParentTicketId(null);
            }} placeholder="Type ticket # or title" />
            {showSuggestions && (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-card shadow-lg">
                {isSearchingParents && <p className="px-3 py-2 text-xs text-mutedForeground">Searching…</p>}
                {!isSearchingParents && parentSuggestions.length === 0 && <p className="px-3 py-2 text-xs text-mutedForeground">No matches found.</p>}
                {!isSearchingParents && parentSuggestions.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setParentTicketId(ticket.id);
                      setParentQuery(`MC-${ticket.ticket_no ?? '-'} — ${ticket.title}`);
                    }}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${statusTone(ticket.status)}`} />
                    <span>{`MC-${ticket.ticket_no ?? '-'} — ${ticket.title}`}</span>
                  </button>
                ))}
              </div>
            )}
            {parentTicketId && <p className="mt-1 text-xs text-mutedForeground">Parent ticket selected.</p>}
            {!parentTicketId && <p className="mt-1 text-xs text-mutedForeground">Leave blank for no parent.</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#172B4D] dark:text-foreground">Context (JSON)</label>
            <Textarea value={contextText} onChange={(event) => setContextText(event.target.value)} rows={3} placeholder='{"source":"tickets_page"}' />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" className="bg-[#D9FF35] text-[#172B4D] hover:bg-[#cde934]" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
