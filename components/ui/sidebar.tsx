'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Ticket, MessageCircle, FilePlus2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/chat/allan', label: 'Chat (Allan)', icon: MessageCircle },
  { href: '/requests/new', label: 'Requests', icon: FilePlus2 }
];

export function Sidebar({ isOpen, onNavigate }: { isOpen: boolean; onNavigate: () => void }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 w-72 border-r bg-brandDark px-4 py-6 text-white transition-transform duration-300 md:static md:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <p className="mb-8 font-[var(--font-heading)] text-xl font-semibold text-primary">Norton-Gauss</p>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition',
                active ? 'bg-white/10 text-primary' : 'text-white/85 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {active && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-primary" />}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
