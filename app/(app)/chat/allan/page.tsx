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

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function toBase64Url(bytes: Uint8Array) {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default function AllanChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<string>('Connecting…');
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Build a WS URL that includes ?token=... (because your DevTools shows that pattern)
  const gatewayUrl = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_URL?.trim();
    const token = process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN?.trim();
    if (!raw) return null;

    // Normalize protocol
    let base = raw;
    if (base.startsWith('http://')) base = 'wss://' + base.slice('http://'.length);
    if (base.startsWith('https://')) base = 'wss://' + base.slice('https://'.length);
    if (base.startsWith('ws://')) base = 'wss://' + base.slice('ws://'.length);

    // If URL parsable, set query token safely
    try {
      const u = new URL(base);
      if (token && !u.searchParams.has('token')) u.searchParams.set('token', token);
      return u.toString();
    } catch {
      // Fallback: append token
      if (!token) return base;
      return base + (base.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const latestTimestamp = useMemo(() => {
    if (!messages.length) return undefined;
    return messages[messages.length - 1]?.created_at;
  }, [messages]);

  // Polling history (non-blocking)
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
        // ignore
      }
    };

    poll();
    const interval = setInterval(poll, 3000);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [latestTimestamp]);

  // WebSocket + challenge-response auth
  useEffect(() => {
    if (!gatewayUrl) {
      setError('Missing NEXT_PUBLIC_OPENCLAW_GATEWAY_URL');
      setConnected(false);
      setStatus('Missing gateway URL');
      return;
    }

    const token = process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN?.trim();
    if (!token) {
      setError('Missing NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN');
      setConnected(false);
      setStatus('Missing gateway token');
      return;
    }

    setError(null);
    setConnected(false);
    setStatus('Connecting…');

    const socket = new WebSocket(gatewayUrl);
    socketRef.current = socket;

    const signNonceBoth = async (nonce: string) => {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(token),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(nonce));
      const bytes = new Uint8Array(sigBuf);
      return {
        hex: toHex(bytes),
        b64url: toBase64Url(bytes)
      };
    };

    socket.onopen = () => {
      setError(null);
      setStatus('WebSocket open; waiting for gateway authentication…');
      // IMPORTANT: do NOT send a "connect" message here.
      // Your gateway sends connect.challenge first (we respond then).
    };

    socket.onmessage = async (event) => {
      const raw = typeof event.data === 'string' ? event.data : '';
      if (!raw) return;

      try {
        const data = JSON.parse(raw) as {
          type?: string;
          event?: string;
          payload?: { nonce?: string };
          reply?: string;
          message?: string;
          text?: string;
          body?: string;
          error?: string;
        };

        // Challenge => respond ONCE
       if (data.event === 'connect.challenge' && data.payload?.nonce) {
  setStatus('Auth challenge received; signing…');

  const nonce = data.payload.nonce;

  // HMAC-SHA256(token, nonce) -> HEX
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(token),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(nonce));
  const sigHex = Array.from(new Uint8Array(sigBuf), (b) => b.toString(16).padStart(2, '0')).join('');

  // ✅ Send ONE minimal frame (no extra fields)
  socket.send(
    JSON.stringify({
      type: 'event',
      event: 'connect.response',
      payload: { nonce, sig: sigHex }
    })
  );

  setStatus('Auth response sent; waiting for connect.ok…');
  return;
}


        // Treat ANY connect.* “ok/ready/connected” as success
        if (
          data.event &&
          ['connect.ok', 'connect.ready', 'connect.connected', 'connect.accepted', 'connect.success'].includes(data.event)
        ) {
          setConnected(true);
          setError(null);
          setStatus('Authenticated ✓');
          return;
        }

        // Some gateways may only send {event:"connect.ok"} without "type"
        if (data.event && data.event.startsWith('connect.') && !connected) {
          // If it’s a connect.* event but not one of the success ones, show it.
          setStatus(`Gateway: ${data.event}`);
          if (data.error) setError(data.error);
          return;
        }

        const reply = data.reply || data.message || data.text || data.body;
        if (reply) {
          setMessages((prev) => [...prev, createMessage(reply, 'agent')]);
          return;
        }
      } catch {
        // Non-JSON messages
        setMessages((prev) => [...prev, createMessage(raw, 'agent')]);
      }
    };

    socket.onerror = () => {
      setConnected(false);
      setError('WebSocket connection error');
      setStatus('WebSocket error');
    };

    socket.onclose = (ev) => {
      setConnected(false);
      socketRef.current = null;

      // This is the key: we surface the REAL reason immediately.
      const reason = ev.reason ? ` — ${ev.reason}` : '';
      setStatus(`Disconnected (code ${ev.code})${reason}`);
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
  }, [gatewayUrl, connected]);

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
        <p className="text-body">
          Collaborate with Allan in real-time.{' '}
          <span className={connected ? 'text-green-600' : 'text-amber-600'}>{status}</span>
        </p>
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
