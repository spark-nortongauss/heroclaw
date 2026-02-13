'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell } from '@/components/ui/table';
import { TicketRow, TicketRowItem } from '@/components/ui/ticket-row';

export function TicketTable({
  tickets,
  loading,
  selectedId,
  onSelect
}: {
  tickets: TicketRowItem[];
  loading?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="overflow-auto rounded-xl border border-border bg-white">
      <Table>
        <TableHead>
          <tr className="sticky top-0 z-10 bg-[#F4F5F7] text-xs uppercase tracking-wide text-[#6B778C]">
            <TableHeaderCell>Issue key</TableHeaderCell>
            <TableHeaderCell>Summary</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Assignee</TableHeaderCell>
            <TableHeaderCell>Priority</TableHeaderCell>
            <TableHeaderCell>Updated</TableHeaderCell>
            <TableHeaderCell>Reporter</TableHeaderCell>
            <TableHeaderCell>Parent</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {loading && (
            <tr>
              <TableCell colSpan={8}>
                <Skeleton className="h-10 w-full" />
              </TableCell>
            </tr>
          )}
          {!loading && tickets.length === 0 && (
            <tr>
              <TableCell colSpan={8} className="text-center text-sm text-mutedForeground">
                No tickets found.
              </TableCell>
            </tr>
          )}
          {tickets.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} selected={ticket.id === selectedId} onSelect={onSelect} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
