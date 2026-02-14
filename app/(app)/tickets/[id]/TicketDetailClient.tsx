'use client';

import { useMemo, useState, useTransition } from 'react';

import { createTicketComment } from './actions';

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

type TicketDetailClientProps = {
  ticketId: string;
  comments: CommentItem[];
  agents: Agent[];
};

type ActivityTab = 'all' | 'comments' | 'history';

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function highlightMentions(body: string) {
  const parts = body.split(/(@[\w.-]+)/g);

  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span key={`${part}-${index}`} className="rounded bg-blue-100 px-1 text-blue-700">
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

export default function TicketDetailClient({ ticketId, comments, agents }: TicketDetailClientProps) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActivityTab>('comments');
  const [isPending, startTransition] = useTransition();

  const mentionState = useMemo(() => {
    const matches = body.match(/(?:^|\s)@([\w.-]*)$/);
    if (!matches) return null;

    const query = matches[1]?.toLowerCase() ?? '';
    const startIndex = body.lastIndexOf(`@${matches[1]}`);
    if (startIndex < 0) return null;

    return { query, startIndex, tokenLength: matches[1].length + 1 };
  }, [body]);

  const filteredAgents = useMemo(() => {
    if (!mentionState) return [];

    return agents
      .filter((agent) => agent.label.toLowerCase().includes(mentionState.query))
      .slice(0, 8);
  }, [agents, mentionState]);

  const handleSelectMention = (agent: Agent) => {
    if (!mentionState) return;

    const before = body.slice(0, mentionState.startIndex);
    const after = body.slice(mentionState.startIndex + mentionState.tokenLength);
    setBody(`${before}@${agent.label} ${after}`);
  };

  const parseMentionAgentIds = () => {
    const found = new Set<string>();

    for (const agent of agents) {
      const escaped = agent.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|\\s)@${escaped}(?=\\s|$)`, 'g');
      if (regex.test(body)) {
        found.add(agent.id);
      }
    }

    return Array.from(found);
  };

  const submitComment = () => {
    setError(null);

    startTransition(async () => {
      const result = await createTicketComment({
        ticketId,
        body,
        mentionsAgentIds: parseMentionAgentIds()
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setBody('');
    });
  };

  return (
    <section className="rounded-xl border bg-white p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Activity</h2>

      <div className="mt-4 border-b">
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
                className={`rounded-t-md px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'
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
              <p className="text-sm text-gray-500">No comments yet.</p>
            ) : (
              comments.map((comment) => (
                <article key={comment.id} className="relative pl-11">
                  <span className="absolute left-4 top-10 h-[calc(100%-1.5rem)] w-px bg-gray-200" aria-hidden="true" />
                  <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
                    {avatarInitial(comment.author?.label)}
                  </div>

                  <div className="rounded-lg border p-3">
                    <header className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                      <span className="text-sm font-semibold text-gray-900">{comment.author?.label ?? 'Unknown'}</span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5">
                        {comment.author?.department ?? 'unknown'}
                      </span>
                      <span>{formatDateTime(comment.created_at)}</span>
                    </header>
                    <p className="whitespace-pre-wrap text-sm text-gray-800">{highlightMentions(comment.body)}</p>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold text-gray-900">Add comment</h3>
            <p className="mt-1 text-xs text-gray-500">Type @ to mention an agent</p>

            <div className="relative mt-3">
              <textarea
                id="comment-body"
                className="min-h-[120px] w-full rounded-md border p-2 text-sm outline-none ring-blue-500 focus:ring"
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write a comment"
                value={body}
              />
              {mentionState && filteredAgents.length > 0 ? (
                <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border bg-white shadow">
                  {filteredAgents.map((agent) => (
                    <button
                      key={agent.id}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                      onClick={() => handleSelectMention(agent)}
                      type="button"
                    >
                      <span className="font-medium">{agent.label}</span>
                      <span className="ml-2 text-gray-500">{agent.department ?? 'Unknown'}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : <p className="mt-2 h-5 text-sm" aria-hidden="true" />}

            <div className="mt-2 flex justify-end">
              <button
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                disabled={isPending || body.trim().length === 0}
                onClick={submitComment}
                type="button"
              >
                {isPending ? 'Posting...' : 'Post comment'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed p-6 text-sm text-gray-500">Coming soon.</div>
      )}
    </section>
  );
}
