'use client';

import { ReactNode, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/mission-control';

type ProjectRow = {
  id: string;
  key: string;
  name: string;
  status: string | null;
  owner: string | null;
  created_at: string | null;
  ticket_count: number;
};

export default function ProjectsTableClient({ projects, createAction }: { projects: ProjectRow[]; createAction?: ReactNode }) {
  const router = useRouter();
  const { notify } = useToast();
  const [rows, setRows] = useState(projects);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'name'>('created_at');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const statuses = useMemo(() => ['all', ...new Set(rows.map((project) => project.status ?? 'unknown'))], [rows]);

  const filtered = useMemo(() => {
    const lowered = search.toLowerCase();
    return rows
      .filter((project) => {
        const matchesSearch = project.name.toLowerCase().includes(lowered) || project.key.toLowerCase().includes(lowered);
        const matchesStatus = status === 'all' || (project.status ?? 'unknown') === status;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      });
  }, [rows, search, sortBy, status]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((project) => selectedIds.includes(project.id));

  const toggleAllVisible = (checked: boolean) => {
    const visibleIds = filtered.map((project) => project.id);
    if (checked) {
      setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])]);
      return;
    }
    setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
  };

  const toggleOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      return;
    }
    setSelectedIds((prev) => prev.filter((value) => value !== id));
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const deletingIds = [...selectedIds];
    const previous = [...rows];
    setRows((prev) => prev.filter((project) => !deletingIds.includes(project.id)));

    const supabase = createClient();
    const { error } = await supabase.from('mc_projects').delete().in('id', deletingIds);
    setIsDeleting(false);

    if (error) {
      setRows(previous);
      notify(`Could not delete selected projects. ${error.message}`, 'error');
      return;
    }

    setSelectedIds([]);
    setConfirmOpen(false);
    notify('Projects deleted successfully.');
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects"
            className="max-w-xl"
            aria-label="Search projects"
          />
          <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label="Filter projects by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item === 'all' ? 'All statuses' : item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'created_at' | 'name')}>
              <SelectTrigger aria-label="Sort projects">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Created date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {createAction}
          <Button variant="secondary" disabled={selectedIds.length === 0 || isDeleting} onClick={() => setConfirmOpen(true)}>
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHead>
            <tr className="sticky top-0 z-10 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <TableHeaderCell className="w-10">
                <input type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleAllVisible(event.target.checked)} aria-label="Select all projects" />
              </TableHeaderCell>
              <TableHeaderCell>Key</TableHeaderCell>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Owner</TableHeaderCell>
              <TableHeaderCell>Created</TableHeaderCell>
              <TableHeaderCell className="text-right">Tickets</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Skeleton className="h-10 w-full" />
                </TableCell>
              </TableRow>
            )}
            {rows.length > 0 && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  No projects found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((project) => (
              <TableRow
                key={project.id}
                tabIndex={0}
                role="button"
                className="group cursor-pointer border-t border-border/70 text-sm transition-all duration-200 hover:bg-muted/80 focus-within:bg-muted motion-reduce:transition-none"
                onClick={() => router.push(`/projects/${project.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    router.push(`/projects/${project.id}`);
                  }
                }}
              >
                <TableCell className="py-2" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(project.id)}
                    onChange={(event) => toggleOne(project.id, event.target.checked)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Select ${project.name}`}
                  />
                </TableCell>
                <TableCell className="py-2 font-medium text-primary">{project.key}</TableCell>
                <TableCell className="py-2 font-semibold text-foreground">{project.name}</TableCell>
                <TableCell className="py-2">
                  <Badge variant="default">{project.status ?? 'unknown'}</Badge>
                </TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground">{project.owner ?? 'Unassigned'}</TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground">{formatDate(project.created_at)}</TableCell>
                <TableCell className="py-2 text-right text-xs text-muted-foreground">{project.ticket_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg space-y-3 rounded-xl border bg-card p-4 shadow-lg">
            <h3 className="text-lg font-semibold">Delete selected projects?</h3>
            <p className="text-sm text-mutedForeground">
              This will permanently delete {selectedIds.length} selected project(s). Tickets linked to these projects may still exist; if database foreign-key
              constraints block deletion, those projects will be kept.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="secondary" className="text-destructive" onClick={() => void handleDelete()} disabled={isDeleting}>
                {isDeleting ? 'Deleting…' : 'Delete projects'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
