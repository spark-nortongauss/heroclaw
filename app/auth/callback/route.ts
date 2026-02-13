import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const DEFAULT_REDIRECT_PATH = "/tickets";

function getSafeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/")) return DEFAULT_REDIRECT_PATH;
  return nextPath;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const nextPath = getSafeNextPath(url.searchParams.get("next"));
  const redirectTo = new URL(nextPath, url.origin);
  const loginUrl = new URL("/login?error=auth_callback", url.origin);

  // This response is what will receive the auth cookies (IMPORTANT)
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

  // Most common flow for magic links in modern Supabase Auth:
  // exchange the `code` for a session (sets cookies on `response`)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;

    // failed exchange -> go to login
    return NextResponse.redirect(loginUrl);
  }

  // Fallback for older / alternative flows where Supabase sends token_hash + type
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) return response;

    return NextResponse.redirect(loginUrl);
  }

  // If neither param exists, it's not a valid callback
  return NextResponse.redirect(loginUrl);
}
