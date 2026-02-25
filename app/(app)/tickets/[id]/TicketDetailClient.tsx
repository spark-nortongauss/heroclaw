'use client';

import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';

import type { Json } from '@/lib/supabase/types';

import { createClient } from '@/lib/supabase/client';

import { createTicketComment, updateComment, updateTicketFields } from './actions';

type Agent = {
  id: string;
  label: string;
  department: string | null;
};

type CommentItem = {
  id: string;
  body: string;
  created_at: string;
  author: {
    id: string;
    label: string;
    department: string | null;
  } | null;
};

type Ticket = {
  id: string;
  ticket_no: number | null;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  owner_agent_id: string | null;
  reporter_agent_id: string | null;
  due_at: string | null;
  labels: string[] | null;
  context: Json | null;
  created_at: string | null;
  updated_at: string | null;
};

type TicketDetailClientProps = {
  ticket: Ticket;
  comments: CommentItem[];
  agents: Agent[];
};

type ActivityTab = 'all' | 'comments' | 'history';

type ReferencedTicket = {
  id: string;
  ticket_no: number | null;
  title: string;
};

const STATUS_OPTIONS = ['inbox', 'next', 'waiting', 'someday', 'done', 'open', 'in_progress', 'blocked'] as const;
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'] as const;

function isObject(value: Json | null): value is Record<string, Json> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function formatDateInput(value: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function highlightMentions(body: string) {
  const parts = body.split(/(@[\w.-]+)/g);

  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span key={`${part}-${index}`} className="rounded bg-primary/70 px-1 text-foreground">
          {part}
        </span>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function avatarInitial(value: string | null | undefined) {
  if (!value) return '?';
  return value.trim().charAt(0).toUpperCase() || '?';
}

function statusPillClasses(status: string | null | undefined) {
  const normalized = (status ?? '').toLowerCase().replace(/\s+/g, '_');
  if (['done', 'closed', 'completed'].includes(normalized)) return 'border-primary bg-primary text-foreground';
  if (['open', 'pending', 'todo', 'in_progress', 'in progress', 'ongoing'].includes(normalized)) {
    return 'border-border bg-card text-foreground/80 shadow-[inset_3px_0_0_#D9FF35]';
  }
  return 'border-border bg-card text-foreground/80';
}

function priorityPillClasses(priority: string | null | undefined) {
  const normalized = (priority ?? '').toLowerCase();
  if (normalized.includes('high') || normalized.includes('urgent')) return 'border-primary bg-primary/60 text-foreground';
  if (normalized.includes('medium')) return 'border-border bg-primary/20 text-foreground';
  if (normalized.includes('low')) return 'border-border bg-card text-foreground/80';
  return 'border-border bg-card text-foreground/80';
}

function ReadOnlyValue({ value }: { value: string | null | undefined }) {
  return <span className="text-sm text-foreground">{value && value.length > 0 ? value : '-'}</span>;
}

export default function TicketDetailClient({ ticket, comments, agents }: TicketDetailClientProps) {
  const [text, setText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; display_name: string; slug: string | null; department: string | null }>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mentionTokenStart, setMentionTokenStart] = useState<number | null>(null);
  const [mentionAgents, setMentionAgents] = useState<Array<{ id: string; display_name: string; slug: string | null; department: string | null }>>([]);
  const [hasLoadedMentionAgents, setHasLoadedMentionAgents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActivityTab>('comments');
  const [isPending, startTransition] = useTransition();
  const [isTicketPending, startTicketTransition] = useTransition();
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isCommentPending, startCommentTransition] = useTransition();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [reporterFallback, setReporterFallback] = useState<string>('Unknown');
  const [showReferencePanel, setShowReferencePanel] = useState(false);
  const [referenceQuery, setReferenceQuery] = useState('');
  const [referenceResults, setReferenceResults] = useState<ReferencedTicket[]>([]);
  const [referenceSearchPending, setReferenceSearchPending] = useState(false);
  const [referenceIds, setReferenceIds] = useState<string[]>([]);
  const [referencedTickets, setReferencedTickets] = useState<ReferencedTicket[]>([]);
  const [assigneeAgents, setAssigneeAgents] = useState<Agent[]>(agents);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const referenceSearchTimeoutRef = useRef<number | null>(null);
  const blurTimeoutRef = useRef<number | null>(null);
  const initialContextRef = useRef<Record<string, Json>>(isObject(ticket.context) ? ticket.context : {});
  const [draftTicket, setDraftTicket] = useState({
    title: ticket.title,
    description: ticket.description ?? '',
    status: ticket.status ?? '',
    priority: ticket.priority ?? '',
    owner_agent_id: ticket.owner_agent_id ?? '',
    reporter_agent_id: ticket.reporter_agent_id ?? '',
    due_at: formatDateInput(ticket.due_at),
    labels: (ticket.labels ?? []).join(', ')
  });

  const agentById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const reporterLabel = agentById.get(ticket.reporter_agent_id ?? '')?.label ?? reporterFallback;

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current);
      }
      if (referenceSearchTimeoutRef.current !== null) {
        window.clearTimeout(referenceSearchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const startingIds = Array.isArray(initialContextRef.current.referenced_ticket_ids)
      ? initialContextRef.current.referenced_ticket_ids.filter((value): value is string => typeof value === 'string')
      : [];
    setReferenceIds(startingIds);
  }, []);


  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from('mc_agents')
      .select('id, display_name, department')
      .eq('is_active', true)
      .order('display_name', { ascending: true })
      .then(({ data }) => {
        const loaded = (data ?? [])
          .map((agent) => ({
            id: agent.id,
            label: agent.display_name,
            department: agent.department
          }))
          .filter((agent): agent is Agent => Boolean(agent.label));

        if (loaded.length > 0) {
          setAssigneeAgents(loaded);
        }
      });
  }, []);

  useEffect(() => {
    if (ticket.reporter_agent_id) {
      return;
    }

    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setReporterFallback(data.user?.email ?? 'Unknown');
    });
  }, [ticket.reporter_agent_id]);

  useEffect(() => {
    if (referenceIds.length === 0) {
      setReferencedTickets([]);
      return;
    }

    const supabase = createClient();
    void supabase
      .from('mc_tickets')
      .select('id, ticket_no, title')
      .in('id', referenceIds)
      .then(({ data }) => {
        const loaded = (data ?? []) as ReferencedTicket[];
        const orderMap = new Map(loaded.map((ticketItem) => [ticketItem.id, ticketItem]));
        setReferencedTickets(referenceIds.map((id) => orderMap.get(id)).filter((value): value is ReferencedTicket => Boolean(value)));
      });
  }, [referenceIds]);

  useEffect(() => {
    if (!showReferencePanel) return;

    if (referenceSearchTimeoutRef.current !== null) {
      window.clearTimeout(referenceSearchTimeoutRef.current);
    }

    referenceSearchTimeoutRef.current = window.setTimeout(() => {
      const supabase = createClient();
      setReferenceSearchPending(true);
      void supabase
        .from('mc_tickets')
        .select('id, ticket_no, title, status')
        .neq('id', ticket.id)
        .not('status', 'in', '(done,closed)')
        .or(`title.ilike.%${referenceQuery}%,ticket_no::text.ilike.%${referenceQuery}%`)
        .order('updated_at', { ascending: false })
        .limit(10)
        .then(({ data }) => {
          const loaded = ((data ?? []) as Array<ReferencedTicket & { status: string | null }>).filter(
            (item) => !referenceIds.includes(item.id)
          );
          setReferenceResults(loaded.map(({ id, ticket_no, title }) => ({ id, ticket_no, title })));
        })
        .finally(() => setReferenceSearchPending(false));
    }, 250);
  }, [referenceIds, referenceQuery, showReferencePanel, ticket.id]);

  const loadMentionAgents = async () => {
    if (hasLoadedMentionAgents) return mentionAgents;
    setHasLoadedMentionAgents(true);

    const supabase = createClient();
    const { data } = await supabase
      .from('mc_agents')
      .select('id, display_name, slug, department')
      .eq('is_active', true)
      .order('display_name', { ascending: true });

    const loadedAgents = (data ?? []).filter((agent) => typeof agent.display_name === 'string' && agent.display_name.length > 0);
    setMentionAgents(loadedAgents);
    return loadedAgents;
  };

  const getMentionContext = (value: string, caret: number) => {
    const beforeCaret = value.slice(0, caret);
    const atIndex = beforeCaret.lastIndexOf('@');
    if (atIndex < 0) return null;

    if (atIndex > 0 && !/\s/.test(beforeCaret[atIndex - 1])) return null;

    const tokenAfterAt = beforeCaret.slice(atIndex + 1);
    if (/\s/.test(tokenAfterAt)) return null;

    return {
      tokenStart: atIndex,
      query: tokenAfterAt
    };
  };

  const updateMentionSuggestions = async (value: string, caret: number) => {
    const context = getMentionContext(value, caret);
    if (!context) {
      setIsOpen(false);
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      setMentionTokenStart(null);
      return;
    }

    const sourceAgents = hasLoadedMentionAgents ? mentionAgents : await loadMentionAgents();

    const loweredQuery = context.query.toLowerCase();
    const filtered = sourceAgents
      .filter((agent) => {
        const displayName = agent.display_name.toLowerCase();
        const slug = (agent.slug ?? '').toLowerCase();
        return displayName.startsWith(loweredQuery) || slug.startsWith(loweredQuery);
      })
      .slice(0, 8);

    setMentionTokenStart(context.tokenStart);
    setQuery(context.query);
    setResults(filtered);
    setActiveIndex(0);
    setIsOpen(filtered.length > 0);
  };

  const handleSelectMention = (agent: { display_name: string }) => {
    const textarea = textareaRef.current;
    if (!textarea || mentionTokenStart === null) return;

    const caret = textarea.selectionStart ?? text.length;
    const before = text.slice(0, mentionTokenStart);
    const after = text.slice(caret);
    const inserted = `@${agent.display_name} `;
    const nextValue = `${before}${inserted}${after}`;
    const nextCaret = before.length + inserted.length;

    setText(nextValue);
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setActiveIndex(0);
    setMentionTokenStart(null);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const parseMentionAgentIds = () => {
    const found = new Set<string>();

    for (const agent of agents) {
      const escaped = agent.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|\\s)@${escaped}(?=\\s|$)`, 'g');
      if (regex.test(text)) {
        found.add(agent.id);
      }
    }

    return Array.from(found);
  };

  const submitComment = () => {
    setError(null);

    startTransition(async () => {
      const result = await createTicketComment({
        ticketId: ticket.id,
        body: text,
        mentionsAgentIds: parseMentionAgentIds()
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setText('');
      setIsOpen(false);
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      setMentionTokenStart(null);
    });
  };

  const handleCommentChange = async (nextValue: string, caret: number) => {
    setText(nextValue);
    await updateMentionSuggestions(nextValue, caret);
  };

  const handleCommentKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isOpen || results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      handleSelectMention(results[activeIndex] ?? results[0]);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      setResults([]);
      setActiveIndex(0);
      setMentionTokenStart(null);
    }
  };

  const startEditField = (field: string) => {
    setTicketError(null);
    setEditingField(field);
  };

  const cancelEditField = () => {
    setEditingField(null);
    setDraftTicket({
      title: ticket.title,
      description: ticket.description ?? '',
      status: ticket.status ?? '',
      priority: ticket.priority ?? '',
      owner_agent_id: ticket.owner_agent_id ?? '',
      reporter_agent_id: ticket.reporter_agent_id ?? '',
      due_at: formatDateInput(ticket.due_at),
      labels: (ticket.labels ?? []).join(', ')
    });
  };

  const saveField = (field: string) => {
    setTicketError(null);

    startTicketTransition(async () => {
      const patch: Record<string, unknown> = {};

      if (field === 'title') patch.title = draftTicket.title;
      if (field === 'description') patch.description = draftTicket.description || null;
      if (field === 'status') patch.status = draftTicket.status || null;
      if (field === 'priority') patch.priority = draftTicket.priority || null;
      if (field === 'owner_agent_id') patch.owner_agent_id = draftTicket.owner_agent_id || null;
      if (field === 'reporter_agent_id') patch.reporter_agent_id = draftTicket.reporter_agent_id || null;
      if (field === 'due_at') patch.due_at = draftTicket.due_at || null;
      if (field === 'labels') {
        const parsed = draftTicket.labels
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        if (parsed.some((value) => value.length > 40)) {
          setTicketError('Each label must be 40 characters or fewer.');
          return;
        }
        patch.labels = parsed;
      }

      if (field === 'context') {
        patch.context = {
          ...initialContextRef.current,
          referenced_ticket_ids: referenceIds
        };
      }

      const result = await updateTicketFields({
        ticketId: ticket.id,
        patch
      });

      if (result.error) {
        setTicketError(result.error);
        return;
      }

      setEditingField(null);
    });
  };

  const saveReferences = (nextIds: string[]) => {
    setReferenceIds(nextIds);
    startTicketTransition(async () => {
      const nextContext: Record<string, Json> = {
        ...initialContextRef.current,
        referenced_ticket_ids: nextIds
      };
      const result = await updateTicketFields({
        ticketId: ticket.id,
        patch: {
          context: nextContext
        }
      });

      if (result.error) {
        setTicketError(result.error);
        return;
      }

      initialContextRef.current = nextContext;
      setTicketError(null);
    });
  };

  const beginEditComment = (comment: CommentItem) => {
    setCommentError(null);
    setEditingCommentId(comment.id);
    setEditingCommentBody(comment.body);
  };

  const saveComment = () => {
    if (!editingCommentId) return;
    setCommentError(null);

    startCommentTransition(async () => {
      const result = await updateComment({
        ticketId: ticket.id,
        commentId: editingCommentId,
        body: editingCommentBody
      });

      if (result.error) {
        setCommentError(result.error);
        return;
      }

      setEditingCommentId(null);
      setEditingCommentBody('');
    });
  };

  return (
    <>
      <header className="animate-[fadein_.2s_ease] rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-mutedForeground">Ticket #{ticket.ticket_no ?? '-'}</p>
        <div className="mt-2">
          {editingField === 'title' ? (
            <div className="space-y-2">
              <input
                className="w-full rounded-md border border-input px-3 py-2 text-2xl font-semibold text-foreground outline-none transition focus:ring-2 focus:ring-primary"
                onChange={(event) => setDraftTicket((prev) => ({ ...prev, title: event.target.value }))}
                value={draftTicket.title}
              />
              <div className="flex gap-2">
                <button className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-foreground hover:bg-primary/90" onClick={() => saveField('title')} type="button">
                  {isTicketPending ? 'Saving...' : 'Save'}
                </button>
                <button className="rounded-md border border-input px-3 py-1.5 text-sm text-foreground/80 hover:bg-muted" onClick={cancelEditField} type="button">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="group flex w-full items-center justify-between text-left text-foreground"
              onClick={() => startEditField('title')}
              type="button"
            >
              <h1 className="text-2xl font-semibold text-foreground">{ticket.title}</h1>
              <span className="text-xs text-mutedForeground opacity-0 transition group-hover:opacity-100">Edit</span>
            </button>
          )}
        </div>
        {ticketError ? <p className="mt-2 text-sm text-red-600">{ticketError}</p> : null}
      </header>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_320px]">
        <div className="space-y-5">
          <section className="animate-[fadein_.25s_ease] rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="group flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-mutedForeground">Description</h2>
              {editingField !== 'description' ? (
                <button className="text-xs text-mutedForeground opacity-0 transition group-hover:opacity-100" onClick={() => startEditField('description')} type="button">
                  Edit
                </button>
              ) : null}
            </div>

            {editingField === 'description' ? (
              <div className="mt-3 space-y-2 overflow-hidden transition-all">
                <textarea
                  className="min-h-[140px] w-full rounded-md border border-input p-3 text-sm leading-6 text-foreground outline-none focus:ring-2 focus:ring-primary"
                  onChange={(event) => setDraftTicket((prev) => ({ ...prev, description: event.target.value }))}
                  value={draftTicket.description}
                />
                <div className="flex gap-2">
                  <button className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-foreground hover:bg-primary/90" onClick={() => saveField('description')} type="button">
                    {isTicketPending ? 'Saving...' : 'Save'}
                  </button>
                  <button className="rounded-md border border-input px-3 py-1.5 text-sm text-foreground/80 hover:bg-muted" onClick={cancelEditField} type="button">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{ticket.description ?? '(No description provided)'}</p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-mutedForeground">Activity</h2>

            <div className="mt-4 border-b border-border/70">
              <nav className="flex gap-2" aria-label="Activity tabs">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'comments', label: 'Comments' },
                  { key: 'history', label: 'History' }
                ].map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      className={`rounded-t-md px-3 py-2 text-sm font-medium transition ${
                        isActive ? 'border-b-2 border-primary bg-primary/20 text-foreground' : 'text-mutedForeground hover:-translate-y-px hover:text-foreground/80'
                      }`}
                      onClick={() => setActiveTab(tab.key as ActivityTab)}
                      type="button"
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {activeTab === 'comments' ? (
              <div className="mt-5 space-y-5">
                <div className="space-y-5">
                  {comments.length === 0 ? (
                    <p className="text-sm text-mutedForeground">No comments yet.</p>
                  ) : (
                    comments.map((comment) => (
                      <article key={comment.id} className="group relative pl-11">
                        <span className="absolute left-4 top-10 h-[calc(100%-1.5rem)] w-px bg-muted" aria-hidden="true" />
                        <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground/80">
                          {avatarInitial(comment.author?.label)}
                        </div>

                        <div className="rounded-lg border border-border p-3 shadow-sm transition hover:shadow">
                          <header className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-mutedForeground">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">{comment.author?.label ?? 'Unknown'}</span>
                              <span className="rounded border border-border/70 bg-muted px-1.5 py-0.5">{comment.author?.department ?? 'unknown'}</span>
                              <span>{formatDateTime(comment.created_at)}</span>
                            </div>
                            {editingCommentId !== comment.id ? (
                              <button
                                className="text-xs text-mutedForeground opacity-0 transition group-hover:opacity-100 hover:text-foreground"
                                onClick={() => beginEditComment(comment)}
                                type="button"
                              >
                                Edit
                              </button>
                            ) : null}
                          </header>

                          {editingCommentId === comment.id ? (
                            <div className="space-y-2 overflow-hidden transition-all">
                              <textarea
                                className="min-h-[100px] w-full rounded-md border border-input p-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                                onChange={(event) => setEditingCommentBody(event.target.value)}
                                value={editingCommentBody}
                              />
                              {commentError ? <p className="text-sm text-red-600">{commentError}</p> : null}
                              <div className="flex gap-2">
                                <button className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-foreground hover:bg-primary/90" disabled={isCommentPending} onClick={saveComment} type="button">
                                  {isCommentPending ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  className="rounded-md border border-input px-3 py-1.5 text-sm text-foreground/80 hover:bg-muted"
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditingCommentBody('');
                                    setCommentError(null);
                                  }}
                                  type="button"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap text-sm text-foreground">{highlightMentions(comment.body)}</p>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>

                <div className="rounded-lg border border-border p-4">
                  <h3 className="text-sm font-semibold text-foreground">Add comment</h3>
                  <p className="mt-1 text-xs text-mutedForeground">Type @ to mention an agent</p>

                  <div className="relative mt-3">
                    <textarea
                      id="comment-body"
                      className="min-h-[120px] w-full rounded-md border border-input p-2 text-sm text-foreground outline-none ring-primary transition focus:ring-2"
                      onBlur={() => {
                        blurTimeoutRef.current = window.setTimeout(() => {
                          setIsOpen(false);
                        }, 100);
                      }}
                      onChange={(event) => {
                        void handleCommentChange(event.target.value, event.target.selectionStart ?? event.target.value.length);
                      }}
                      onFocus={(event) => {
                        if (blurTimeoutRef.current !== null) {
                          window.clearTimeout(blurTimeoutRef.current);
                        }
                        void updateMentionSuggestions(event.target.value, event.target.selectionStart ?? event.target.value.length);
                      }}
                      onKeyDown={handleCommentKeyDown}
                      placeholder="Write a comment"
                      ref={textareaRef}
                      value={text}
                    />
                    {isOpen && results.length > 0 ? (
                      <div aria-label={`Mention suggestions for ${query}`} className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border border-border/70 bg-card shadow">
                        {results.map((agent, index) => (
                          <button
                            key={agent.id}
                            className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${index === activeIndex ? 'bg-muted' : ''}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleSelectMention(agent)}
                            type="button"
                          >
                            <span className="font-medium">{agent.display_name}</span>
                            <span className="ml-2 text-mutedForeground">{agent.department ?? 'Unknown'}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : <p className="mt-2 h-5 text-sm" aria-hidden="true" />}

                  <div className="mt-2 flex justify-end">
                    <button
                      className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-mutedForeground"
                      disabled={isPending || text.trim().length === 0}
                      onClick={submitComment}
                      type="button"
                    >
                      {isPending ? 'Posting...' : 'Post comment'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-input border-dashed p-6 text-sm text-mutedForeground">Coming soon.</div>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-mutedForeground">Details</h2>
          <dl className="mt-3 divide-y divide-border/60">
            <div className="grid grid-cols-[120px_1fr] items-start gap-3 py-2.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-mutedForeground">Status</dt>
              <dd>
                <select
                  className="w-full rounded-md border border-input px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                  defaultValue={ticket.status ?? 'open'}
                  disabled={isTicketPending}
                  onChange={(event) => {
                    setDraftTicket((prev) => ({ ...prev, status: event.target.value }));
                    startTicketTransition(async () => {
                      const result = await updateTicketFields({
                        ticketId: ticket.id,
                        patch: { status: event.target.value }
                      });
                      if (result.error) {
                        setTicketError(result.error);
                      }
                    });
                  }}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </dd>
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3 py-2.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-mutedForeground">Priority</dt>
              <dd>
                <select
                  className="w-full rounded-md border border-input px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                  defaultValue={ticket.priority ?? 'medium'}
                  disabled={isTicketPending}
                  onChange={(event) => {
                    setDraftTicket((prev) => ({ ...prev, priority: event.target.value }));
                    startTicketTransition(async () => {
                      const result = await updateTicketFields({
                        ticketId: ticket.id,
                        patch: { priority: event.target.value }
                      });
                      if (result.error) {
                        setTicketError(result.error);
                      }
                    });
                  }}
                >
                  {PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </dd>
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3 py-2.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-mutedForeground">Assignee</dt>
              <dd>
              <select
                className="w-full rounded-md border border-input px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                defaultValue={ticket.owner_agent_id ?? ''}
                disabled={isTicketPending}
                onChange={(event) => {
                  setDraftTicket((prev) => ({ ...prev, owner_agent_id: event.target.value }));
                  startTicketTransition(async () => {
                    const result = await updateTicketFields({
                      ticketId: ticket.id,
                      patch: { owner_agent_id: event.target.value || null }
                    });
                    if (result.error) {
                      setTicketError(result.error);
                    }
                  });
                }}
              >
                <option value="">Unassigned</option>
                {assigneeAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.label}
                  </option>
                ))}
              </select>
              </dd>
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3 py-2.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-mutedForeground">Reporter</dt>
              <dd className="text-sm text-foreground">{reporterLabel}</dd>
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3 py-2.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-mutedForeground">References</dt>
              <dd className="space-y-2">
                <button className="text-xs font-medium text-foreground/80 underline" onClick={() => setShowReferencePanel((prev) => !prev)} type="button">
                  Reference other tickets
                </button>
                <div className="flex flex-wrap gap-2">
                  {referencedTickets.length === 0 ? (
                    <span className="text-sm text-mutedForeground">-</span>
                  ) : (
                    referencedTickets.map((reference) => (
                      <span key={reference.id} className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card px-2 py-1 text-xs text-foreground">
                        <Link className="hover:underline" href={`/tickets/${reference.id}`}>
                          #{reference.ticket_no ?? '-'} {reference.title}
                        </Link>
                        <button
                          aria-label={`Remove reference ${reference.title}`}
                          className="text-mutedForeground hover:text-foreground"
                          onClick={() => saveReferences(referenceIds.filter((id) => id !== reference.id))}
                          type="button"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>
                {showReferencePanel ? (
                  <div className="space-y-2 rounded-md border border-border/70 p-2">
                    <input
                      className="w-full rounded-md border border-input px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                      onChange={(event) => setReferenceQuery(event.target.value.trim())}
                      placeholder="Search open tickets..."
                      value={referenceQuery}
                    />
                    <div className="max-h-48 space-y-1 overflow-auto">
                      {referenceSearchPending ? (
                        <p className="text-xs text-mutedForeground">Searching...</p>
                      ) : referenceResults.length === 0 ? (
                        <p className="text-xs text-mutedForeground">No open tickets found.</p>
                      ) : (
                        referenceResults.map((result) => (
                          <button
                            key={result.id}
                            className="block w-full rounded px-2 py-1 text-left text-sm text-foreground hover:bg-muted"
                            onClick={() => saveReferences([...referenceIds, result.id])}
                            type="button"
                          >
                            #{result.ticket_no ?? '-'} {result.title}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </dd>
            </div>

            <EditableDetailRow
              isEditing={editingField === 'due_at'}
              label="Due date"
              onCancel={cancelEditField}
              onEdit={() => startEditField('due_at')}
              onSave={() => saveField('due_at')}
              pending={isTicketPending}
              view={<ReadOnlyValue value={formatDateTime(ticket.due_at)} />}
            >
              <input
                className="w-full rounded-md border border-input px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                onChange={(event) => setDraftTicket((prev) => ({ ...prev, due_at: event.target.value }))}
                type="date"
                value={draftTicket.due_at}
              />
            </EditableDetailRow>

            <EditableDetailRow
              isEditing={editingField === 'labels'}
              label="Labels"
              onCancel={cancelEditField}
              onEdit={() => startEditField('labels')}
              onSave={() => saveField('labels')}
              pending={isTicketPending}
              view={<ReadOnlyValue value={ticket.labels?.length ? ticket.labels.join(', ') : '-'} />}
            >
              <input
                className="w-full rounded-md border border-input px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                onChange={(event) => setDraftTicket((prev) => ({ ...prev, labels: event.target.value }))}
                placeholder="bug, qa, backend"
                value={draftTicket.labels}
              />
            </EditableDetailRow>

            <div className="grid grid-cols-[120px_1fr] gap-3 py-2.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-mutedForeground">Created</dt>
              <dd className="text-sm text-foreground">{formatDateTime(ticket.created_at)}</dd>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-3 py-2.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-mutedForeground">Updated</dt>
              <dd className="text-sm text-foreground">{formatDateTime(ticket.updated_at)}</dd>
            </div>
          </dl>
          {ticketError ? <p className="mt-2 text-sm text-red-600">{ticketError}</p> : null}
        </aside>
      </section>
    </>
  );
}

function InlineEditorActions({ pending, onSave, onCancel }: { pending: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-2">
      <button className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-primary/90" disabled={pending} onClick={onSave} type="button">
        {pending ? 'Saving...' : 'Save'}
      </button>
      <button className="rounded-md border border-input px-2.5 py-1 text-xs text-foreground/80 hover:bg-muted" onClick={onCancel} type="button">
        Cancel
      </button>
    </div>
  );
}

function EditableDetailRow({
  label,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  pending,
  children,
  view
}: {
  label: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  pending: boolean;
  children: ReactNode;
  view: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-start gap-3 py-2.5">
      <dt className="text-xs font-semibold uppercase tracking-wide text-mutedForeground">{label}</dt>
      <dd>
        {isEditing ? (
          <div className="space-y-2">{children}<InlineEditorActions onCancel={onCancel} onSave={onSave} pending={pending} /></div>
        ) : (
          <button className="group inline-flex items-center gap-2 text-left" onClick={onEdit} type="button">
            {view}
            <span className="text-xs text-mutedForeground opacity-0 transition group-hover:opacity-100">Edit</span>
          </button>
        )}
      </dd>
    </div>
  );
}
