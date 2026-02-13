'use client';

import { createClient } from '@/lib/supabase/client';

export async function fetchTicketCounts() {
  const supabase = createClient();
  const { data, error } = await supabase.from('mc_tickets').select('status');
  if (error) throw error;

  return (data ?? []).reduce(
    (acc, ticket) => {
      acc[ticket.status] += 1;
      return acc;
    },
    { done: 0, ongoing: 0, not_done: 0 } as Record<'done' | 'ongoing' | 'not_done', number>
  );
}

export async function fetchRecentActivity() {
  const supabase = createClient();
  const [commentsRes, requestsRes] = await Promise.all([
    supabase.from('mc_comments').select('id, body, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('mc_requests').select('id, request_type, status, created_at').order('created_at', { ascending: false }).limit(5)
  ]);

  if (commentsRes.error) throw commentsRes.error;
  if (requestsRes.error) throw requestsRes.error;

  return {
    comments: commentsRes.data ?? [],
    requests: requestsRes.data ?? []
  };
}
