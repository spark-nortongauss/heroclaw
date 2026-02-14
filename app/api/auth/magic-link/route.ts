// app/api/auth/magic-link/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_EMAIL_REGEX = /^[a-z0-9._%+-]+@nortongauss\.com$/i;
const DOMAIN_RESTRICTION_MESSAGE =
  "Please use a valid @nortongauss.com email address.";

const DEFAULT_REDIRECT_PATH = "/tickets";

export const runtime = "nodejs";

function getRequestOrigin(request: Request) {
  const requestUrl = new URL(request.url);

  // Prefer the Origin header (browser requests)
  const originHeader = request.headers.get("origin");
  if (originHeader) return originHeader;

  // Vercel / proxy headers
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const forwardedProto =
      request.headers.get("x-forwarded-proto") ??
      requestUrl.protocol.replace(":", "");
    return `${forwardedProto}://${forwardedHost}`;
  }

  // Fallback
  return requestUrl.origin;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string }
    | null;

  const email = body?.email?.trim().toLowerCase();

  if (!email || !ALLOWED_EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { error: DOMAIN_RESTRICTION_MESSAGE },
      { status: 400 }
    );
  }

  const origin = getRequestOrigin(request);

  // Must match a Redirect URL allowed in Supabase Auth settings (path matters)
  // Example result: https://heroclaw.nortongauss.com/auth/callback?next=%2Ftickets
  const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(
    DEFAULT_REDIRECT_PATH
  )}`;

  // IMPORTANT: Because this is a SERVER route, we force implicit flow.
  // PKCE requires a browser-stored code_verifier, which does NOT exist here.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "implicit",
      },
    }
  );

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      // (optional) if you ever use OTP instead of link, you can set shouldCreateUser, etc.
      // shouldCreateUser: true,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
