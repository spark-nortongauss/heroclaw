import ProjectBoardClient from '@/components/board/project-board-client';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function BoardPage({ searchParams }: { searchParams: { projectId?: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: projectsData, error } = await (supabase as any)
    .from('mc_projects')
    .select('id, key, name, status')
    .order('status', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Failed to load board projects: {error.message}</div>;
  }

  const projects = (projectsData ?? []) as Array<{ id: string; key: string | null; name: string; status: string | null }>;
  const projectId = searchParams.projectId && projects.some((item) => item.id === searchParams.projectId) ? searchParams.projectId : projects[0]?.id;

  const { data: ticketsData } = projectId
    ? await (supabase as any)
        .from('mc_tickets')
        .select('id, ticket_no, title, status, priority, due_at, labels, owner_agent:mc_agents!mc_tickets_owner_agent_id_fkey(display_name)')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })
    : { data: [] };

  const tickets = (ticketsData ?? []).map((ticket: any) => ({
    id: ticket.id,
    ticket_no: ticket.ticket_no,
    title: ticket.title,
    status: ticket.status,
    priority: ticket.priority,
    due_at: ticket.due_at,
    labels: ticket.labels,
    owner_name: ticket.owner_agent?.display_name ?? null
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="h1 font-[var(--font-heading)]">Board</h1>
        <p className="text-body">GTD kanban board scoped to a project space.</p>
      </div>
      <ProjectBoardClient projects={projects} initialProjectId={projectId ?? null} initialTickets={tickets} />
    </div>
  );
}
