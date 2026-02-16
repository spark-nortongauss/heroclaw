import CreateProjectButton from '@/components/projects/create-project-button';
import ProjectsTableClient from '@/components/projects/projects-table-client';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ProjectRow = {
  id: string;
  key: string | null;
  name: string;
  status: string | null;
  created_at: string | null;
  owner_agent_id: string | null;
  owner_agent: { display_name: string | null } | null;
};

export default async function ProjectsPage() {
  const supabase = createSupabaseServerClient();
  const { data: projectsData, error } = await (supabase as any)
    .from('mc_projects')
    .select('id, key, name, status, created_at, owner_agent_id, owner_agent:mc_agents!mc_projects_owner_agent_id_fkey(display_name)')
    .order('created_at', { ascending: false });

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Failed to load projects: {error.message}</div>;
  }

  const projects = (projectsData ?? []) as ProjectRow[];
  const ids = projects.map((project) => project.id);
  const ticketCountMap = new Map<string, number>();

  if (ids.length > 0) {
    const { data: ticketRows } = await (supabase as any)
      .from('mc_tickets')
      .select('project_id')
      .in('project_id', ids);

    for (const row of ticketRows ?? []) {
      const projectId = row.project_id as string;
      ticketCountMap.set(projectId, (ticketCountMap.get(projectId) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="h1 font-[var(--font-heading)]">Projects</h1>
        <p className="text-body">Track project portfolio and ticket workload visibility.</p>
      </div>
      <ProjectsTableClient
        createAction={<CreateProjectButton />}
        projects={projects.map((project) => ({
          id: project.id,
          key: project.key ?? '—',
          name: project.name,
          status: project.status,
          owner: project.owner_agent?.display_name ?? null,
          created_at: project.created_at,
          ticket_count: ticketCountMap.get(project.id) ?? 0
        }))}
      />
    </div>
  );
}
