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

export default function TicketDetailClient({ ticketId, comments, agents }: TicketDetailClientProps) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
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
    <section className="space-y-6 rounded-lg border bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Activity</h2>
      </div>

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500">No comments yet</p>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-lg border p-4">
              <header className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-semibold text-gray-900">{comment.author?.label ?? 'Unknown'}</span>
                <span className="text-gray-500">{comment.author?.department ?? 'Unknown'}</span>
                <span className="text-gray-400">{formatDateTime(comment.created_at)}</span>
              </header>
              <p className="whitespace-pre-wrap text-sm text-gray-800">{highlightMentions(comment.body)}</p>
            </article>
          ))
        )}
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <label className="text-sm font-medium text-gray-700" htmlFor="comment-body">
          Add comment
        </label>
        <div className="relative">
          <textarea
            id="comment-body"
            className="min-h-[120px] w-full rounded-md border p-2 text-sm outline-none ring-blue-500 focus:ring"
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write a comment. Type @ to mention an agent."
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

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div>
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
    </section>
  );
}
