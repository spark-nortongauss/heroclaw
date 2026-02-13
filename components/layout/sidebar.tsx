'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tickets', label: 'Tickets' },
  { href: '/chat/allan', label: 'Chat Allan' },
  { href: '/requests/new', label: 'New Request' }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b p-4 md:w-64 md:border-b-0 md:border-r">
      <p className="mb-4 text-lg font-semibold">Mission Control UI</p>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block rounded-md px-3 py-2 text-sm',
              pathname.startsWith(item.href) ? 'bg-primary text-white' : 'hover:bg-muted'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
