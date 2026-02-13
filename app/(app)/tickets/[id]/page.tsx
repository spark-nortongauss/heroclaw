'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

  if (!ticket) return <p className="text-body">Loading ticket...</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{ticket.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-body">{ticket.description ?? 'No description'}</p>
          <div className="mt-4 flex max-w-xs items-center gap-2">
            <Badge variant={ticket.status}>{ticket.status}</Badge>
            <Select value={ticket.status} onValueChange={(value: Ticket['status']) => updateStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_done">Not done</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 border-l-2 border-muted pl-4">
            {comments.length === 0 && <p className="text-sm text-mutedForeground">No comments yet.</p>}
            {comments.map((comment) => (
              <div key={comment.id} className="relative rounded-md bg-muted p-3 text-sm">
                <span className="absolute -left-[22px] top-4 h-2.5 w-2.5 rounded-full bg-primary" />
                <p>{comment.body}</p>
                <p className="mt-1 text-xs text-mutedForeground">{new Date(comment.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <form onSubmit={addComment} className="mt-4 space-y-2">
            <Textarea value={commentBody} onChange={(e) => setCommentBody(e.target.value)} placeholder="Add a comment" required />
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Add Comment'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
