'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AuthActionState = { error?: string; success?: string };

const ALLOWED_EMAIL_REGEX = /^[a-z0-9._%+-]+@nortongauss\.com$/i;
const DOMAIN_RESTRICTION_MESSAGE = 'Only @nortongauss.com accounts are allowed.';

function getCredentials(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  return { email, password };
}

export async function signInWithPassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { email, password } = getCredentials(formData);

  if (!ALLOWED_EMAIL_REGEX.test(email)) {
    return { error: DOMAIN_RESTRICTION_MESSAGE };
  }

  if (!password) {
    return { error: 'Password is required.' };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // If successful, redirect to dashboard
  redirect('/dashboard');
}

export async function signUpWithPassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { email, password } = getCredentials(formData);

  if (!ALLOWED_EMAIL_REGEX.test(email)) {
    return { error: DOMAIN_RESTRICTION_MESSAGE };
  }

  if (!password || password.length < 8) {
    return { error: 'Use a password with at least 8 characters.' };
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmations are OFF, Supabase returns a session immediately.
  if (data?.session) {
    redirect('/dashboard');
  }

  // If confirmations are ON, user must confirm via email before a session exists.
  return {
    success:
      'Account created. Check your email to confirm your account if required.',
  };
}

export async function signOut(): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
