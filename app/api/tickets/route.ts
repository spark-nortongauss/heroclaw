import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';

type CreateTicketPayload = {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  owner_agent_id?: string | null;
  due_at?: string | null;
  labels?: string[] | null;
  parent_ticket_id?: string | null;
  project_id?: string | null;
  context?: Json | null;
};

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.id) {
    return NextResponse.json({ ok: false, error: userError?.message ?? 'Unable to resolve authenticated user.' }, { status: 401 });
  }

  const { data: agentMap, error: mapError } = await supabase
    .from('mc_agent_auth_map')
    .select('agent_id')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle();

  if (mapError) {
    return NextResponse.json({ ok: false, error: mapError.message }, { status: 400 });
  }

  if (!agentMap?.agent_id) {
    return NextResponse.json(
      { ok: false, error: 'No agent mapping found for the current user. Please contact an administrator.' },
      { status: 400 }
    );
  }

  const body = (await request.json()) as CreateTicketPayload;

  if (!body?.title?.trim()) {
    return NextResponse.json({ ok: false, error: 'Title is required.' }, { status: 400 });
  }

  const { error: insertError } = await supabase.from('mc_tickets').insert({
    title: body.title.trim(),
    description: body.description ?? null,
    status: body.status ?? 'open',
    priority: body.priority ?? 'medium',
    owner_agent_id: body.owner_agent_id ?? null,
    reporter_agent_id: agentMap.agent_id,
    due_at: body.due_at ?? null,
    labels: body.labels ?? null,
    parent_ticket_id: body.parent_ticket_id ?? null,
    project_id: body.project_id ?? null,
    context: body.context ?? null
  });

  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
