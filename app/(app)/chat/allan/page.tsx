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

// Helpers for signatures
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
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Base gateway URL (no token appended here)
  const gatewayBaseUrl = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_URL?.trim();
    if (!raw) return null;

    try {
      const u = new URL(raw);
      if (u.protocol === 'http:' || u.protocol === 'https:') u.protocol = 'wss:';
      if (u.protocol === 'ws:') u.protocol = 'wss:';
      return u.toString();
    } catch {
      // tolerate raw like "wss://gw.nortongauss.com"
      if (raw.startsWith('ws://')) return raw.replace(/^ws:\/\//, 'wss://');
      return raw;
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const latestTimestamp = useMemo(() => {
    if (!messages.length) return undefined;
    return messages[messages.length - 1]?.created_at;
  }, [messages]);

  // Polling history (keep as-is)
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

  // WebSocket connect + handshake
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

    // Build ws URL with ?token=...
    let wsUrl = gatewayBaseUrl;
    try {
      const u = new URL(gatewayBaseUrl);
      if (!u.searchParams.has('token')) u.searchParams.set('token', token);
      wsUrl = u.toString();
    } catch {
      wsUrl += (wsUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
    }

    console.debug('[Allan WS] connecting to', wsUrl);

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    // We treat socket OPEN as "transport connected". Auth ready may come later.
    setConnected(false);
    setError(null);

    const signNonce = async (nonce: string) => {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(token),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(nonce));
      const bytes = new Uint8Array(sigBuf);

      return {
        hex: toHex(bytes),
        b64u: toBase64Url(bytes)
      };
    };

    socket.onopen = () => {
      console.debug('[Allan WS] socket open');
      setError(null);
      // do NOT setConnected(true) here; wait for connect.ok/ready if it comes
    };

    socket.onmessage = async (event) => {
      const text = typeof event.data === 'string' ? event.data : '';
      if (!text) return;

      console.debug('[Allan WS] <=', text);

      try {
        const data = JSON.parse(text) as any;

        // Challenge -> send ONE response with BOTH fields (covers both gateway expectations)
        if (data?.type === 'event' && data?.event === 'connect.challenge' && data?.payload?.nonce) {
          const nonce: string = data.payload.nonce;
          const { hex, b64u } = await signNonce(nonce);

          const response = {
            type: 'event',
            event: 'connect.response',
            payload: {
              nonce,
              // Some gateway builds expect "sig", others "signature"
              sig: hex,
              signature: b64u
            }
          };

          console.debug('[Allan WS] =>', JSON.stringify(response));
          socket.send(JSON.stringify(response));
          return;
        }

        // Ready/ok events
        if (data?.type === 'event' && typeof data?.event === 'string') {
          if (['connect.ok', 'connect.connected', 'connect.ready'].includes(data.event)) {
            console.debug('[Allan WS] authenticated:', data.event);
            setConnected(true);
            setError(null);
            return;
          }
          if (['connect.error', 'connect.reject', 'connect.denied'].includes(data.event)) {
            console.debug('[Allan WS] auth failed:', data);
            setConnected(false);
            setError('Gateway authentication failed (check token / handshake).');
            return;
          }
        }

        const reply = data?.reply || data?.message || data?.text || data?.body;
        if (reply) {
          setMessages((prev) => [...prev, createMessage(String(reply), 'agent')]);
          return;
        }
      } catch {
        // Non-JSON payload: treat as message
        setMessages((prev) => [...prev, createMessage(text, 'agent')]);
      }
    };

    socket.onerror = () => {
      console.debug('[Allan WS] socket error');
      setConnected(false);
      setError('WebSocket connection error');
    };

    socket.onclose = (ev) => {
      console.debug('[Allan WS] socket close', ev.code, ev.reason);
      setConnected(false);
      socketRef.current = null;
    };

    return () => {
      try {
        socket.close();
      } catch {}
      socketRef.current = null;
      setConnected(false);
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

      // ✅ Only require OPEN; do not block on "connected"
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket is not open');
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
          <span className={connected ? 'text-green-500' : 'text-yellow-500'}>
            {connected ? 'Authenticated' : 'Connecting…'}
          </span>
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
            <Button type="submit" disabled={sending}>
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </div>

          {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
          {!error && !connected ? (
            <p className="mt-2 text-xs text-yellow-500">WebSocket open; waiting for gateway authentication…</p>
          ) : null}
        </form>
      </Card>
    </div>
  );
}
