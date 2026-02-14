import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: { id: string };
};

type AgentRef = {
  id: string;
  name: string | null;
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

const asAgent = (value: AgentRef | AgentRef[] | null | undefined): AgentRef | null => {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
};

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
      owner:mc_agents!mc_tickets_owner_agent_id_fkey(id, name),
      reporter:mc_agents!mc_tickets_reporter_agent_id_fkey(id, name)
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

  const owner = asAgent(ticket.owner);
  const reporter = asAgent(ticket.reporter);

  return (
    <main className="space-y-6 p-6">
      <div>
        <Link className="text-sm underline" href="/tickets">
          ← Back to tickets
        </Link>
      </div>

      <section>
        <h1 className="text-2xl font-semibold">{ticket.title}</h1>
        <p className="text-sm text-gray-600">Ticket #{ticket.ticket_no ?? '-'}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <DetailCard label="Status" value={ticket.status} />
        <DetailCard label="Priority" value={ticket.priority} />
        <DetailCard label="Owner" value={owner?.name ?? 'Unassigned'} />
        <DetailCard label="Reporter" value={reporter?.name ?? 'Unknown'} />
        <DetailCard label="Due" value={formatDateTime(ticket.due_at)} />
        <DetailCard label="Created" value={formatDateTime(ticket.created_at)} />
        <DetailCard label="Updated" value={formatDateTime(ticket.updated_at)} />
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-semibold uppercase text-gray-500">Description</h2>
        <p className="mt-2 whitespace-pre-wrap">{ticket.description ?? '(No description provided)'}</p>
      </section>

      {ticket.labels?.length ? (
        <section className="flex flex-wrap gap-2">
          {ticket.labels.map((label) => (
            <span key={label} className="rounded bg-gray-200 px-2 py-1 text-xs">
              {label}
            </span>
          ))}
        </section>
      ) : null}
    </main>
  );
}

function DetailCard({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-sm font-semibold uppercase text-gray-500">{label}</h2>
      <p className="mt-2 text-sm">{value && value.length > 0 ? value : '-'}</p>
    </div>
  );
}
