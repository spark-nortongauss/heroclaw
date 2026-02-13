'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { MessageSquare, UserPlus } from 'lucide-react';
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
};

type Comment = {
  id: string;
  body: string;
  created_at: string;
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const { notify } = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [pulseStatus, setPulseStatus] = useState(false);

  useEffect(() => {
    const load = async () => {
      const ticketRes = await supabase.from('mc_tickets').select('id,title,description,status').eq('id', id).single();
      const commentsRes = await supabase.from('mc_comments').select('id, body, created_at').eq('ticket_id', id).order('created_at');
      if (!ticketRes.error) setTicket(ticketRes.data);
      if (!commentsRes.error) setComments(commentsRes.data ?? []);
    };

    load();

    const channel = supabase
      .channel(`ticket-comments-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mc_comments', filter: `ticket_id=eq.${id}` }, (payload) => {
        setComments((prev) => [...prev, payload.new as Comment]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, supabase]);

  const updateStatus = async (status: Ticket['status']) => {
    await supabase.from('mc_tickets').update({ status }).eq('id', id);
    setTicket((prev) => (prev ? { ...prev, status } : prev));
    setPulseStatus(true);
    window.setTimeout(() => setPulseStatus(false), 800);
    notify('Ticket status updated.');
  };

  const addComment = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from('mc_comments').insert({
      ticket_id: id,
      body: commentBody,
      author_user_id: auth.user?.id ?? null
    });

    if (error) {
      notify(error.message, 'error');
    } else {
      notify('Comment added.');
      setCommentBody('');
    }

    setSaving(false);
  };

  const issueKey = useMemo(() => `MC-${id.slice(0, 6).toUpperCase()}`, [id]);
  const priority = ticket?.status === 'ongoing' ? 'high' : ticket?.status === 'done' ? 'low' : 'medium';

  if (!ticket) return <p className="text-body">Loading ticket...</p>;

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
                <CardTitle className="text-lg">Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {comments.length === 0 && <p className="text-sm text-mutedForeground">No comments yet.</p>}
                  {comments.map((comment) => (
                    <div key={comment.id} className="rounded-md border border-border/80 bg-[#FAFBFC] p-3">
                      <p className="text-sm leading-relaxed text-[#172B4D]">{comment.body}</p>
                      <p className="mt-2 text-xs text-[#6B778C]">{new Date(comment.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
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
