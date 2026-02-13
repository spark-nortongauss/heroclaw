import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_EMAIL_REGEX = /^[a-z0-9._%+-]+@nortongauss\.com$/i;
const DOMAIN_RESTRICTION_MESSAGE = 'Please use a valid @nortongauss.com email address.';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; emailRedirectTo?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const emailRedirectTo = body?.emailRedirectTo;

  if (!email || !ALLOWED_EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: DOMAIN_RESTRICTION_MESSAGE }, { status: 400 });
  }

  if (!emailRedirectTo) {
    return NextResponse.json({ error: 'Missing redirect destination for email login.' }, { status: 400 });
  }

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
