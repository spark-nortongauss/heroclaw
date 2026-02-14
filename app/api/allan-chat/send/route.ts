import { NextRequest, NextResponse } from 'next/server';

type GatewayResponse = {
  reply?: string;
  message?: string;
  output?: string;
  data?: {
    reply?: string;
    message?: string;
    output?: string;
    text?: string;
  };
};

function normalizeGatewayUrl(value: string) {
  if (value.startsWith('wss://')) return `https://${value.slice(6)}`;
  if (value.startsWith('ws://')) return `http://${value.slice(5)}`;
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { message?: string };
    const message = body?.message?.trim();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL;
    const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;
    const agentId = process.env.ALLAN_AGENT_ID;
    const agentSlug = process.env.ALLAN_AGENT_SLUG;

    if (!gatewayUrl || !gatewayToken || (!agentId && !agentSlug)) {
      return NextResponse.json({ error: 'Allan chat is not configured on the server' }, { status: 500 });
    }

    const response = await fetch(normalizeGatewayUrl(gatewayUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gatewayToken}`
      },
      body: JSON.stringify({
        message,
        ...(agentId ? { agent_id: agentId } : {}),
        ...(agentSlug ? { agent_slug: agentSlug } : {})
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json({ error: details || 'Gateway request failed' }, { status: 502 });
    }

    const data = (await response.json()) as GatewayResponse;
    const reply = data.reply ?? data.message ?? data.output ?? data.data?.reply ?? data.data?.message ?? data.data?.output ?? data.data?.text;

    if (!reply) {
      return NextResponse.json({ error: 'Gateway response did not include a reply' }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ error: 'Failed to send message to Allan' }, { status: 500 });
  }
}
