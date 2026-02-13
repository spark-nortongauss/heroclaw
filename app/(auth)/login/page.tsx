'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ALLOWED_EMAIL_REGEX = /^[a-z0-9._%+-]+@nortongauss\.com$/i;
const DOMAIN_RESTRICTION_MESSAGE = 'Only @nortongauss.com accounts are allowed.';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!ALLOWED_EMAIL_REGEX.test(normalizedEmail)) {
      setMessageType('error');
      setMessage(DOMAIN_RESTRICTION_MESSAGE);
      return;
    }

    setLoading(true);
    setMessageType('');
    setMessage('Sending magic link...');
    setEmail(normalizedEmail);
    const origin = window.location.origin;
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${origin}/auth/callback`
      }
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Mission Control UI</CardTitle>
          <CardDescription>Sign in with your email to manage Clawdbot agents.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Magic Link'}
            </Button>
            {message && (
              <p className={`text-sm ${messageType === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                {message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
