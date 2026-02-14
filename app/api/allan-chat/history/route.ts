export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { extractHistory, gatewayRequest, getGatewayConfig } from '../gateway';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const config = getGatewayConfig();
    if (!config.config) {
      console.error('[allan-chat/history] configuration error:', config.error);
      return NextResponse.json({ error: config.error }, { status: 500 });
    }

    const since = request.nextUrl.searchParams.get('since') || undefined;

    const response = await gatewayRequest({
      method: 'GET',
      pathCandidates: ['/chat/history', '/v1/chat/history', '/history', '/v1/history'],
      query: { since }
    });

    if (!response.ok) {
      console.error('[allan-chat/history] gateway error:', response.error);
      return NextResponse.json({ error: response.error }, { status: response.status });
    }

    return NextResponse.json({ messages: extractHistory(response.data) });
  } catch (error) {
    console.error('[allan-chat/history] unexpected error:', error);
    return NextResponse.json({ error: 'Failed to fetch Allan chat history' }, { status: 500 });
  }
}
