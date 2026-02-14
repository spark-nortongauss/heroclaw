'use server';

import { revalidatePath } from 'next/cache';

import { createSupabaseServerClient } from '@/lib/supabase/server';

type CreateCommentInput = {
  ticketId: string;
  body: string;
  mentionsAgentIds: string[];
};

type TicketPatchInput = {
  ticketId: string;
  patch: {
    status?: string | null;
    priority?: string | null;
    title?: string;
    description?: string | null;
    owner_agent_id?: string | null;
    reporter_agent_id?: string | null;
    due_at?: string | null;
    labels?: string[];
  };
};

export async function updateTicketFields({ ticketId, patch }: TicketPatchInput) {
  const supabase = createSupabaseServerClient();

  const allowedPatch: Record<string, unknown> = {};
  const allowedKeys = [
    'status',
    'priority',
    'title',
    'description',
    'owner_agent_id',
    'reporter_agent_id',
    'due_at',
    'labels'
  ] as const;

  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      if (key === 'title') {
        const value = (patch[key] ?? '').toString().trim();
        if (!value) {
          return { error: 'Title cannot be empty.' };
        }
        allowedPatch[key] = value;
        continue;
      }

      if (key === 'labels') {
        const value = patch[key];
        allowedPatch[key] = Array.isArray(value) ? value : [];
        continue;
      }

      allowedPatch[key] = patch[key] ?? null;
    }
  }

  if (Object.keys(allowedPatch).length === 0) {
    return { error: 'No valid fields to update.' };
  }

  const { error } = await supabase.from('mc_tickets').update(allowedPatch).eq('id', ticketId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/tickets/${ticketId}`);
  return { error: null };
}

export async function updateComment({
  ticketId,
  commentId,
  body
}: {
  ticketId: string;
  commentId: string;
  body: string;
}) {
  const trimmedBody = body.trim();

  if (!trimmedBody) {
    return { error: 'Comment cannot be empty.' };
  }

  const supabase = createSupabaseServerClient();

  const { error } = await (supabase as any)
    .from('mc_ticket_comments')
    .update({ body: trimmedBody })
    .eq('id', commentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/tickets/${ticketId}`);
  return { error: null };
}

export async function createTicketComment({ ticketId, body, mentionsAgentIds }: CreateCommentInput) {
  const trimmedBody = body.trim();

  if (!trimmedBody) {
    return { error: 'Comment cannot be empty.' };
  }

  const supabase = createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  const email = (userData.user?.email ?? '').toLowerCase();

  if (!userData.user || !email) {
    return { error: 'Unable to resolve authenticated user.' };
  }

  const isMissingColumnError = (error: { message?: string } | null) =>
    (error?.message ?? '').toLowerCase().includes('column') &&
    (error?.message ?? '').toLowerCase().includes('does not exist');

  let { data: agentData, error: agentError } = await (supabase as any)
    .from('mc_agents')
    .select('id')
    .eq('email', email)
    .single();

  if (agentError && isMissingColumnError(agentError)) {
    const fallbackLookup = await (supabase as any).from('mc_agents').select('id').eq('auth_email', email).single();
    agentData = fallbackLookup.data;
    agentError = fallbackLookup.error;

    if (agentError && isMissingColumnError(agentError)) {
      return { error: 'Cannot map this user to an agent. mc_agents needs an email/user mapping column.' };
    }
  }

  if (agentError || !agentData?.id) {
    return { error: agentError?.message ?? 'Unable to resolve agent for authenticated user.' };
  }

  const { error } = await (supabase as any).from('mc_ticket_comments').insert({
    ticket_id: ticketId,
    author_agent_id: agentData.id,
    body: trimmedBody,
    mentions_agent_ids: mentionsAgentIds
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/tickets/${ticketId}`);
  return { error: null };
}
