'use client';

import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 pointer-events-auto"
          aria-label="Language selector"
          title={localeLabels[locale]}
        >
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-50" align="end">
        <DropdownMenuRadioGroup value={locale} onValueChange={(value) => setLocale(value as Locale)}>
          {LOCALES.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {localeLabels[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
