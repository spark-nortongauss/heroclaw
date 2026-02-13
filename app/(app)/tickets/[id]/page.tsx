'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  author_agent_id: string | null;
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');

  useEffect(() => {
    const load = async () => {
      const ticketRes = await supabase.from('mc_tickets').select('id,title,description,status').eq('id', id).single();
      const commentsRes = await supabase
        .from('mc_comments')
        .select('id, body, created_at, author_agent_id')
        .eq('ticket_id', id)
        .order('created_at');
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
  };

  const addComment = async (e: FormEvent) => {
    e.preventDefault();
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from('mc_comments').insert({
      ticket_id: id,
      body: commentBody,
      author_user_id: auth.user?.id ?? null
    });
    setCommentBody('');
  };

  if (!ticket) return <p>Loading ticket...</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-4">
        <h2 className="text-xl font-semibold">{ticket.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{ticket.description ?? 'No description'}</p>
        <div className="mt-3 max-w-xs">
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
      </div>

      <div className="rounded-md border p-4">
        <h3 className="mb-3 text-lg font-medium">Comments</h3>
        <div className="space-y-2">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-md bg-muted p-3 text-sm">
              <p>{comment.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
        <form onSubmit={addComment} className="mt-4 space-y-2">
          <Textarea value={commentBody} onChange={(e) => setCommentBody(e.target.value)} placeholder="Add a comment" required />
          <Button type="submit">Add Comment</Button>
        </form>
      </div>
    </div>
  );
}
