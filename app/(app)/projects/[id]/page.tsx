import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/mission-control';
import ProjectDetailClient from '@/components/projects/project-detail-client';

export const dynamic = 'force-dynamic';

type ArtifactRow = {
  id: string;
  ticket_id: string | null;
  name: string | null;
  filename: string | null;
  kind: string | null;
  created_at: string | null;
  url: string | null;
  object_path: string | null;
  bytes: number | null;
  mime_type: string | null;
};

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();

  const { data: project, error } = await (supabase as any)
    .from('mc_projects')
    .select('id, key, name, status, description, created_at, owner_agent:mc_agents!mc_projects_owner_agent_id_fkey(display_name)')
    .eq('id', params.id)
    .maybeSingle();

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Failed to load project: {error.message}</div>;
  }

  if (!project) notFound();

  const { data: ticketsData, error: ticketError } = await (supabase as any)
    .from('mc_tickets')
    .select('id, ticket_no, title, status, priority, due_at, updated_at, owner_agent:mc_agents!mc_tickets_owner_agent_id_fkey(display_name)')
    .eq('project_id', params.id)
    .order('updated_at', { ascending: false });

  const tickets = (ticketsData ?? []).map((ticket: any) => ({
    id: ticket.id,
    ticket_no: ticket.ticket_no,
    title: ticket.title,
    status: ticket.status,
    priority: ticket.priority,
    owner_name: ticket.owner_agent?.display_name ?? null,
    updated_at: ticket.updated_at,
    due_at: ticket.due_at
  }));

  const ticketIds = tickets.map((ticket) => ticket.id);
  let artifacts: Array<ArtifactRow & { ticket_title: string; ticket_no: number | null }> = [];

  if (ticketIds.length > 0) {
    const { data: artifactsData } = await (supabase as any)
      .from('mc_artifacts')
      .select('id, ticket_id, name, filename, kind, created_at, url, object_path, bytes, mime_type')
      .in('ticket_id', ticketIds)
      .order('created_at', { ascending: false });

    const titleMap = new Map(tickets.map((ticket) => [ticket.id, ticket.title]));
    const noMap = new Map(tickets.map((ticket) => [ticket.id, ticket.ticket_no]));

    artifacts = ((artifactsData ?? []) as ArtifactRow[]).map((artifact) => ({
      ...artifact,
      ticket_title: titleMap.get(artifact.ticket_id ?? '') ?? 'Unknown ticket',
      ticket_no: noMap.get(artifact.ticket_id ?? '') ?? null
    }));
  }

  return (
    <div className="space-y-5">
      <Link href="/projects" className="text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground">← Back to projects</Link>
      <header className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="h1 font-[var(--font-heading)]">{project.key} · {project.name}</h1>
          <Badge className="uppercase" variant="default">{project.status ?? 'unknown'}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Owner: {project.owner_agent?.display_name ?? 'Unassigned'} · Created {formatDateTime(project.created_at)}</p>
        <p className="mt-3 text-sm">{project.description ?? 'No description available.'}</p>
      </header>

      <ProjectDetailClient projectId={params.id} tickets={tickets} artifacts={artifacts} initialError={ticketError?.message ?? null} />
    </div>
  );
}
