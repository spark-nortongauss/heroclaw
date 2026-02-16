import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/mission-control';
import ProjectDetailClient from '@/components/projects/project-detail-client';

export const dynamic = 'force-dynamic';

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

  return (
    <div className="space-y-5">
      <Link href="/projects" className="text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground">← Back to projects</Link>
      <header className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="h1 font-[var(--font-heading)]">{project.key} · {project.name}</h1>
          <Badge className="uppercase" variant="default">{project.status ?? 'unknown'}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Owner: {project.owner_agent?.display_name ?? 'Unassigned'} · Created {formatDateTime(project.created_at)}</p>
        <p className="mt-3 text-sm">{project.description ?? 'No description available.'}</p>
      </header>

      <ProjectDetailClient projectId={params.id} tickets={tickets} initialError={ticketError?.message ?? null} />
    </div>
  );
}
