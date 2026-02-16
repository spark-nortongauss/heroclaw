'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/providers/theme-provider';

type ThemeOption = 'light' | 'dark' | 'system';

const themeMeta: Record<ThemeOption, { label: string; Icon: typeof Sun }> = {
  light: { label: 'Light', Icon: Sun },
  dark: { label: 'Dark', Icon: Moon },
  system: { label: 'System', Icon: Monitor }
};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const current = themeMeta[theme];

  return (
    <Select value={theme} onValueChange={(value) => setTheme(value as ThemeOption)}>
      <SelectTrigger className="w-[132px]" aria-label="Theme">
        <span className="inline-flex items-center gap-2">
          <current.Icon className="h-3.5 w-3.5" />
          <SelectValue placeholder="Theme" />
        </span>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(themeMeta) as ThemeOption[]).map((key) => {
          const option = themeMeta[key];
          return (
            <SelectItem key={key} value={key}>
              <span className="inline-flex items-center gap-2">
                <option.Icon className="h-3.5 w-3.5" />
                {option.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
