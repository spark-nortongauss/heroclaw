'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type AuthActionState = { error?: string };

const ALLOWED_EMAIL_REGEX = /^[a-z0-9._%+-]+@nortongauss\.com$/i;
const DOMAIN_RESTRICTION_MESSAGE = 'Only @nortongauss.com accounts are allowed.';

function getCredentials(formData: FormData) {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');

  return { email, password };
}

export async function signInWithPassword(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
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

  redirect('/tickets');
}

export async function signOut() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
