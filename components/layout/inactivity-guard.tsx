'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import { useLocale } from '@/components/providers/locale-provider';

const INACTIVITY_MS = 15 * 60 * 1000;
const EVENT_NAMES: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

export function InactivityGuard() {
  const router = useRouter();
  const { notify } = useToast();
  const { t } = useLocale();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleRef = useRef(0);

  useEffect(() => {
    const supabase = createClient();

    const onTimeout = async () => {
      await supabase.auth.signOut();
      notify(t('toast.signedOutInactivity'), 'error');
      router.replace('/login');
      router.refresh();
    };

    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        void onTimeout();
      }, INACTIVITY_MS);
    };

    const throttledReset = () => {
      const now = Date.now();
      if (now - throttleRef.current < 1000) return;
      throttleRef.current = now;
      resetTimer();
    };

    resetTimer();
    EVENT_NAMES.forEach((eventName) => window.addEventListener(eventName, throttledReset, { passive: true }));

    return () => {
      EVENT_NAMES.forEach((eventName) => window.removeEventListener(eventName, throttledReset));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [notify, router, t]);

  return null;
}
