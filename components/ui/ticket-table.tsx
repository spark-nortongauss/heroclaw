'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell } from '@/components/ui/table';
import { TicketRow, TicketRowItem } from '@/components/ui/ticket-row';

export function TicketTable({
  tickets,
  loading,
  selectedId,
  onSelect,
  selectedIds,
  allVisibleSelected,
  onToggleSelectAll,
  onToggleTicket,
  attachmentCounts,
  loadingAttachmentIds,
  onAttachmentHover,
  onAttachmentClick,
  emptyText = 'No tickets found.'
}: {
  tickets: TicketRowItem[];
  loading?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  selectedIds?: string[];
  allVisibleSelected?: boolean;
  onToggleSelectAll?: (checked: boolean) => void;
  onToggleTicket?: (id: string, checked: boolean) => void;
  attachmentCounts?: Record<string, number>;
  loadingAttachmentIds?: Record<string, boolean>;
  onAttachmentHover?: (id: string) => void;
  onAttachmentClick?: (id: string) => void;
  emptyText?: string;
}) {
  return (
    <div className="overflow-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHead>
          <tr className="sticky top-0 z-10 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
            <TableHeaderCell className="w-10">
              <input
                type="checkbox"
                aria-label="Select all tickets"
                checked={Boolean(allVisibleSelected)}
                onChange={(event) => onToggleSelectAll?.(event.target.checked)}
              />
            </TableHeaderCell>
            <TableHeaderCell>Issue key</TableHeaderCell>
            <TableHeaderCell>Summary</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Assignee</TableHeaderCell>
            <TableHeaderCell>Priority</TableHeaderCell>
            <TableHeaderCell>Due date</TableHeaderCell>
            <TableHeaderCell>Updated</TableHeaderCell>
            <TableHeaderCell>Attachments</TableHeaderCell>
            <TableHeaderCell>Reporter</TableHeaderCell>
            <TableHeaderCell>Parent</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {loading && (
            <tr>
              <TableCell colSpan={11}>
                <Skeleton className="h-10 w-full" />
              </TableCell>
            </tr>
          )}
          {!loading && tickets.length === 0 && (
            <tr>
              <TableCell colSpan={11} className="text-center text-sm text-muted-foreground">
                {emptyText}
              </TableCell>
            </tr>
          )}
          {tickets.map((ticket) => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              selected={ticket.id === selectedId}
              onSelect={onSelect}
              selectedForDelete={Boolean(selectedIds?.includes(ticket.id))}
              onSelectForDelete={(checked) => onToggleTicket?.(ticket.id, checked)}
              attachmentCount={attachmentCounts?.[ticket.id]}
              attachmentLoading={Boolean(loadingAttachmentIds?.[ticket.id])}
              onAttachmentHover={onAttachmentHover}
              onAttachmentClick={onAttachmentClick}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
