import { AlertTriangle, ArrowDown, ArrowUp, Equal } from 'lucide-react';

type Priority = 'highest' | 'high' | 'medium' | 'low';

const priorityConfig: Record<Priority, { label: string; icon: typeof ArrowUp; className: string }> = {
  highest: { label: 'Highest', icon: AlertTriangle, className: 'text-red-600' },
  high: { label: 'High', icon: ArrowUp, className: 'text-orange-500' },
  medium: { label: 'Medium', icon: Equal, className: 'text-amber-500' },
  low: { label: 'Low', icon: ArrowDown, className: 'text-sky-600' }
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
      <Icon className={`h-3.5 w-3.5 ${config.className}`} />
      {config.label}
    </span>
  );
}
