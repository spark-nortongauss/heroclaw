'use server';

import { revalidatePath } from 'next/cache';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';

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
    context?: Json;
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
    'labels',
    'context'
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

  const { data: previousTicket } = await (supabase as any)
    .from('mc_tickets')
    .select('id, status, priority, title, description, owner_agent_id, reporter_agent_id, due_at, labels, context')
    .eq('id', ticketId)
    .maybeSingle();

  const { data: authData } = await supabase.auth.getUser();
  const authUserId = authData.user?.id;
  let actorAgentId: string | null = null;
  if (authUserId) {
    const { data: agentMapData } = await (supabase as any)
      .from('mc_agent_auth_map')
      .select('agent_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    actorAgentId = agentMapData?.agent_id ?? null;
  }

  const { error } = await supabase.from('mc_tickets').update(allowedPatch as never).eq('id', ticketId);

  if (error) {
    return { error: error.message };
  }

  await (supabase as any).from('mc_ticket_events').insert({
    ticket_id: ticketId,
    actor_agent_id: actorAgentId,
    event_type: 'ticket_updated',
    before: previousTicket,
    after: allowedPatch
  });

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

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const authUserId = userData.user?.id;

  if (userError || !authUserId) {
    return { error: userError?.message ?? 'Unable to resolve authenticated user.' };
  }

  const { data: agentData, error: agentError } = await (supabase as any)
    .from('mc_agent_auth_map')
    .select('agent_id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (agentError || !agentData?.agent_id) {
    return {
      error:
        agentError?.message ??
        'Unable to resolve agent for authenticated user in mc_agent_auth_map.'
    };
  }

  const { error } = await (supabase as any).from('mc_ticket_comments').insert({
    ticket_id: ticketId,
    author_agent_id: agentData.agent_id,
    body: trimmedBody,
    mentions_agent_ids: mentionsAgentIds
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/tickets/${ticketId}`);
  return { error: null };
}
