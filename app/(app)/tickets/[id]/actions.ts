'use server';

import { revalidatePath } from 'next/cache';

import { createSupabaseServerClient } from '@/lib/supabase/server';

type CreateCommentInput = {
  ticketId: string;
  body: string;
  mentionsAgentIds: string[];
};

export async function createTicketComment({ ticketId, body, mentionsAgentIds }: CreateCommentInput) {
  const trimmedBody = body.trim();

  if (!trimmedBody) {
    return { error: 'Comment cannot be empty.' };
  }

  const supabase = createSupabaseServerClient();

  const { error } = await (supabase as any).from('mc_ticket_comments').insert({
    ticket_id: ticketId,
    author_agent_id: null,
    body: trimmedBody,
    mentions_agent_ids: mentionsAgentIds
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/tickets/${ticketId}`);
  return { error: null };
}
