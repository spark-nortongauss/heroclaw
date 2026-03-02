import { NextRequest, NextResponse } from 'next/server';
import { extractReply, gatewayRequest, getGatewayConfig } from '@/app/api/allan-chat/gateway';

export const runtime = 'nodejs';

type AllanRequestPayload = {
  request_type?: string;
  payload?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AllanRequestPayload;

    if (!body?.request_type || !body?.payload || typeof body.payload !== 'object') {
      return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
    }

    const config = getGatewayConfig();
    if (!config.config) {
      return NextResponse.json({ ok: false, error: config.error }, { status: 500 });
    }

    const response = await gatewayRequest({
      method: 'POST',
      pathCandidates: ['/allan/request', '/v1/allan/request', '/request', '/v1/request'],
      body: {
        request_type: body.request_type,
        payload: body.payload
      }
    });

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: response.error }, { status: response.status });
    }

    return NextResponse.json({
      ok: true,
      forwarded: true,
      reply: extractReply(response.data),
      data: response.data
    });
  } catch (error) {
    console.error('[allan/request] unexpected error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to forward Allan request' }, { status: 500 });
  }
}
