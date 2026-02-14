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

  if (userError || !userData.user) {
    return { error: userError?.message ?? 'Unable to resolve authenticated user.' };
  }

  const { data: agentColumns, error: agentColumnsError } = await (supabase as any)
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'mc_agents');

  if (agentColumnsError) {
    return { error: agentColumnsError.message };
  }

  const availableColumns = new Set((agentColumns ?? []).map((column: { column_name: string }) => column.column_name));

  const agentLookup = availableColumns.has('user_id')
    ? { column: 'user_id', value: userData.user.id }
    : availableColumns.has('auth_user_id')
      ? { column: 'auth_user_id', value: userData.user.id }
      : availableColumns.has('supabase_user_id')
        ? { column: 'supabase_user_id', value: userData.user.id }
        : availableColumns.has('email') && userData.user.email
          ? { column: 'email', value: userData.user.email }
          : null;

  if (!agentLookup) {
    return { error: 'Unable to find a supported mc_agents mapping column.' };
  }

  const { data: agentData, error: agentError } = await (supabase as any)
    .from('mc_agents')
    .select('id')
    .eq(agentLookup.column, agentLookup.value)
    .single();

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
