'use client';

import { createClient } from '@/lib/supabase/client';

type TicketStatus = 'done' | 'ongoing' | 'not_done';

type TicketLike = {
  status: string | null;
  due_at?: string | null;
};

const CLOSED = new Set(['done', 'closed', 'resolved']);
const ONGOING = new Set(['ongoing', 'in_progress', 'waiting', 'blocked', 'next']);
const ACTIVE_PROJECTS = new Set(['active', 'open', 'in_progress']);

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

export async function fetchRecentActivity() {
  const supabase = createClient();
  const [commentsRes, requestsRes] = await Promise.all([
    supabase.from('mc_ticket_comments').select('id, body, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('mc_requests').select('id, request_type, status, created_at').order('created_at', { ascending: false }).limit(5)
  ]);

  if (commentsRes.error) throw commentsRes.error;
  if (requestsRes.error) throw requestsRes.error;

  type RecentComment = { id: string; body: string; created_at: string };
  type RecentRequest = { id: string; request_type: string; status: string; created_at: string };

  return {
    comments: (commentsRes.data as RecentComment[] | null) ?? [],
    requests: (requestsRes.data as RecentRequest[] | null) ?? []
  };
}
