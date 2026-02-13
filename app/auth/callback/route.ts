import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';

const DEFAULT_REDIRECT_PATH = '/tickets';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const nextPath = request.nextUrl.searchParams.get('next') || DEFAULT_REDIRECT_PATH;
  const redirectTo = new URL(nextPath.startsWith('/') ? nextPath : DEFAULT_REDIRECT_PATH, request.url);
  const loginUrl = new URL('/login?error=auth_callback', request.url);

  if (!code) {
    return NextResponse.redirect(loginUrl);
  }

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
