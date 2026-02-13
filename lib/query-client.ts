'use client';

import { createClient } from '@/lib/supabase/client';

type TicketStatus = 'done' | 'ongoing' | 'not_done';

type TicketLike = {
  status: TicketStatus | null;
};

export function countTicketsByStatus(data?: TicketLike[] | null) {
  return (data ?? []).reduce(
    (acc, ticket) => {
      const status = (ticket.status ?? 'not_done') as TicketStatus;
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

export async function fetchRecentActivity() {
  const supabase = createClient();
  const [commentsRes, requestsRes] = await Promise.all([
    supabase.from('mc_comments').select('id, body, created_at').order('created_at', { ascending: false }).limit(5),
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
