'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ALLOWED_EMAIL_REGEX = /^[a-z0-9._%+-]+@nortongauss\.com$/i;
const DOMAIN_RESTRICTION_MESSAGE = 'Only @nortongauss.com accounts are allowed.';

export default function LoginPage() {
  const [emailInput, setEmailInput] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const email = emailInput.trim().toLowerCase();

    if (!ALLOWED_EMAIL_REGEX.test(email)) {
      setMessageType('error');
      setMessage(DOMAIN_RESTRICTION_MESSAGE);
      return;
    }

    setLoading(true);
    setMessageType('');
    setMessage('Sending magic link...');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });

    if (error) {
      setMessageType('error');
      setMessage(error.message);
    } else {
      setMessageType('success');
      setMessage('Check your email for the login link or OTP.');
    }

    setLoading(false);
  };

  return (
    <div className="neon-grid flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Norton-Gauss Mission Control</CardTitle>
          <CardDescription>Sign in with your email to manage Clawdbot agents.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Input type="email" placeholder="you@nortongauss.com" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} required />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Magic Link'}
            </Button>
            {message && <p className={`text-sm ${messageType === 'error' ? 'text-destructive' : 'text-mutedForeground'}`}>{message}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
