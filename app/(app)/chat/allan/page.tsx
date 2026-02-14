'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

type Message = {
  id: string;
  body: string;
  sender_type: 'user' | 'agent';
  created_at: string;
};

function createMessage(body: string, senderType: Message['sender_type']): Message {
  return {
    id: `${Date.now()}-${Math.random()}`,
    body,
    sender_type: senderType,
    created_at: new Date().toISOString()
  };
}

function mergeMessages(existing: Message[], incoming: Message[]) {
  const seen = new Set(existing.map((msg) => msg.id));
  const merged = [...existing];

  for (const msg of incoming) {
    if (!seen.has(msg.id)) {
      merged.push(msg);
      seen.add(msg.id);
    }
  }

  return merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export default function AllanChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const gatewayUrl = useMemo(() => {
    const rawUrl = process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_URL?.trim();
    if (!rawUrl) return null;
    if (rawUrl.startsWith('wss://')) return rawUrl;
    if (rawUrl.startsWith('https://')) return `wss://${rawUrl.slice('https://'.length)}`;
    return rawUrl.replace(/^ws:\/\//, 'wss://');
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const latestTimestamp = useMemo(() => {
    if (!messages.length) return undefined;
    return messages[messages.length - 1]?.created_at;
  }, [messages]);

  useEffect(() => {
    let stopped = false;

    const poll = async () => {
      try {
        const params = latestTimestamp ? `?since=${encodeURIComponent(latestTimestamp)}` : '';
        const response = await fetch(`/api/allan-chat/history${params}`, { cache: 'no-store' });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { messages?: Message[] };
        if (stopped || !Array.isArray(data.messages) || !data.messages.length) {
          return;
        }

        setMessages((prev) => mergeMessages(prev, data.messages || []));
      } catch {
        // non-blocking polling fallback
      }
    };

    poll();
    const interval = setInterval(poll, 3000);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [latestTimestamp]);

  useEffect(() => {
    if (!gatewayUrl) {
      setError('Missing NEXT_PUBLIC_OPENCLAW_GATEWAY_URL');
      return;
    }

    const base = process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_URL!;
    const token = process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN!;
    const url = new URL(base);
    url.searchParams.set("token", token);
    const socket = new WebSocket(url.toString());
    socketRef.current = socket;

    socket.onopen = () => {
      setError(null);
    };

    socket.onmessage = (event) => {
      const payload = typeof event.data === 'string' ? event.data : '';

      try {
        const data = JSON.parse(payload) as { reply?: string; message?: string; text?: string; body?: string };
        const reply = data.reply || data.message || data.text || data.body;

        if (reply) {
          setMessages((prev) => [...prev, createMessage(reply, 'agent')]);
          return;
        }
      } catch {
        if (payload) {
          setMessages((prev) => [...prev, createMessage(payload, 'agent')]);
        }
      }
    };

    socket.onerror = () => {
      setError('WebSocket connection error');
    };

    socket.onclose = () => {
      socketRef.current = null;
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [gatewayUrl]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const message = body.trim();

    if (!message || sending) {
      return;
    }

    setError(null);
    setSending(true);
    setBody('');
    setMessages((prev) => [...prev, createMessage(message, 'user')]);

    try {
      const socket = socketRef.current;

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket is not connected');
      }

      socket.send(JSON.stringify({ message }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message');
    } finally {
      setSending(false);
    }
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
        <form onSubmit={send} className="border-t p-3">
          <div className="flex gap-2">
            <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message Allan..." required />
            <Button type="submit" disabled={sending}>{sending ? 'Sending...' : 'Send'}</Button>
          </div>
          {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
        </form>
      </Card>
    </div>
  );
}
