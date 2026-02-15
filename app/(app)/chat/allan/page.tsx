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
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Keep gatewayUrl as the BASE URL only (no token here).
  // Example env: wss://gw.nortongauss.com
  const gatewayBaseUrl = useMemo(() => {
    const rawUrl = process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_URL?.trim();
    if (!rawUrl) return null;

    try {
      const url = new URL(rawUrl);

      if (url.protocol === 'http:' || url.protocol === 'https:') url.protocol = 'wss:';
      if (url.protocol === 'ws:') url.protocol = 'wss:';

      return url.toString();
    } catch {
      // If it's not parseable, still try to normalize basic ws->wss
      if (rawUrl.startsWith('ws://')) return rawUrl.replace(/^ws:\/\//, 'wss://');
      return rawUrl;
    }
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

        if (!response.ok) return;

        const data = (await response.json()) as { messages?: Message[] };
        if (stopped || !Array.isArray(data.messages) || !data.messages.length) return;

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

  // ✅ WebSocket connection + handshake (token in URL query param)
  useEffect(() => {
    if (!gatewayBaseUrl) {
      setError('Missing NEXT_PUBLIC_OPENCLAW_GATEWAY_URL');
      setConnected(false);
      return;
    }

    const token = process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN?.trim();
    if (!token) {
      setError('Missing NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN');
      setConnected(false);
      return;
    }

    // Build ws URL with ?token=... (this is what your Network tab should show)
    let wsUrl = gatewayBaseUrl;
    try {
      const u = new URL(gatewayBaseUrl);
      if (!u.searchParams.has('token')) u.searchParams.set('token', token);
      wsUrl = u.toString();
    } catch {
      // If base isn't parseable, append token anyway
      wsUrl += (wsUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
    }

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    setConnected(false);

    // HMAC-SHA256(nonce, token) -> base64url
    const signNonce = async (nonce: string) => {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(token),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(nonce));
      const base64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    socket.onopen = () => {
      // Not "connected" until we receive connect.ok/ready
      setError(null);
    };

    socket.onmessage = async (event) => {
      const payload = typeof event.data === 'string' ? event.data : '';
      if (!payload) return;

      try {
        const data = JSON.parse(payload) as {
          type?: string;
          event?: string;
          payload?: { nonce?: string };
          reply?: string;
          message?: string;
          text?: string;
          body?: string;
        };

        // Challenge -> response
        if (data.type === 'event' && data.event === 'connect.challenge' && data.payload?.nonce) {
          const nonce = data.payload.nonce;
          const signature = await signNonce(nonce);

          // IMPORTANT: send ONE response, and use the "signature" field
          socket.send(
            JSON.stringify({
              type: 'event',
              event: 'connect.response',
              payload: { nonce, signature }
            })
          );
          return;
        }

        // Connected events
        if (data.type === 'event' && ['connect.ok', 'connect.connected', 'connect.ready'].includes(data.event || '')) {
          setConnected(true);
          setError(null);
          return;
        }

        // Normal replies
        const reply = data.reply || data.message || data.text || data.body;
        if (reply) {
          setMessages((prev) => [...prev, createMessage(reply, 'agent')]);
        }
      } catch {
        // Non-JSON messages
        setMessages((prev) => [...prev, createMessage(payload, 'agent')]);
      }
    };

    socket.onerror = () => {
      setConnected(false);
      setError('WebSocket connection error');
    };

    socket.onclose = () => {
      setConnected(false);
      socketRef.current = null;
    };

    return () => {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      try {
        socket.close();
      } catch {}
      setConnected(false);
      socketRef.current = null;
    };
  }, [gatewayBaseUrl]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const message = body.trim();

    if (!message || sending) return;

    setError(null);
    setSending(true);
    setBody('');
    setMessages((prev) => [...prev, createMessage(message, 'user')]);

    try {
      const socket = socketRef.current;

      if (!socket || socket.readyState !== WebSocket.OPEN || !connected) {
        throw new Error('WebSocket is not connected');
      }

      // Keep your current send format
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
            <div
              key={msg.id}
              className={`max-w-[72%] rounded-lg p-3 text-sm ${
                msg.sender_type === 'user' ? 'ml-auto bg-primary text-brandDark' : 'bg-muted'
              }`}
            >
              <p>{msg.body}</p>
              <p className="mt-1 text-xs opacity-75">{new Date(msg.created_at).toLocaleTimeString()}</p>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form onSubmit={send} className="border-t p-3">
          <div className="flex gap-2">
            <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message Allan..." required />
            <Button type="submit" disabled={sending || !connected}>
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </div>
          {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
        </form>
      </Card>
    </div>
  );
}
