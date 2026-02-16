'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export default function ProjectsTableClient({ projects }: { projects: ProjectRow[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const [rows, setRows] = useState(projects);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'name'>('created_at');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const statuses = useMemo(() => ['all', ...new Set(rows.map((project) => project.status ?? 'unknown'))], [rows]);

  const filtered = useMemo(() => {
    const lowered = query.toLowerCase();
    return rows
      .filter((project) => {
        const matchesQuery = project.name.toLowerCase().includes(lowered) || (project.key ?? '').toLowerCase().includes(lowered);
        const matchesStatus = status === 'all' || (project.status ?? 'unknown') === status;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      });
  }, [query, rows, sortBy, status]);

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
    const supabase = createClient();
    const deletingIds = [...selectedIds];
    const { error } = await supabase.from('mc_projects').delete().in('id', deletingIds);
    setIsDeleting(false);

    if (error) {
      notify(`Could not delete selected projects. ${error.message}`, 'error');
      return;
    }

    setRows((prev) => prev.filter((project) => !deletingIds.includes(project.id)));
    setSelectedIds([]);
    setConfirmOpen(false);
    notify('Projects deleted successfully.');
  };

  return (
    <>
      <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-2 md:grid-cols-3">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by key or name" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
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
            <SelectTrigger>
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Created date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end">
          <Button variant="destructive" disabled={selectedIds.length === 0} onClick={() => setConfirmOpen(true)}>
            Delete
          </Button>
        </div>

        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell className="w-10">
                <input type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleAllVisible(event.target.checked)} aria-label="Select all projects" />
              </TableHeaderCell>
              <TableHeaderCell>Key</TableHeaderCell>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Owner</TableHeaderCell>
              <TableHeaderCell>Created At</TableHeaderCell>
              <TableHeaderCell className="text-right">Tickets</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((project) => (
              <TableRow key={project.id} className="cursor-pointer" onClick={() => router.push(`/projects/${project.id}`)}>
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(project.id)}
                    onChange={(event) => toggleOne(project.id, event.target.checked)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Select ${project.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{project.key}</TableCell>
                <TableCell>{project.name}</TableCell>
                <TableCell>
                  <Badge variant="default">{project.status ?? 'unknown'}</Badge>
                </TableCell>
                <TableCell>{project.owner ?? 'Unassigned'}</TableCell>
                <TableCell>{formatDate(project.created_at)}</TableCell>
                <TableCell className="text-right">{project.ticket_count}</TableCell>
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
              <Button variant="destructive" onClick={() => void handleDelete()} disabled={isDeleting}>
                {isDeleting ? 'Deleting…' : 'Delete projects'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
