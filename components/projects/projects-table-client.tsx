'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'name'>('created_at');

  const statuses = useMemo(() => ['all', ...new Set(projects.map((project) => project.status ?? 'unknown'))], [projects]);

  const filtered = useMemo(() => {
    const lowered = query.toLowerCase();
    return projects
      .filter((project) => {
        const matchesQuery =
          project.name.toLowerCase().includes(lowered) ||
          (project.key ?? '').toLowerCase().includes(lowered);
        const matchesStatus = status === 'all' || (project.status ?? 'unknown') === status;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      });
  }, [projects, query, sortBy, status]);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-white p-4 shadow-sm">
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

      <Table>
        <TableHead>
          <TableRow>
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
            <TableRow
              key={project.id}
              className="cursor-pointer"
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              <TableCell className="font-medium">{project.key}</TableCell>
              <TableCell>{project.name}</TableCell>
              <TableCell>
                <Badge variant="default" className="uppercase">{project.status ?? 'unknown'}</Badge>
              </TableCell>
              <TableCell>{project.owner ?? 'Unassigned'}</TableCell>
              <TableCell>{formatDate(project.created_at)}</TableCell>
              <TableCell className="text-right">{project.ticket_count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
