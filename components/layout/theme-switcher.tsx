'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/providers/theme-provider';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <Select value={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}>
      <SelectTrigger className="w-[140px]" aria-label="Theme">
        <SelectValue placeholder="Theme" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">
          <span className="inline-flex items-center gap-2"><Sun className="h-3.5 w-3.5" />Light</span>
        </SelectItem>
        <SelectItem value="dark">
          <span className="inline-flex items-center gap-2"><Moon className="h-3.5 w-3.5" />Dark</span>
        </SelectItem>
        <SelectItem value="system">
          <span className="inline-flex items-center gap-2"><Monitor className="h-3.5 w-3.5" />System</span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
