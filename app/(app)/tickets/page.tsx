'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
      <div className="flex flex-col gap-2 md:flex-row">
        <Input placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="md:w-48">
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
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Owner Agent</th>
              <th className="px-3 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-3 py-4" colSpan={4}>
                  Loading...
                </td>
              </tr>
            )}
            {filtered.map((ticket) => (
              <tr key={ticket.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2">
                  <Link href={`/tickets/${ticket.id}`} className="text-primary underline-offset-4 hover:underline">
                    {ticket.title}
                  </Link>
                </td>
                <td className="px-3 py-2">{ticket.status}</td>
                <td className="px-3 py-2">{ticket.owner_agent_id ?? '-'}</td>
                <td className="px-3 py-2">{new Date(ticket.updated_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
