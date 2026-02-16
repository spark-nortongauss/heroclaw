'use client';

import { Globe } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { LOCALES, Locale } from '@/lib/i18n/messages';
import { useLocale } from '@/components/providers/locale-provider';

const localeLabels: Record<Locale, string> = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
  es: 'Español',
  fr: 'Français'
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
      <SelectTrigger className="h-9 w-9 px-0" aria-label="Language selector" title={localeLabels[locale]}>
        <Globe className="mx-auto h-4 w-4" />
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((option) => (
          <SelectItem key={option} value={option}>
            {localeLabels[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
