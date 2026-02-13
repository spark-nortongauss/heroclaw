import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body?.request_type || !body?.payload) {
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
  }

  // TODO: Forward to Allan gateway using ALLAN_GATEWAY_URL and ALLAN_GATEWAY_TOKEN on the server.
  // Keep tokens server-side only and never expose secret values to the client.

  return NextResponse.json({ ok: true, forwarded: false });
}
