'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

type Message = {
  id: string;
  body: string;
  sender_type: 'user' | 'agent';
  created_at: string;
};

export default function AllanChatPage() {
  const supabase = createClient();
  const { notify } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('mc_chat_messages')
        .select('id, body, sender_type, created_at')
        .eq('channel', 'allan')
        .order('created_at');
      setMessages((data as Message[]) ?? []);
    };
    load();

    const channel = supabase
      .channel('allan-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mc_chat_messages', filter: 'channel=eq.allan' }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    const { data } = await supabase.auth.getUser();

    const { error } = await supabase.from('mc_chat_messages').insert({
      channel: 'allan',
      sender_type: 'user',
      sender_user_id: data.user?.id ?? null,
      body
    });

    if (error) {
      notify(error.message, 'error');
    }

    setBody('');
    setSending(false);
  };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="h1 font-[var(--font-heading)]">Allan Chat</h1>
        <p className="text-body">Collaborate with Allan in real-time.</p>
      </div>
      <Card className="flex h-[calc(100vh-220px)] flex-col overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`max-w-[72%] rounded-lg p-3 text-sm ${msg.sender_type === 'user' ? 'ml-auto bg-primary text-brandDark' : 'bg-muted'}`}>
              <p>{msg.body}</p>
              <p className="mt-1 text-xs opacity-75">{new Date(msg.created_at).toLocaleTimeString()}</p>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="flex gap-2 border-t p-3">
          <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message Allan..." required />
          <Button type="submit" disabled={sending}>{sending ? 'Sending...' : 'Send'}</Button>
        </form>
      </Card>
    </div>
  );
}
