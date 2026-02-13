'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';

async function fetchTickets() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('mc_tickets')
    .select('id, title, status, owner_agent_id, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export default function TicketsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const { data = [], isLoading } = useQuery({ queryKey: ['tickets'], queryFn: fetchTickets });

  const filtered = useMemo(
    () =>
      data.filter((ticket) => {
        const matchesSearch = ticket.title.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = status === 'all' || ticket.status === status;
        return matchesSearch && matchesStatus;
      }),
    [data, search, status]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="h1 font-[var(--font-heading)]">Tickets</h1>
        <p className="text-body">Track tickets and monitor status transitions.</p>
      </div>

      <div className="flex flex-col gap-2 md:flex-row">
        <Input placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="md:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="not_done">Not done</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Title</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Owner Agent</TableHeaderCell>
                <TableHeaderCell>Updated</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-mutedForeground">
                    No tickets found.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((ticket) => (
                <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/tickets/${ticket.id}`} className="font-medium underline-offset-4 hover:underline">
                      {ticket.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ticket.status}>{ticket.status}</Badge>
                  </TableCell>
                  <TableCell>{ticket.owner_agent_id ?? '-'}</TableCell>
                  <TableCell>{new Date(ticket.updated_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
