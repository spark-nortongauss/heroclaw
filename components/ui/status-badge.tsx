import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type TicketStatus = 'not_done' | 'ongoing' | 'done';

const statusLabels: Record<TicketStatus, string> = {
  not_done: 'To Do',
  ongoing: 'In Progress',
  done: 'Done'
};

export function StatusBadge({ status, pulse }: { status: TicketStatus; pulse?: boolean }) {
  return (
    <Badge
      variant={status}
      className={cn('rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide', pulse && 'status-badge-pulse')}
    >
      {statusLabels[status]}
    </Badge>
  );
}
