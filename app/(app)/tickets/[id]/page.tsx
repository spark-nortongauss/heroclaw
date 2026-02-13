'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { MessageSquare, Paperclip, UserPlus } from 'lucide-react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { PriorityBadge } from '@/components/ui/priority-badge';
import { TicketDetailsLayout } from '@/components/ui/ticket-details-layout';
import { useToast } from '@/components/ui/toast';

type Ticket = {
  id: string;
  title: string;
  description: string | null;
  status: 'not_done' | 'ongoing' | 'done';
  meta?: {
    ticketKey?: string;
    ticketNo?: number | string;
    slug?: string;
    [key: string]: unknown;
  };
};

type Comment = {
  id: string;
  body: string;
  created_at: string;
  author_agent_id: string;
  note_type: string;
};

type StorageItem = {
  name: string;
  id?: string;
  updated_at?: string;
  metadata?: {
    size?: number;
  };
};

type Attachment = {
  path: string;
  name: string;
  size: number | null;
  updatedAt: string | null;
};

const ATTACHMENT_BUCKET = 'mc-artifacts';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const formatBytes = (value: number | null) => {
  if (value === null) return 'Unknown size';
  if (value < 1024) return `${value} B`;

  const units = ['KB', 'MB', 'GB'];
  let size = value / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatUpdatedAt = (value: string | null) => (value ? new Date(value).toLocaleString() : 'Unknown date');

const listWithOneLevelDepth = async (supabase: ReturnType<typeof createClient>, prefix: string) => {
  const normalizedPrefix = prefix.replace(/^\/+/, '').replace(/\/$/, '');
  const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET).list(normalizedPrefix, {
    limit: 100,
    sortBy: { column: 'updated_at', order: 'desc' }
  });

  if (error) throw error;

  const rootItems = (data ?? []) as StorageItem[];
  const files: Attachment[] = [];
  const folders: string[] = [];

  rootItems.forEach((item) => {
    if (!item.id) {
      folders.push(item.name);
      return;
    }

    files.push({
      path: `${normalizedPrefix}/${item.name}`,
      name: item.name,
      size: item.metadata?.size ?? null,
      updatedAt: item.updated_at ?? null
    });
  });

  const nestedFiles = await Promise.all(
    folders.map(async (folderName) => {
      const nestedPrefix = `${normalizedPrefix}/${folderName}`;
      const { data: nestedData, error: nestedError } = await supabase.storage.from(ATTACHMENT_BUCKET).list(nestedPrefix, {
        limit: 100,
        sortBy: { column: 'updated_at', order: 'desc' }
      });

      if (nestedError) throw nestedError;

      return ((nestedData ?? []) as StorageItem[])
        .filter((item) => Boolean(item.id))
        .map((item) => ({
          path: `${nestedPrefix}/${item.name}`,
          name: item.name,
          size: item.metadata?.size ?? null,
          updatedAt: item.updated_at ?? null
        }));
    })
  );

  return [...files, ...nestedFiles.flat()];
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);
  const { notify } = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [pulseStatus, setPulseStatus] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsPrefix, setAttachmentsPrefix] = useState<string | null>(null);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const humanAgentId = process.env.NEXT_PUBLIC_HUMAN_AGENT_ID;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: ticketData, error: ticketError } = await supabase
          .from('mc_tickets')
          .select('id,title,description,status,meta')
          .eq('id', id)
          .maybeSingle();

        if (ticketError) throw ticketError;
        setTicket(ticketData ?? null);

        const { data: commentsData, error: commentsError } = await supabase
          .from('mc_ticket_comments')
          .select('id, body, created_at, author_agent_id, note_type')
          .eq('ticket_id', id)
          .order('created_at');

        if (commentsError) throw commentsError;

        const loadedComments = commentsData ?? [];
        setComments(loadedComments);

        const uniqueAuthorIds = [...new Set(loadedComments.map((comment) => comment.author_agent_id).filter(Boolean))];
        if (uniqueAuthorIds.length > 0) {
          const { data: agentsData, error: agentsError } = await supabase.from('mc_agents').select('id, name').in('id', uniqueAuthorIds);

          if (agentsError) throw agentsError;
          if (agentsData) {
            setAgentNames(Object.fromEntries(agentsData.map((agent) => [agent.id, agent.name ?? agent.id])));
          }
        } else {
          setAgentNames({});
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load ticket details.';
        console.error('Failed to load ticket detail page data', loadError);
        setError(message);
        setTicket(null);
        setComments([]);
        setAgentNames({});
      } finally {
        setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel(`ticket-comments-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mc_ticket_comments', filter: `ticket_id=eq.${id}` }, (payload) => {
        setComments((prev) => [...prev, payload.new as Comment]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, supabase]);

  useEffect(() => {
  if (!ticket) return;

  // If user came from the tickets list clicking the paperclip,
  // they land here with #attachments and we auto-scroll.
  if (typeof window !== 'undefined' && window.location.hash === '#attachments') {
    const attachmentsSection = document.getElementById('attachments');
    attachmentsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const loadAttachments = async () => {
    setAttachmentsLoading(true);

    try {
      const meta = ticket.meta ?? {};
      const ticketNo = meta.ticketNo ? String(meta.ticketNo) : '';
      const fallbackTicketKey = `MC-${ticket.id.slice(0, 6).toUpperCase()}`;
      const ticketKey =
        typeof meta.ticketKey === 'string' && meta.ticketKey.trim().length > 0
          ? meta.ticketKey
          : fallbackTicketKey;

      const slugCandidate =
        typeof meta.slug === 'string' && meta.slug.trim().length > 0
          ? meta.slug
          : slugify(ticket.title);

      const prefixes = [
        `artifacts/${ticketKey}`,
        `artifacts/${ticketKey}-${slugCandidate}`,
        ticketNo ? `artifacts/TICKET-${ticketNo}-${slugCandidate}` : null,
        `artifacts/${ticket.id}`,
      ].filter((prefix): prefix is string => Boolean(prefix));

      let matchedPrefix: string | null = null;
      let matchedFiles: Attachment[] = [];

      for (const prefix of prefixes) {
        const files = await listWithOneLevelDepth(supabase, prefix);
        if (files.length > 0) {
          matchedPrefix = prefix;
          matchedFiles = files;
          break;
        }
      }

      setAttachmentsPrefix(matchedPrefix);
      setAttachments(matchedFiles);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load attachments.';
      notify(message, 'error');
      setAttachmentsPrefix(null);
      setAttachments([]);
    } finally {
      setAttachmentsLoading(false);
    }
  };

  loadAttachments();
  }, [notify, supabase, ticket]);


  const updateStatus = async (status: Ticket['status']) => {
    await supabase.from('mc_tickets').update({ status }).eq('id', id);
    setTicket((prev) => (prev ? { ...prev, status } : prev));
    setPulseStatus(true);
    window.setTimeout(() => setPulseStatus(false), 800);
    notify('Ticket status updated.');
  };

  const addComment = async (e: FormEvent) => {
    e.preventDefault();

    if (!humanAgentId) {
      notify('Missing NEXT_PUBLIC_HUMAN_AGENT_ID', 'error');
      return;
    }

    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      notify('You must be logged in to comment.', 'error');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('mc_ticket_comments').insert({
      ticket_id: id,
      body: commentBody,
      author_agent_id: humanAgentId,
      note_type: 'comment'
    });

    if (error) {
      notify(error.message, 'error');
    } else {
      notify('Comment added.');
      setCommentBody('');
    }

    setSaving(false);
  };

  const downloadAttachment = async (path: string) => {
    const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(path, 60);

    if (error || !data?.signedUrl) {
      notify(error?.message ?? 'Unable to create download link.', 'error');
      return;
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const issueKey = useMemo(() => `MC-${id.slice(0, 6).toUpperCase()}`, [id]);
  const priority = ticket?.status === 'ongoing' ? 'high' : ticket?.status === 'done' ? 'low' : 'medium';

  if (loading) {
    return <p className="text-body">Loading ticket...</p>;
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">Unable to load ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!ticket) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Ticket not found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-mutedForeground">No ticket was found for id: {id}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="page-transition space-y-4">
      <TicketDetailsLayout
        main={
          <>
            <Card className="border-border/80 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6B778C]">{issueKey}</p>
                    <h1 className="text-2xl font-semibold text-[#172B4D]">{ticket.title}</h1>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" className="transition-colors hover:bg-muted/80">
                      <MessageSquare className="mr-1 h-4 w-4" />
                      Comment
                    </Button>
                    <Button variant="secondary" size="sm" className="transition-colors hover:bg-muted/80">
                      <UserPlus className="mr-1 h-4 w-4" />
                      Assign
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={ticket.status} pulse={pulseStatus} />
                  <Select value={ticket.status} onValueChange={(value: Ticket['status']) => updateStatus(value)}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_done">To Do</SelectItem>
                      <SelectItem value="ongoing">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#172B4D]">{ticket.description ?? 'No description provided.'}</p>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                {attachmentsLoading ? (
                  <p className="text-sm text-mutedForeground">Loading attachments...</p>
                ) : attachments.length === 0 ? (
                  <p className="text-sm text-mutedForeground">No attachments found for this ticket.</p>
                ) : (
                  <div className="space-y-2">
                    {attachmentsPrefix && <p className="text-xs text-[#6B778C]">Source: {attachmentsPrefix}/</p>}
                    {attachments.map((attachment) => (
                      <div key={attachment.path} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/80 p-3">
                        <div>
                          <p className="text-sm font-medium text-[#172B4D]">{attachment.name}</p>
                          <p className="text-xs text-[#6B778C]">
                            {formatBytes(attachment.size)} · Updated {formatUpdatedAt(attachment.updatedAt)}
                          </p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => downloadAttachment(attachment.path)}>
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {comments.length === 0 && <p className="text-sm text-mutedForeground">No comments yet.</p>}
                  {comments.map((comment) => (
                    <div key={comment.id} className="rounded-md border border-border/80 bg-[#FAFBFC] p-3">
                      <p className="text-sm leading-relaxed text-[#172B4D]">{comment.body}</p>
                      <p className="mt-2 text-xs text-[#6B778C]">
                        {agentNames[comment.author_agent_id] ?? comment.author_agent_id} · {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card id="attachments" className="scroll-mt-4 border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Paperclip className="h-4 w-4" />
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-mutedForeground">Attachments for this ticket are shown here.</p>
              </CardContent>
            </Card>

            <Card className="sticky bottom-4 border-border/80 shadow-sm">
              <CardContent className="p-4">
                <form onSubmit={addComment} className="space-y-2">
                  <Textarea
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder="Add a comment"
                    required
                    className="min-h-24"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving} className="transition-colors hover:brightness-95">
                      {saving ? 'Saving...' : 'Add Comment'}
                    </Button>
                  </div>
                  {!humanAgentId && <p className="text-sm text-destructive">Missing NEXT_PUBLIC_HUMAN_AGENT_ID</p>}
                </form>
              </CardContent>
            </Card>
          </>
        }
        side={
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ['Assignee', 'Unassigned'],
                ['Reporter', 'System'],
                ['Status', <StatusBadge key="status" status={ticket.status} />],
                ['Priority', <PriorityBadge key="priority" priority={priority} />],
                ['Parent', '—'],
                ['Created', 'Unknown'],
                ['Updated', 'Moments ago'],
                ['Environment', 'Production']
              ].map(([label, value]) => (
                <div key={label as string} className="space-y-1 border-b border-border/60 pb-2 last:border-b-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B778C]">{label}</p>
                  <div className="text-sm text-[#172B4D]">{value}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        }
      />
    </div>
  );
}
