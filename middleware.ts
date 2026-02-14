import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/supabase/types';

const PUBLIC_ROUTES = ['/login', '/auth/callback', '/api/auth/magic-link'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/auth/callback')) {
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Parameters<typeof response.cookies.set>[2] }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const { data } = await supabase.auth.getUser();
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (!data.user && !isPublic) {
    console.info('[middleware] Redirecting to /login due to missing session', {
      pathname,
      isPublic,
      hasSbAccessCookie: request.cookies
        .getAll()
        .some((cookie) => cookie.name.includes('sb-') && cookie.name.endsWith('auth-token'))
    });
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (data.user && pathname === '/login') {
    console.info('[middleware] Redirecting authenticated user away from /login', {
      userId: data.user.id,
      to: '/tickets'
    });
    const url = request.nextUrl.clone();
    url.pathname = '/tickets';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
