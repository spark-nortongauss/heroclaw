'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTheme } from '@/components/providers/theme-provider';

type ThemeOption = 'light' | 'dark' | 'system';

const themeMeta: Record<ThemeOption, { label: string; Icon: typeof Sun }> = {
  light: { label: 'Light', Icon: Sun },
  dark: { label: 'Dark', Icon: Moon },
  system: { label: 'System', Icon: Monitor }
};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 pointer-events-auto"
          aria-label={`Theme: ${themeMeta[theme].label}`}
          title={themeMeta[theme].label}
        >
          <Monitor className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-50" align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as ThemeOption)}>
          {(Object.keys(themeMeta) as ThemeOption[]).map((key) => {
            const option = themeMeta[key];
            return (
              <DropdownMenuRadioItem key={key} value={key} className="gap-2">
                <option.Icon className="h-4 w-4" />
                {option.label}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
