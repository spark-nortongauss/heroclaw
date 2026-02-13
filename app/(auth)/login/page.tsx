'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const LoginScene = dynamic(() => import('@/components/auth/login-scene').then((mod) => mod.LoginScene), {
  ssr: false
});

const ALLOWED_EMAIL_REGEX = /^[a-z0-9._%+-]+@nortongauss\.com$/i;
const DOMAIN_RESTRICTION_MESSAGE = 'Please use your @nortongauss.com email to request access.';

const TAGLINE_OPTIONS = [
  'More control. Less effort.',
  'Run support operations without the friction.',
  'Precision support, powered by people and AI.'
];

export default function LoginPage() {
  const [emailInput, setEmailInput] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [loading, setLoading] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [logoSrc, setLogoSrc] = useState('/brand/norton-gauss-logo.svg');
  const [bgImageFailed, setBgImageFailed] = useState(false);

  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const taglineRef = useRef<HTMLHeadingElement | null>(null);

  const selectedTagline = useMemo(() => TAGLINE_OPTIONS[0], []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(mediaQuery.matches);
    onChange();

    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    rightPanelRef.current?.animate(
      [
        { opacity: 0, transform: 'translateY(16px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ],
      { duration: 480, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
    );

    const staggerItems = formRef.current?.querySelectorAll('[data-stagger]') ?? [];
    staggerItems.forEach((item, index) => {
      item.animate(
        [
          { opacity: 0, transform: 'translateY(10px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ],
        {
          duration: 360,
          delay: 170 + index * 90,
          easing: 'ease-out',
          fill: 'forwards'
        }
      );
    });
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;

    const onMove = (event: MouseEvent) => {
      if (!taglineRef.current) return;
      const x = (event.clientX / window.innerWidth - 0.5) * 12;
      const y = (event.clientY / window.innerHeight - 0.5) * 10;
      taglineRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const onLeave = () => {
      if (!taglineRef.current) return;
      taglineRef.current.style.transform = 'translate3d(0, 0, 0)';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, [reducedMotion]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = emailInput.trim().toLowerCase();

    if (!ALLOWED_EMAIL_REGEX.test(email)) {
      setMessageType('error');
      setMessage(DOMAIN_RESTRICTION_MESSAGE);
      return;
    }

    setLoading(true);
    setMessageType('');
    setMessage('Sending magic link...');

    const response = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email
      })
    });

    const data = (await response.json().catch(() => null)) as { error?: string; success?: boolean } | null;

    if (!response.ok) {
      setMessageType('error');
      setMessage(data?.error ?? 'We could not send a magic link. Please try again.');
    } else {
      setMessageType('success');
      setMessage('Check your inbox for your HeroClaw magic link.');
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#f5f6f7]">
      <section className="grid min-h-screen grid-cols-1 md:grid-cols-2">
        <div className="relative min-h-[40vh] overflow-hidden bg-[#10201a] md:min-h-screen">
          <Image
            src="/auth/login-bg.png"
            alt="Abstract modern technology background"
            fill
            priority
            className={`object-cover transition-opacity duration-300 ${bgImageFailed ? 'opacity-0' : 'opacity-100'}`}
            onError={() => setBgImageFailed(true)}
          />
          <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#0f1d18]/75 via-[#0f1d18]/65 to-[#0a1110]/85" />
          <LoginScene reducedMotion={reducedMotion} />

          <div className="absolute left-6 top-6 z-[3] sm:left-10 sm:top-10">
            <Image
              src={logoSrc}
              alt="Norton-Gauss"
              width={180}
              height={48}
              className="h-auto w-[150px] sm:w-[180px]"
              onError={() => setLogoSrc('/brand/norton-gauss-logo.png')}
              priority
            />
          </div>

          <div className="absolute bottom-8 left-6 right-6 z-[3] sm:bottom-12 sm:left-10 sm:right-10">
            <h2
              ref={taglineRef}
              className="max-w-lg text-3xl font-semibold tracking-tight text-white transition-transform duration-300 md:text-5xl"
            >
              {selectedTagline}
            </h2>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 md:p-10" ref={rightPanelRef}>
          <div className="w-full max-w-lg space-y-8">
            <header className="text-center md:text-left">
              <h1 className="text-5xl font-semibold tracking-tight text-[#234234]">HeroClaw</h1>
              <p className="mt-2 text-sm text-[#808080]">by Norton-Gauss</p>
            </header>

            <Card className="border border-[#e5e8e6] bg-white shadow-soft">
              <CardHeader>
                <CardTitle className="text-2xl text-[#234234]">Welcome back</CardTitle>
                <CardDescription>
                  Enter your Norton-Gauss email and we&apos;ll send a secure sign-in link.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form ref={formRef} className="space-y-4" onSubmit={onSubmit} noValidate>
                  <div data-stagger>
                    <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#234234]">
                      Work email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@nortongauss.com"
                      autoComplete="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>

                  <Button
                    data-stagger
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full bg-[#D9FF35] text-[#234234] hover:bg-[#c6ea2f] focus-visible:ring-[#D9FF35]"
                  >
                    {loading ? 'Sending…' : 'Send magic link'}
                  </Button>

                  <p
                    data-stagger
                    className={`text-sm ${
                      messageType === 'error' ? 'text-destructive' : messageType === 'success' ? 'text-[#234234]' : 'text-[#808080]'
                    }`}
                    role="status"
                    aria-live="polite"
                  >
                    {message || 'Only @nortongauss.com accounts can sign in.'}
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
