import './globals.css';
import React from 'react';
import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { Providers } from './providers';

const uiFont = Inter({
  subsets: ['latin'],
  variable: '--font-ui'
});

const headingFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading'
});

export const metadata: Metadata = {
  title: 'Norton-Gauss Mission Control',
  description: 'Manage Clawdbot agents via Supabase.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${uiFont.variable} ${headingFont.variable} font-[var(--font-ui)]`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
