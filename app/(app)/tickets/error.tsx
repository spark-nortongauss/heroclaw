'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function TicketsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Tickets page crashed:', error);
  }, [error]);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Unable to load tickets</h2>
      <p className="mt-1 text-sm text-muted-foreground">Something went wrong while rendering this page. Please try again.</p>
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
