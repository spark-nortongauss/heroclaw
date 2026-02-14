import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';

import TicketDetailClient from './TicketDetailClient';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: { id: string };
};

type AgentRef = {
  id: string;
  name?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  agent_name?: string | null;
  username?: string | null;
  email?: string | null;
  department?: string | null;
};

type TicketDetail = {
  id: string;
  ticket_no: number | null;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  owner_agent_id: string | null;
  reporter_agent_id: string | null;
  due_at: string | null;
  labels: string[] | null;
  context: Json | null;
  created_at: string | null;
  updated_at: string | null;
  closed_at: string | null;
  parent_ticket_id: string | null;
  owner: AgentRef | AgentRef[] | null;
  reporter: AgentRef | AgentRef[] | null;
};

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  author: AgentRef | AgentRef[] | null;
};

const asAgent = (value: AgentRef | AgentRef[] | null | undefined): AgentRef | null => {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
};

function agentLabel(agent: AgentRef | null | undefined) {
  return (
    agent?.name ??
    agent?.display_name ??
    agent?.full_name ??
    agent?.agent_name ??
    agent?.username ??
    agent?.email ??
    agent?.id ??
    null
  );
}

export default async function TicketDetailPage({ params }: PageProps) {
  const supabase = createSupabaseServerClient();

  const { data: ticket, error } = await supabase
    .from('mc_tickets')
    .select(
      `
      id,
      ticket_no,
      title,
      description,
      status,
      priority,
      owner_agent_id,
      reporter_agent_id,
      due_at,
      labels,
      context,
      created_at,
      updated_at,
      closed_at,
      parent_ticket_id,
      owner:mc_agents!mc_tickets_owner_agent_id_fkey(id, display_name),
      reporter:mc_agents!mc_tickets_reporter_agent_id_fkey(id, display_name)
    `
    )
    .eq('id', params.id)
    .single<TicketDetail>();

  if (error) {
    return (
      <main className="space-y-4 p-6">
        <h1 className="text-xl font-semibold text-red-600">Failed to load ticket details.</h1>
        <p className="text-sm text-gray-700">
          Supabase error: <span className="font-mono">{error.message}</span>
        </p>
        <Link className="inline-block text-sm underline" href="/tickets">
          Back to tickets
        </Link>
      </main>
    );
  }

  if (!ticket) {
    notFound();
  }

  const [{ data: commentsData }, { data: agentsData }] = await Promise.all([
    (supabase as any)
      .from('mc_ticket_comments')
      .select(
        `
      id,
      body,
      created_at,
      author:mc_agents!mc_ticket_comments_author_agent_id_fkey(*)
    `
      )
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true }),
    (supabase as any).from('mc_agents').select('*').order('name', { ascending: true })
  ]);

  const comments = ((commentsData ?? []) as CommentRow[]).map((comment) => {
    const author = asAgent(comment.author);

    return {
      id: comment.id,
      body: comment.body,
      created_at: comment.created_at,
      author: author
        ? {
            id: author.id,
            label: agentLabel(author) ?? 'Unknown',
            department: author.department ?? null
          }
        : null
    };
  });

  const agents = ((agentsData ?? []) as AgentRef[])
    .map((agent) => ({
      id: agent.id,
      label: agentLabel(agent),
      department: agent.department ?? null
    }))
    .filter((agent): agent is { id: string; label: string; department: string | null } => Boolean(agent.label));

  return (
    <main className="space-y-5 bg-white p-4 sm:p-6">
      <Link className="inline-flex text-xs font-medium uppercase tracking-wide text-[#808080] hover:text-[#111111]" href="/tickets">
        ← Back to tickets
      </Link>

      <TicketDetailClient agents={agents} comments={comments} ticket={ticket} />
    </main>
  );
}
