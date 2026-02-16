export const GTD_COLUMNS = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'next', label: 'Next Actions' },
  { key: 'waiting', label: 'Waiting For' },
  { key: 'someday', label: 'Someday/Maybe' },
  { key: 'done', label: 'Done' }
] as const;

export type GtdStatus = (typeof GTD_COLUMNS)[number]['key'];

/**
 * Deterministic board mapping from mc_tickets.status text -> GTD board column key:
 * inbox   -> Inbox
 * next    -> Next Actions
 * waiting -> Waiting For
 * someday -> Someday/Maybe
 * done    -> Done
 *
 * Backward compatibility:
 * open   -> inbox
 * closed -> done
 * anything else -> inbox
 */
const BOARD_STATUS_MAP: Record<string, GtdStatus> = {
  inbox: 'inbox',
  next: 'next',
  waiting: 'waiting',
  someday: 'someday',
  done: 'done',
  open: 'inbox',
  closed: 'done'
};

export function normalizeTicketStatus(status: string | null | undefined): GtdStatus {
  const normalized = (status ?? '').toLowerCase().trim();
  return BOARD_STATUS_MAP[normalized] ?? 'inbox';
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
