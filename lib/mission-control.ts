export const GTD_COLUMNS = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'next', label: 'Next Actions' },
  { key: 'waiting', label: 'Waiting For' },
  { key: 'someday', label: 'Someday/Maybe' },
  { key: 'done', label: 'Done' }
] as const;

export type GtdStatus = (typeof GTD_COLUMNS)[number]['key'];

const BACKWARD_STATUS_MAP: Record<string, GtdStatus> = {
  open: 'inbox',
  todo: 'inbox',
  not_done: 'inbox',
  in_progress: 'next',
  ongoing: 'next',
  blocked: 'waiting',
  closed: 'done',
  complete: 'done',
  completed: 'done'
};

/**
 * mc_tickets.status is free text in production. We normalize legacy values for rendering,
 * but persist explicit GTD values (inbox/next/waiting/someday/done) when cards move on board.
 */
export function normalizeTicketStatus(status: string | null | undefined): GtdStatus {
  const normalized = (status ?? '').toLowerCase().trim();
  if (normalized in BACKWARD_STATUS_MAP) return BACKWARD_STATUS_MAP[normalized];
  if (GTD_COLUMNS.some((column) => column.key === normalized)) return normalized as GtdStatus;
  return 'inbox';
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function priorityTone(priority: string | null | undefined) {
  const normalized = (priority ?? '').toLowerCase();
  if (normalized.includes('urgent') || normalized.includes('highest')) return 'destructive';
  if (normalized.includes('high')) return 'default';
  return 'secondary';
}
