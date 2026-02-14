type GatewayConfig = {
  gatewayUrl: string;
  gatewayToken: string;
  agentId: string | null;
};

export type AllanChatMessage = {
  id: string;
  body: string;
  sender_type: 'user' | 'agent';
  created_at: string;
};

export function normalizeGatewayBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/$/, '');
  if (trimmed.startsWith('wss://')) return `https://${trimmed.slice(6)}`;
  if (trimmed.startsWith('ws://')) return `http://${trimmed.slice(5)}`;
  return trimmed;
}

function parseHost(value: string) {
  try {
    return new URL(normalizeGatewayBaseUrl(value)).hostname;
  } catch {
    return null;
  }
}

export function getGatewayConfig(): { config?: GatewayConfig; error?: string } {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL?.trim();
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN?.trim();
  const agentId = process.env.OPENCLAW_ALLAN_AGENT_ID?.trim() || process.env.ALLAN_AGENT_ID?.trim() || process.env.ALLAN_AGENT_SLUG?.trim() || null;

  if (!gatewayUrl) {
    return { error: 'Missing required environment variable: OPENCLAW_GATEWAY_URL' };
  }

  if (!gatewayToken) {
    return { error: 'Missing required environment variable: OPENCLAW_GATEWAY_TOKEN' };
  }

  const hostname = parseHost(gatewayUrl);
  if (process.env.VERCEL && hostname && ['127.0.0.1', 'localhost', '0.0.0.0'].includes(hostname)) {
    return { error: `OPENCLAW_GATEWAY_URL (${gatewayUrl}) is not reachable from Vercel. Set a public gateway URL.` };
  }

  return {
    config: {
      gatewayUrl: normalizeGatewayBaseUrl(gatewayUrl),
      gatewayToken,
      agentId
    }
  };
}

type RequestOptions = {
  method: 'GET' | 'POST';
  pathCandidates: string[];
  body?: Record<string, unknown>;
  query?: Record<string, string | undefined>;
};

export async function gatewayRequest(options: RequestOptions) {
  const gateway = getGatewayConfig();
  if (!gateway.config) {
    return { ok: false as const, status: 500, error: gateway.error || 'Gateway is not configured' };
  }

  const { gatewayUrl, gatewayToken, agentId } = gateway.config;
  const basePayload = {
    ...(agentId ? { agent_id: agentId, agent_slug: agentId } : {})
  };

  let lastError = 'Gateway request failed';
  for (const path of options.pathCandidates) {
    const url = new URL(`${gatewayUrl}${path}`);
    if (options.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        if (value) {
          url.searchParams.set(key, value);
        }
      });
    }
    if (agentId && options.method === 'GET') {
      url.searchParams.set('agent_id', agentId);
      url.searchParams.set('agent_slug', agentId);
    }

    const response = await fetch(url, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gatewayToken}`
      },
      body: options.method === 'POST' ? JSON.stringify({ ...basePayload, ...(options.body || {}) }) : undefined,
      cache: 'no-store'
    });

    if (response.ok) {
      const data = (await response.json().catch(() => null)) as unknown;
      return { ok: true as const, data };
    }

    const text = await response.text();
    if (![404, 405].includes(response.status)) {
      return { ok: false as const, status: response.status, error: text || 'Gateway request failed' };
    }

    lastError = text || `Gateway path not available: ${path}`;
  }

  return { ok: false as const, status: 502, error: lastError };
}

function normalizeSenderType(value: unknown): 'user' | 'agent' {
  if (typeof value === 'string' && ['assistant', 'allan', 'agent', 'bot'].includes(value.toLowerCase())) {
    return 'agent';
  }

  return 'user';
}

export function extractReply(payload: unknown): string | null {
  const data = payload as
    | {
        reply?: string;
        message?: string;
        output?: string;
        data?: { reply?: string; message?: string; output?: string; text?: string };
      }
    | null;

  return data?.reply ?? data?.message ?? data?.output ?? data?.data?.reply ?? data?.data?.message ?? data?.data?.output ?? data?.data?.text ?? null;
}

export function extractHistory(payload: unknown): AllanChatMessage[] {
  const root = payload as
    | {
        messages?: unknown[];
        data?: { messages?: unknown[] };
      }
    | null;

  const messages = root?.messages ?? root?.data?.messages;
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .map((item, index) => {
      const msg = item as Record<string, unknown>;
      const body = (typeof msg.body === 'string' ? msg.body : typeof msg.message === 'string' ? msg.message : typeof msg.text === 'string' ? msg.text : '').trim();

      if (!body) {
        return null;
      }

      const id = typeof msg.id === 'string' ? msg.id : `history-${index}`;
      const createdAt = typeof msg.created_at === 'string' ? msg.created_at : typeof msg.timestamp === 'string' ? msg.timestamp : new Date().toISOString();

      return {
        id,
        body,
        sender_type: normalizeSenderType(msg.sender_type ?? msg.role ?? msg.sender),
        created_at: createdAt
      } satisfies AllanChatMessage;
    })
    .filter((value): value is AllanChatMessage => Boolean(value));
}

