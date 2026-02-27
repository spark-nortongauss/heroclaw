import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';

import TicketDetailClient from './TicketDetailClient';
import TicketArtifactsPanel from './TicketArtifactsPanel';

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
  project_id: string | null;
  owner: AgentRef | AgentRef[] | null;
  reporter: AgentRef | AgentRef[] | null;
};

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  author: AgentRef | AgentRef[] | null;
};

type ArtifactRow = {
  id: string;
  name: string | null;
  filename: string | null;
  kind: string | null;
  created_at: string | null;
  url: string | null;
  object_path: string | null;
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
      project_id,
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
        <p className="text-sm text-mutedForeground">
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

  const [{ data: commentsData }, { data: agentsData }, { data: artifactsData, error: artifactsError }] = await Promise.all([
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
    (supabase as any).from('mc_agents').select('*').order('display_name', { ascending: true }),
    (supabase as any)
      .from('mc_artifacts')
      .select('id, name, filename, kind, created_at, url, object_path')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: false })
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

  const artifacts = (artifactsData ?? []) as ArtifactRow[];

  return (
    <main className="space-y-5 bg-card p-4 sm:p-6">
      <Link className="inline-flex text-xs font-medium uppercase tracking-wide text-mutedForeground hover:text-foreground" href="/tickets">
        ← Back to tickets
      </Link>

      <section className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Ticket metadata</p>
        <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <p>Ticket No: {ticket.ticket_no ?? '—'}</p>
          <p>Status: {ticket.status ?? '—'}</p>
          <p>Priority: {ticket.priority ?? '—'}</p>
          <p>
            Project:{' '}
            {ticket.project_id ? (
              <Link href={`/projects/${ticket.project_id}`} className="underline">
                Open project
              </Link>
            ) : (
              '—'
            )}
          </p>
          <p>Created: {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '—'}</p>
          <p>Updated: {ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : '—'}</p>
        </div>
      </section>

      <TicketDetailClient agents={agents} comments={comments} ticket={ticket} />

      <TicketArtifactsPanel artifacts={artifacts} artifactsErrorMessage={artifactsError?.message ?? null} />
    </main>
  );
}
