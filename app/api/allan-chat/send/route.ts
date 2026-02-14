import { NextRequest, NextResponse } from 'next/server';
import { extractReply, gatewayRequest, getGatewayConfig } from '../gateway';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { message?: string };
    const message = body?.message?.trim();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const config = getGatewayConfig();
    if (!config.config) {
      console.error('[allan-chat/send] configuration error:', config.error);
      return NextResponse.json({ error: config.error }, { status: 500 });
    }

    const response = await gatewayRequest({
      method: 'POST',
      pathCandidates: ['/chat/send', '/v1/chat/send', '/chat', '/v1/chat', ''],
      body: {
        message,
        input: message,
        text: message
      }
    });

    if (!response.ok) {
      console.error('[allan-chat/send] gateway error:', response.error);
      return NextResponse.json({ error: response.error }, { status: response.status });
    }

    const reply = extractReply(response.data);

    if (!reply) {
      return NextResponse.json({ error: 'Gateway response did not include a reply' }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('[allan-chat/send] unexpected error:', error);
    return NextResponse.json({ error: 'Failed to send message to Allan' }, { status: 500 });
  }
}
