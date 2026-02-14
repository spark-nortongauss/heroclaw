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

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { error: userError?.message ?? 'Unable to resolve authenticated user.' };
  }

  let { data: agentData, error: agentError } = await (supabase as any)
    .from('mc_agents')
    .select('id')
    .eq('auth_user_id', userData.user.id)
    .single();

  if (agentError || !agentData?.id) {
    const { data: humanAgent, error: humanAgentError } = await (supabase as any)
      .from('mc_agents')
      .select('id')
      .or("role.eq.human,display_name.ilike.%(Human)%,display_name.ilike.%Tayroni%")
      .limit(1)
      .maybeSingle();

    if (humanAgentError) {
      return { error: humanAgentError.message };
    }

    if (humanAgent?.id) {
      const { error: attachError } = await (supabase as any)
        .from('mc_agents')
        .update({ auth_user_id: userData.user.id })
        .eq('id', humanAgent.id)
        .is('auth_user_id', null);

      if (attachError) {
        return { error: attachError.message };
      }

      const agentLookup = await (supabase as any)
        .from('mc_agents')
        .select('id')
        .eq('auth_user_id', userData.user.id)
        .single();

      agentData = agentLookup.data;
      agentError = agentLookup.error;
    }
  }

  if (agentError || !agentData?.id) {
    return {
      error:
        agentError?.message ??
        'Unable to resolve agent for authenticated user. Please create or mark exactly one human agent row.'
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
