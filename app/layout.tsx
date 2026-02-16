import './globals.css';
import React from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Providers } from './providers';
import { LOCALE_COOKIE_NAME, normalizeLocale } from '@/lib/i18n/messages';

export const metadata: Metadata = {
  title: 'Norton-Gauss Mission Control',
  description: 'Manage Clawdbot agents via Supabase.'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialLocale = normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);

  return (
    <html lang={initialLocale} suppressHydrationWarning>
      <body className="font-[var(--font-ui)]">
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
