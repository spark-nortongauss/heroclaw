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

  const { error } = await supabase.from('mc_tickets').update(allowedPatch as never).eq('id', ticketId);

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

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const authUserId = userData.user?.id;

  if (userError || !authUserId) {
    return { error: userError?.message ?? 'Unable to resolve authenticated user.' };
  }

  let { data: agentData, error: agentError } = await (supabase as any)
    .from('mc_agents')
    .select('id')
    .eq('auth_user_id', authUserId)
    .limit(1)
    .maybeSingle();

  if (!agentData?.id) {
    const { data: humanAgentData } = await (supabase as any)
      .from('mc_agents')
      .select('id')
      .or("slug.eq.tayroni-human,role.eq.human,display_name.ilike.%(Human)%")
      .limit(1)
      .maybeSingle();

    if (humanAgentData?.id) {
      await (supabase as any)
        .from('mc_agents')
        .update({ auth_user_id: authUserId })
        .eq('id', humanAgentData.id)
        .is('auth_user_id', null);

      const { data: mappedAgentData, error: mappedAgentError } = await (supabase as any)
        .from('mc_agents')
        .select('id')
        .eq('auth_user_id', authUserId)
        .limit(1)
        .maybeSingle();

      agentData = mappedAgentData;
      agentError = mappedAgentError;
    }
  }

  if (agentError || !agentData?.id) {
    return {
      error:
        agentError?.message ??
        'Unable to resolve agent for authenticated user. Set auth_user_id on a mc_agents row for this user.'
    };
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
