import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

const DEFAULT_REDIRECT_PATH = '/dashboard';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const otpType = request.nextUrl.searchParams.get('type') as EmailOtpType | null;
  const nextPath = request.nextUrl.searchParams.get('next') || DEFAULT_REDIRECT_PATH;
  const redirectTo = new URL(nextPath.startsWith('/') ? nextPath : DEFAULT_REDIRECT_PATH, request.url);
  const loginUrl = new URL('/login?error=auth_callback', request.url);
  const response = NextResponse.redirect(redirectTo);

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType
    });

    if (error) {
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  return NextResponse.redirect(loginUrl);
}
