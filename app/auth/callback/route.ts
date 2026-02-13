import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const dashboardUrl = new URL('/dashboard', request.url);
  const loginUrl = new URL('/login', request.url);
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(loginUrl);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(dashboardUrl);
}
