'use client';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function Topbar({ email }: { email?: string }) {
  const router = useRouter();

  const onLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <h1 className="text-lg font-semibold">Mission Control</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{email ?? 'Unknown user'}</span>
        <Button variant="outline" onClick={onLogout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
