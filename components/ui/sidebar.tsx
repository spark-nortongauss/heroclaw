'use client';

import Link from 'next/link';
import { ChevronLeft, LayoutDashboard, MessageCircle, PanelLeftClose, PanelLeftOpen, Ticket, FilePlus2, FolderOpen } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/chat/allan', label: 'Chat (Allan)', icon: MessageCircle },
  { href: '/requests/new', label: 'Requests', icon: FilePlus2 },
  { href: '/project-files', label: 'Project Files', icon: FolderOpen }
];

export function Sidebar({
  isOpen,
  collapsed,
  onNavigate,
  onToggleCollapse,
  onCloseMobile
}: {
  isOpen: boolean;
  collapsed: boolean;
  onNavigate: () => void;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r border-white/15 bg-[#808080] text-white transition-all duration-300 motion-reduce:transition-none md:static md:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        collapsed ? 'w-16' : 'w-60'
      )}
      aria-label="Primary"
    >
      <div className={cn('flex h-14 items-center border-b border-white/15 px-3', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && <p className="font-[var(--font-heading)] text-sm font-semibold text-white">Mission Control</p>}
        <button
          onClick={onToggleCollapse}
          className="rounded-md p-1.5 text-white/90 transition hover:bg-white/15 hover:text-white"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="space-y-1 p-2">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                onNavigate();
                onCloseMobile();
              }}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              className={cn(
                'sidebar-tooltip group relative flex items-center rounded-md px-2 py-2 text-sm outline-none transition-all duration-200 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#D9FF35]',
                collapsed ? 'justify-center' : 'gap-2.5',
                active ? 'bg-[#D9FF35] text-[#172B4D]' : 'text-white/95 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {!collapsed && <span>{item.label}</span>}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-2 -translate-x-1 rounded-md bg-[#172B4D] px-2 py-1 text-xs text-white opacity-0 shadow transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-2 md:hidden">
        <button onClick={onCloseMobile} className="flex w-full items-center justify-center rounded-md bg-white/10 px-2 py-2 text-xs">
          <ChevronLeft className="mr-1 h-4 w-4" /> Close
        </button>
      </div>
    </aside>
  );
}
