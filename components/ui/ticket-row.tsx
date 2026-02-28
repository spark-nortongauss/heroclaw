'use client';

import { useRouter } from 'next/navigation';
import { Paperclip } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { PriorityBadge } from '@/components/ui/priority-badge';
import { cn } from '@/lib/utils';

export type TicketRowItem = {
  id: string;
  issueKey: string;
  summary: string;
  status: 'not_done' | 'ongoing' | 'done';
  assignee: string;
  reporter?: string;
  parent?: string | null;
  dueDateLabel: string;
  updatedLabel: string;
  priority: 'highest' | 'high' | 'medium' | 'low';
};

function initials(value: string) {
  return value
    .split(' ')
    .map((chunk) => chunk[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function TicketRow({
  ticket,
  selected,
  onSelect,
  selectedForDelete,
  onSelectForDelete,
  attachmentCount,
  attachmentLoading,
  onAttachmentHover,
  onAttachmentClick
}: {
  ticket: TicketRowItem;
  selected?: boolean;
  onSelect?: (id: string) => void;
  selectedForDelete?: boolean;
  onSelectForDelete?: (checked: boolean) => void;
  attachmentCount?: number;
  attachmentLoading?: boolean;
  onAttachmentHover?: (id: string) => void;
  onAttachmentClick?: (id: string) => void;
}) {
  const router = useRouter();

  const openTicket = () => {
    onSelect?.(ticket.id);
    router.push(`/tickets/${ticket.id}`);
  };

  return (
    <TableRow
      tabIndex={0}
      role="button"
      aria-label={`Open ${ticket.issueKey}`}
      onClick={openTicket}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openTicket();
        }
      }}
      className={cn(
        'group cursor-pointer border-t border-border/70 text-sm transition-all duration-200 hover:bg-muted/80 focus-within:bg-muted motion-reduce:transition-none',
        selected && 'bg-muted'
      )}
    >
      <TableCell className="py-2" onClick={(event) => event.stopPropagation()}>
        <input
          type="checkbox"
          aria-label={`Select ${ticket.issueKey}`}
          checked={Boolean(selectedForDelete)}
          onChange={(event) => {
            onSelectForDelete?.(event.target.checked);
          }}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        />
      </TableCell>
      <TableCell className="py-2">
        <span className="font-medium text-primary">{ticket.issueKey}</span>
      </TableCell>
      <TableCell className="py-2">
        <span className="font-semibold text-foreground">{ticket.summary}</span>
      </TableCell>
      <TableCell className="py-2">
        <StatusBadge status={ticket.status} />
      </TableCell>
      <TableCell className="py-2">
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
            {initials(ticket.assignee)}
          </span>
          <span className="text-xs">{ticket.assignee}</span>
        </span>
      </TableCell>
      <TableCell className="py-2">
        <PriorityBadge priority={ticket.priority} />
      </TableCell>
      <TableCell className="py-2 text-xs text-muted-foreground">
        {ticket.dueDateLabel}
      </TableCell>
      <TableCell className="py-2 text-xs text-muted-foreground">
        {ticket.updatedLabel}
      </TableCell>
      <TableCell className="py-2 text-xs text-muted-foreground">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          onMouseEnter={() => onAttachmentHover?.(ticket.id)}
          onFocus={() => onAttachmentHover?.(ticket.id)}
          onClick={(event) => {
            event.stopPropagation();
            onAttachmentClick?.(ticket.id);
          }}
          aria-label={`Open attachments for ${ticket.issueKey}`}
        >
          <Paperclip className="h-3.5 w-3.5" />
          <span>{attachmentLoading ? '…' : attachmentCount ?? 0}</span>
        </button>
      </TableCell>
      <TableCell className="py-2 text-xs text-muted-foreground">
        {ticket.reporter ?? '-'}
      </TableCell>
      <TableCell className="py-2 text-xs text-muted-foreground">
        {ticket.parent ?? '-'}
      </TableCell>
    </TableRow>
  );
}
