'use client';

import { createClient } from '@/lib/supabase/client';

type TicketStatus = 'done' | 'ongoing' | 'not_done';

type TicketLike = {
  status: string | null;
  due_at?: string | null;
};

type AgentRecord = {
  id: string;
  display_name: string | null;
  slug: string | null;
  department: string | null;
  role: string | null;
  is_active: boolean | null;
};

type AgentAuthMapRecord = {
  agent_id: string;
  auth_user_id: string;
};

type AgentEventRecord = {
  actor_agent_id: string | null;
  event_type: string | null;
  created_at: string | null;
};

const CLOSED = new Set(['done', 'closed', 'resolved']);
const ONGOING = new Set(['ongoing', 'in_progress', 'waiting', 'blocked', 'next']);
const ACTIVE_PROJECTS = new Set(['active', 'open', 'in_progress']);
const EVENT_LABELS: Record<string, string> = {
  ticket_created: 'Created a ticket',
  ticket_updated: 'Updated a ticket',
  comment_added: 'Posted a comment',
  status_changed: 'Moved ticket status'
};

function isNoAccessError(message: string) {
  const lowered = message.toLowerCase();
  return lowered.includes('permission denied') || lowered.includes('row-level security') || lowered.includes('not allowed');
}

function normalizeTicketStatus(status: string | null): TicketStatus {
  const value = (status ?? '').toLowerCase();
  if (CLOSED.has(value)) return 'done';
  if (ONGOING.has(value)) return 'ongoing';
  return 'not_done';
}

function toFirstName(displayName: string | null, slug: string | null) {
  const source = displayName?.trim() || slug?.trim() || 'Unknown';
  const firstByDash = source.split('-')[0]?.trim();
  if (firstByDash) return firstByDash;
  return source.split(' ')[0]?.trim() || source;
}

function formatLastSignIn(iso: string | null | undefined) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function mapEventLabel(eventType: string | null) {
  if (!eventType) return 'No recent activity';
  return EVENT_LABELS[eventType] ?? 'Updated mission data';
}

export function countTicketsByStatus(data?: TicketLike[] | null) {
  return (data ?? []).reduce(
    (acc, ticket) => {
      const status = normalizeTicketStatus(ticket.status);
      acc[status] += 1;
      return acc;
    },
    { done: 0, ongoing: 0, not_done: 0 } satisfies Record<TicketStatus, number>
  );
}

export async function fetchTicketCounts() {
  const supabase = createClient();
  const { data, error } = await supabase.from('mc_tickets').select('status');
  if (error) throw error;

  return countTicketsByStatus(data);
}

export async function fetchDashboardMetrics() {
  const supabase = createClient();
  const [projectsRes, ticketsRes] = await Promise.all([
    supabase.from('mc_projects').select('id, status'),
    supabase.from('mc_tickets').select('id, status, due_at')
  ]);

  if (projectsRes.error && isNoAccessError(projectsRes.error.message)) return { noAccess: true as const };
  if (ticketsRes.error && isNoAccessError(ticketsRes.error.message)) return { noAccess: true as const };
  if (projectsRes.error) throw projectsRes.error;
  if (ticketsRes.error) throw ticketsRes.error;

  const projects = projectsRes.data ?? [];
  const tickets = (ticketsRes.data ?? []) as TicketLike[];
  const now = new Date();
  const dueCutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const ticketCounts = countTicketsByStatus(tickets);

  return {
    noAccess: false as const,
    totalProjects: projects.length,
    activeProjects: projects.filter((project) => ACTIVE_PROJECTS.has((project.status ?? '').toLowerCase())).length,
    totalTickets: tickets.length,
    openTickets: ticketCounts.not_done + ticketCounts.ongoing,
    doneTickets: ticketCounts.done,
    dueSoon: tickets.filter((ticket) => {
      if (!ticket.due_at) return false;
      const due = new Date(ticket.due_at);
      return due >= now && due <= dueCutoff && normalizeTicketStatus(ticket.status) !== 'done';
    }).length
  };
}

export async function fetchAgentsOverview() {
  const supabase = createClient();

  const [agentsRes, mapRes, eventsRes, authUsersRes] = await Promise.all([
    (supabase as any).from('mc_agents').select('id, display_name, slug, department, role, is_active').order('display_name', { ascending: true }),
    (supabase as any).from('mc_agent_auth_map').select('agent_id, auth_user_id'),
    (supabase as any).from('mc_ticket_events').select('actor_agent_id, event_type, created_at').order('created_at', { ascending: false }),
    (supabase as any).schema('auth').from('users').select('id, last_sign_in_at')
  ]);

  if (agentsRes.error) throw agentsRes.error;
  if (mapRes.error && !isNoAccessError(mapRes.error.message)) throw mapRes.error;
  if (eventsRes.error && !isNoAccessError(eventsRes.error.message)) throw eventsRes.error;

  const agents = (agentsRes.data ?? []) as AgentRecord[];
  const maps = (mapRes.data ?? []) as AgentAuthMapRecord[];
  const events = (eventsRes.data ?? []) as AgentEventRecord[];

  const authLastSignInByUserId = new Map<string, string | null>();
  if (!authUsersRes.error) {
    for (const authUser of (authUsersRes.data ?? []) as Array<{ id: string; last_sign_in_at: string | null }>) {
      authLastSignInByUserId.set(authUser.id, authUser.last_sign_in_at);
    }
  }

  const authUserIdByAgentId = new Map<string, string>();
  for (const map of maps) {
    authUserIdByAgentId.set(map.agent_id, map.auth_user_id);
  }

  const latestEventByAgentId = new Map<string, AgentEventRecord>();
  for (const event of events) {
    if (!event.actor_agent_id || latestEventByAgentId.has(event.actor_agent_id)) continue;
    latestEventByAgentId.set(event.actor_agent_id, event);
  }

  return agents.map((agent) => {
    const authUserId = authUserIdByAgentId.get(agent.id);
    const latestEvent = latestEventByAgentId.get(agent.id);

    return {
      id: agent.id,
      name: toFirstName(agent.display_name, agent.slug),
      lastSignInLabel: formatLastSignIn(authUserId ? authLastSignInByUserId.get(authUserId) : null),
      lastActivityLabel: latestEvent ? mapEventLabel(latestEvent.event_type) : 'No recent activity',
      department: agent.department,
      role: agent.role,
      isActive: Boolean(agent.is_active)
    };
  });
}
