'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Message = {
  id: string;
  body: string;
  sender_type: 'user' | 'agent';
  created_at: string;
};

export default function AllanChatPage() {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');

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

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.auth.getUser();
    await supabase.from('mc_chat_messages').insert({
      channel: 'allan',
      sender_type: 'user',
      sender_user_id: data.user?.id ?? null,
      body
    });
    setBody('');
  };

  return (
    <div className="flex h-[calc(100vh-170px)] flex-col rounded-md border">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`max-w-[70%] rounded-lg p-3 text-sm ${msg.sender_type === 'user' ? 'ml-auto bg-primary text-white' : 'bg-muted'}`}>
            <p>{msg.body}</p>
            <p className="mt-1 text-xs opacity-80">{new Date(msg.created_at).toLocaleTimeString()}</p>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t p-3">
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message Allan..." required />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
}
