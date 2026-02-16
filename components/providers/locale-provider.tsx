'use client';

import { ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  Locale,
  TranslationKey,
  getDictionary,
  isLocale,
  normalizeLocale
} from '@/lib/i18n/messages';

type TranslateValues = Record<string, string | number>;

type LocaleContextValue = {
  locale: Locale;
  setLocale: (nextLocale: Locale) => void;
  t: (key: TranslationKey, values?: TranslateValues) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);
let hasWarnedMissingLocaleProvider = false;

function interpolate(text: string, values?: TranslateValues) {
  if (!values) return text;
  return text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

function persistLocale(nextLocale: Locale) {
  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(nextLocale)}; path=/; max-age=31536000; samesite=lax`;
  window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
}

export function LocaleProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: string }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(normalizeLocale(initialLocale));

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      setLocaleState(nextLocale);
      persistLocale(nextLocale);
      router.refresh();
    },
    [router]
  );

  const t = useCallback(
    (key: TranslationKey, values?: TranslateValues) => {
      const active = getDictionary(locale);
      const fallback = getDictionary(DEFAULT_LOCALE);
      const template = active[key] || fallback[key] || key;
      return interpolate(template, values);
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    if (process.env.NODE_ENV !== 'production' && !hasWarnedMissingLocaleProvider) {
      hasWarnedMissingLocaleProvider = true;
      console.warn('[LocaleProvider] missing provider; locale switching is disabled.');
    }
    const fallback = getDictionary(DEFAULT_LOCALE);
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => undefined,
      t: (key: TranslationKey, values?: TranslateValues) => interpolate(fallback[key] || key, values)
    };
  }
  return context;
}

export function getInitialLocaleFromClient() {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const fromStorage = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isLocale(fromStorage)) return fromStorage;
  return DEFAULT_LOCALE;
}
