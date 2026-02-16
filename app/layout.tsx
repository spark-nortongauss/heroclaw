import './globals.css';
import React from 'react';
import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Norton-Gauss Mission Control',
  description: 'Manage Clawdbot agents via Supabase.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-[var(--font-ui)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
