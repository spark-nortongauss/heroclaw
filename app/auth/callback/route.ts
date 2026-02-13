import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const DEFAULT_REDIRECT_PATH = "/tickets";

function getSafeNextPath(nextPath: string | null) {
  if (!nextPath) return DEFAULT_REDIRECT_PATH;

  // handle double-encoded next like "%2Ftickets"
  try {
    const decoded = decodeURIComponent(nextPath);
    if (decoded.startsWith("/")) return decoded;
  } catch {
    // ignore decode errors
  }

  if (nextPath.startsWith("/")) return nextPath;

  return DEFAULT_REDIRECT_PATH;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const nextPath = getSafeNextPath(url.searchParams.get("next"));
  const redirectTo = new URL(nextPath, url.origin);
  const loginUrl = new URL("/login?error=auth_callback", url.origin);

  // Create the redirect response NOW so cookies can be attached to it
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
        },
      },
    }
  );

  // 1) PKCE flow (only if code exists)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
    return NextResponse.redirect(loginUrl);
  }

  // 2) Magic link implicit flow (token_hash + type)
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (error) return NextResponse.redirect(loginUrl);

    // IMPORTANT: ensure cookies are written by setting the session explicitly
    if (data?.session) {
      const { error: setErr } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      if (setErr) return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  // Neither code nor token_hash => invalid callback
  return NextResponse.redirect(loginUrl);
}
