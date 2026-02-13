import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const dashboardUrl = new URL('/', request.url);
  const loginUrl = new URL('/login?error=auth_callback', request.url);
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    console.warn('[auth/callback] Missing code in callback URL.');
    return NextResponse.redirect(loginUrl);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] Failed to exchange code for session.', { message: error.message });
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(dashboardUrl);
}
