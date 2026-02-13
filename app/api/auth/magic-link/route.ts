import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_EMAIL_REGEX = /^[a-z0-9._%+-]+@nortongauss\.com$/i;
const DOMAIN_RESTRICTION_MESSAGE = 'Please use a valid @nortongauss.com email address.';
const DEFAULT_REDIRECT_PATH = '/tickets';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();

  if (!email || !ALLOWED_EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: DOMAIN_RESTRICTION_MESSAGE }, { status: 400 });
  }

  const origin = request.headers.get('origin') ?? new URL(request.url).origin;
  const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(DEFAULT_REDIRECT_PATH)}`;

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo }
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
