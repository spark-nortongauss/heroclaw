'use client';

import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState, useTransition } from 'react';

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
  created_at: string | null;
  updated_at: string | null;
};

type TicketDetailClientProps = {
  ticket: Ticket;
  comments: CommentItem[];
  agents: Agent[];
};

type ActivityTab = 'all' | 'comments' | 'history';

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
        <span key={`${part}-${index}`} className="rounded bg-[#D9FF35]/70 px-1 text-[#111111]">
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
  if (['done', 'closed', 'completed'].includes(normalized)) return 'border-[#D9FF35] bg-[#D9FF35] text-[#111111]';
  if (['open', 'pending', 'todo', 'in_progress', 'in progress', 'ongoing'].includes(normalized)) {
    return 'border-[#808080] bg-white text-[#4b4b4b] shadow-[inset_3px_0_0_#D9FF35]';
  }
  return 'border-[#808080] bg-white text-[#4b4b4b]';
}

function priorityPillClasses(priority: string | null | undefined) {
  const normalized = (priority ?? '').toLowerCase();
  if (normalized.includes('high') || normalized.includes('urgent')) return 'border-[#D9FF35] bg-[#D9FF35]/60 text-[#111111]';
  if (normalized.includes('medium')) return 'border-[#808080] bg-[#D9FF35]/25 text-[#2b2b2b]';
  if (normalized.includes('low')) return 'border-[#808080] bg-white text-[#4b4b4b]';
  return 'border-[#808080] bg-white text-[#4b4b4b]';
}

function ReadOnlyValue({ value }: { value: string | null | undefined }) {
  return <span className="text-sm text-[#111111]">{value && value.length > 0 ? value : '-'}</span>;
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const blurTimeoutRef = useRef<number | null>(null);
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

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

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
      <header className="animate-[fadein_.2s_ease] rounded-xl border border-[#808080]/35 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#808080]">Ticket #{ticket.ticket_no ?? '-'}</p>
        <div className="mt-2">
          {editingField === 'title' ? (
            <div className="space-y-2">
              <input
                className="w-full rounded-md border border-[#808080]/50 px-3 py-2 text-2xl font-semibold text-[#111111] outline-none transition focus:ring-2 focus:ring-[#D9FF35]"
                onChange={(event) => setDraftTicket((prev) => ({ ...prev, title: event.target.value }))}
                value={draftTicket.title}
              />
              <div className="flex gap-2">
                <button className="rounded-md bg-[#D9FF35] px-3 py-1.5 text-sm font-medium text-[#111111] hover:bg-[#cfe92f]" onClick={() => saveField('title')} type="button">
                  {isTicketPending ? 'Saving...' : 'Save'}
                </button>
                <button className="rounded-md border border-[#808080]/50 px-3 py-1.5 text-sm text-[#4b4b4b] hover:bg-[#808080]/10" onClick={cancelEditField} type="button">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="group flex w-full items-center justify-between text-left text-[#111111]"
              onClick={() => startEditField('title')}
              type="button"
            >
              <h1 className="text-2xl font-semibold text-[#111111]">{ticket.title}</h1>
              <span className="text-xs text-[#808080] opacity-0 transition group-hover:opacity-100">Edit</span>
            </button>
          )}
        </div>
        {ticketError ? <p className="mt-2 text-sm text-red-600">{ticketError}</p> : null}
      </header>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_320px]">
        <div className="space-y-5">
          <section className="animate-[fadein_.25s_ease] rounded-xl border border-[#808080]/35 bg-white p-5 shadow-sm">
            <div className="group flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#808080]">Description</h2>
              {editingField !== 'description' ? (
                <button className="text-xs text-[#808080] opacity-0 transition group-hover:opacity-100" onClick={() => startEditField('description')} type="button">
                  Edit
                </button>
              ) : null}
            </div>

            {editingField === 'description' ? (
              <div className="mt-3 space-y-2 overflow-hidden transition-all">
                <textarea
                  className="min-h-[140px] w-full rounded-md border border-[#808080]/50 p-3 text-sm leading-6 text-[#1f1f1f] outline-none focus:ring-2 focus:ring-[#D9FF35]"
                  onChange={(event) => setDraftTicket((prev) => ({ ...prev, description: event.target.value }))}
                  value={draftTicket.description}
                />
                <div className="flex gap-2">
                  <button className="rounded-md bg-[#D9FF35] px-3 py-1.5 text-sm font-medium text-[#111111] hover:bg-[#cfe92f]" onClick={() => saveField('description')} type="button">
                    {isTicketPending ? 'Saving...' : 'Save'}
                  </button>
                  <button className="rounded-md border border-[#808080]/50 px-3 py-1.5 text-sm text-[#4b4b4b] hover:bg-[#808080]/10" onClick={cancelEditField} type="button">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#1f1f1f]">{ticket.description ?? '(No description provided)'}</p>
            )}
          </section>

          <section className="rounded-xl border border-[#808080]/35 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#808080]">Activity</h2>

            <div className="mt-4 border-b border-[#808080]/30">
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
                        isActive ? 'border-b-2 border-[#D9FF35] bg-[#D9FF35]/25 text-[#111111]' : 'text-[#808080] hover:-translate-y-px hover:text-[#4b4b4b]'
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
                    <p className="text-sm text-[#808080]">No comments yet.</p>
                  ) : (
                    comments.map((comment) => (
                      <article key={comment.id} className="group relative pl-11">
                        <span className="absolute left-4 top-10 h-[calc(100%-1.5rem)] w-px bg-[#808080]/20" aria-hidden="true" />
                        <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#808080]/20 text-xs font-semibold text-[#4b4b4b]">
                          {avatarInitial(comment.author?.label)}
                        </div>

                        <div className="rounded-lg border border-[#808080]/35 p-3 shadow-sm transition hover:shadow">
                          <header className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-[#808080]">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-[#111111]">{comment.author?.label ?? 'Unknown'}</span>
                              <span className="rounded border border-[#808080]/40 bg-[#808080]/10 px-1.5 py-0.5">{comment.author?.department ?? 'unknown'}</span>
                              <span>{formatDateTime(comment.created_at)}</span>
                            </div>
                            {editingCommentId !== comment.id ? (
                              <button
                                className="text-xs text-[#808080] opacity-0 transition group-hover:opacity-100 hover:text-[#111111]"
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
                                className="min-h-[100px] w-full rounded-md border border-[#808080]/50 p-2 text-sm text-[#111111] outline-none focus:ring-2 focus:ring-[#D9FF35]"
                                onChange={(event) => setEditingCommentBody(event.target.value)}
                                value={editingCommentBody}
                              />
                              {commentError ? <p className="text-sm text-red-600">{commentError}</p> : null}
                              <div className="flex gap-2">
                                <button className="rounded-md bg-[#D9FF35] px-3 py-1.5 text-sm font-medium text-[#111111] hover:bg-[#cfe92f]" disabled={isCommentPending} onClick={saveComment} type="button">
                                  {isCommentPending ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  className="rounded-md border border-[#808080]/50 px-3 py-1.5 text-sm text-[#4b4b4b] hover:bg-[#808080]/10"
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
                            <p className="whitespace-pre-wrap text-sm text-[#1f1f1f]">{highlightMentions(comment.body)}</p>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>

                <div className="rounded-lg border border-[#808080]/35 p-4">
                  <h3 className="text-sm font-semibold text-[#111111]">Add comment</h3>
                  <p className="mt-1 text-xs text-[#808080]">Type @ to mention an agent</p>

                  <div className="relative mt-3">
                    <textarea
                      id="comment-body"
                      className="min-h-[120px] w-full rounded-md border border-[#808080]/50 p-2 text-sm text-[#111111] outline-none ring-[#D9FF35] transition focus:ring-2"
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
                      <div aria-label={`Mention suggestions for ${query}`} className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border border-[#808080]/40 bg-white shadow">
                        {results.map((agent, index) => (
                          <button
                            key={agent.id}
                            className={`block w-full px-3 py-2 text-left text-sm hover:bg-[#808080]/10 ${index === activeIndex ? 'bg-[#808080]/10' : ''}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleSelectMention(agent)}
                            type="button"
                          >
                            <span className="font-medium">{agent.display_name}</span>
                            <span className="ml-2 text-[#808080]">{agent.department ?? 'Unknown'}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : <p className="mt-2 h-5 text-sm" aria-hidden="true" />}

                  <div className="mt-2 flex justify-end">
                    <button
                      className="rounded-md bg-[#D9FF35] px-3 py-2 text-sm font-medium text-[#111111] hover:bg-[#cfe92f] disabled:cursor-not-allowed disabled:bg-[#808080]/30 disabled:text-[#808080]"
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
              <div className="mt-5 rounded-lg border border-[#808080]/50 border-dashed p-6 text-sm text-[#808080]">Coming soon.</div>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-[#808080]/35 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#808080]">Details</h2>
          <dl className="mt-3 divide-y divide-[#808080]/25">
            <div className="grid grid-cols-[120px_1fr] items-start gap-3 py-2.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#808080]">Status</dt>
              <dd>
                {editingField === 'status' ? (
                  <div className="space-y-2">
                    <input
                      className="w-full rounded-md border border-[#808080]/50 px-2 py-1.5 text-sm text-[#111111] outline-none focus:ring-2 focus:ring-[#D9FF35]"
                      onChange={(event) => setDraftTicket((prev) => ({ ...prev, status: event.target.value }))}
                      value={draftTicket.status}
                    />
                    <InlineEditorActions onCancel={cancelEditField} onSave={() => saveField('status')} pending={isTicketPending} />
                  </div>
                ) : (
                  <button className="group inline-flex items-center gap-2 text-[#111111]" onClick={() => startEditField('status')} type="button">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusPillClasses(ticket.status)}`}>
                      {ticket.status ?? 'Unset'}
                    </span>
                    <span className="text-xs text-[#808080] opacity-0 transition group-hover:opacity-100">Edit</span>
                  </button>
                )}
              </dd>
            </div>

            <EditableDetailRow
              isEditing={editingField === 'priority'}
              label="Priority"
              onCancel={cancelEditField}
              onEdit={() => startEditField('priority')}
              onSave={() => saveField('priority')}
              pending={isTicketPending}
              view={
                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${priorityPillClasses(ticket.priority)}`}>
                  {ticket.priority ?? 'Unset'}
                </span>
              }
            >
              <input
                className="w-full rounded-md border border-[#808080]/50 px-2 py-1.5 text-sm text-[#111111] outline-none focus:ring-2 focus:ring-[#D9FF35]"
                onChange={(event) => setDraftTicket((prev) => ({ ...prev, priority: event.target.value }))}
                value={draftTicket.priority}
              />
            </EditableDetailRow>

            <EditableDetailRow
              isEditing={editingField === 'owner_agent_id'}
              label="Assignee"
              onCancel={cancelEditField}
              onEdit={() => startEditField('owner_agent_id')}
              onSave={() => saveField('owner_agent_id')}
              pending={isTicketPending}
              view={<ReadOnlyValue value={agentById.get(ticket.owner_agent_id ?? '')?.label ?? 'Unassigned'} />}
            >
              <select
                className="w-full rounded-md border border-[#808080]/50 px-2 py-1.5 text-sm text-[#111111] outline-none focus:ring-2 focus:ring-[#D9FF35]"
                onChange={(event) => setDraftTicket((prev) => ({ ...prev, owner_agent_id: event.target.value }))}
                value={draftTicket.owner_agent_id}
              >
                <option value="">Unassigned</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.label}
                  </option>
                ))}
              </select>
            </EditableDetailRow>

            <EditableDetailRow
              isEditing={editingField === 'reporter_agent_id'}
              label="Reporter"
              onCancel={cancelEditField}
              onEdit={() => startEditField('reporter_agent_id')}
              onSave={() => saveField('reporter_agent_id')}
              pending={isTicketPending}
              view={<ReadOnlyValue value={agentById.get(ticket.reporter_agent_id ?? '')?.label ?? 'Unknown'} />}
            >
              <select
                className="w-full rounded-md border border-[#808080]/50 px-2 py-1.5 text-sm text-[#111111] outline-none focus:ring-2 focus:ring-[#D9FF35]"
                onChange={(event) => setDraftTicket((prev) => ({ ...prev, reporter_agent_id: event.target.value }))}
                value={draftTicket.reporter_agent_id}
              >
                <option value="">Unknown</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.label}
                  </option>
                ))}
              </select>
            </EditableDetailRow>

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
                className="w-full rounded-md border border-[#808080]/50 px-2 py-1.5 text-sm text-[#111111] outline-none focus:ring-2 focus:ring-[#D9FF35]"
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
                className="w-full rounded-md border border-[#808080]/50 px-2 py-1.5 text-sm text-[#111111] outline-none focus:ring-2 focus:ring-[#D9FF35]"
                onChange={(event) => setDraftTicket((prev) => ({ ...prev, labels: event.target.value }))}
                placeholder="bug, qa, backend"
                value={draftTicket.labels}
              />
            </EditableDetailRow>

            <div className="grid grid-cols-[120px_1fr] gap-3 py-2.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#808080]">Created</dt>
              <dd className="text-sm text-[#111111]">{formatDateTime(ticket.created_at)}</dd>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-3 py-2.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#808080]">Updated</dt>
              <dd className="text-sm text-[#111111]">{formatDateTime(ticket.updated_at)}</dd>
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
      <button className="rounded-md bg-[#D9FF35] px-2.5 py-1 text-xs font-medium text-[#111111] hover:bg-[#cfe92f]" disabled={pending} onClick={onSave} type="button">
        {pending ? 'Saving...' : 'Save'}
      </button>
      <button className="rounded-md border border-[#808080]/50 px-2.5 py-1 text-xs text-[#4b4b4b] hover:bg-[#808080]/10" onClick={onCancel} type="button">
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
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#808080]">{label}</dt>
      <dd>
        {isEditing ? (
          <div className="space-y-2">{children}<InlineEditorActions onCancel={onCancel} onSave={onSave} pending={pending} /></div>
        ) : (
          <button className="group inline-flex items-center gap-2 text-left" onClick={onEdit} type="button">
            {view}
            <span className="text-xs text-[#808080] opacity-0 transition group-hover:opacity-100">Edit</span>
          </button>
        )}
      </dd>
    </div>
  );
}
