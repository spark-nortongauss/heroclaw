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

const formatDateTime = (value: string | null) => {
  if (!value) return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

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

  const owner = asAgent(ticket.owner);
  const reporter = asAgent(ticket.reporter);

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
    <main className="space-y-5 p-4 sm:p-6">
      <Link className="inline-flex text-xs font-medium uppercase tracking-wide text-gray-500 hover:text-gray-800" href="/tickets">
        ← Back to tickets
      </Link>

      <header className="rounded-xl border bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Ticket #{ticket.ticket_no ?? '-'}</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">{ticket.title}</h1>
          <button
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700"
            type="button"
          >
            Actions
          </button>
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_320px]">
        <div className="space-y-5">
          <section className="rounded-xl border bg-white p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Description</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-800">
              {ticket.description ?? '(No description provided)'}
            </p>
          </section>

          <TicketDetailClient agents={agents} comments={comments} ticketId={ticket.id} />
        </div>

        <aside className="h-fit rounded-xl border bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Details</h2>
          <dl className="mt-3 divide-y">
            <DetailRow label="Status" value={ticket.status} />
            <DetailRow label="Priority" value={ticket.priority} />
            <DetailRow label="Assignee" value={owner?.display_name ?? ticket.owner_agent_id ?? 'Unassigned'} />
            <DetailRow label="Reporter" value={reporter?.display_name ?? ticket.reporter_agent_id ?? 'Unknown'} />
            <DetailRow label="Due date" value={formatDateTime(ticket.due_at)} />
            <DetailRow label="Created" value={formatDateTime(ticket.created_at)} />
            <DetailRow label="Updated" value={formatDateTime(ticket.updated_at)} />
            <DetailRow label="Labels" value={ticket.labels?.length ? ticket.labels.join(', ') : '-'} />
          </dl>
        </aside>
      </section>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 py-2.5">
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value && value.length > 0 ? value : '-'}</dd>
    </div>
  );
}
