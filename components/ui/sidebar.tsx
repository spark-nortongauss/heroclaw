'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, FolderKanban, KanbanSquare, LayoutDashboard, MessageCircle, Ticket, FolderOpen } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useLocale } from '@/components/providers/locale-provider';
import type { TranslationKey } from '@/lib/i18n/messages';

const navItems: Array<{ href: string; labelKey: TranslationKey; icon: typeof LayoutDashboard }> = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/projects', labelKey: 'nav.projects', icon: FolderKanban },
  { href: '/board', labelKey: 'nav.board', icon: KanbanSquare },
  { href: '/tickets', labelKey: 'nav.tickets', icon: Ticket },
  { href: '/chat/allan', labelKey: 'nav.chat', icon: MessageCircle },
  { href: '/project-files', labelKey: 'nav.files', icon: FolderOpen }
];

const isActiveRoute = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function Sidebar({
  isOpen,
  collapsed,
  onNavigate,
  onCloseMobile
}: {
  isOpen: boolean;
  collapsed: boolean;
  onNavigate: () => void;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r border-white/15 bg-[#808080] text-white transition-all duration-300 motion-reduce:transition-none md:static md:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        collapsed ? 'w-20' : 'w-60'
      )}
      aria-label="Primary"
    >
      <div className={cn('flex h-20 items-center justify-center border-b border-white/15 px-3', collapsed ? 'py-2' : 'py-3')}>
        {collapsed ? (
          <Image
            src="/brand/Norton-Gauss_Main_Logo_1100x875.png"
            alt="Norton-Gauss"
            width={42}
            height={34}
            className="h-auto w-[42px] object-contain"
            priority
          />
        ) : (
          <Image
            src="/brand/Norton-Gauss_Main_Logo_White Write_No Tagline_1920x1080.png"
            alt="Norton-Gauss"
            width={170}
            height={44}
            className="h-auto w-[170px] object-contain"
            priority
          />
        )}
      </div>

      <nav className="space-y-1 p-2">
        {navItems.map((item) => {
          const active = isActiveRoute(pathname, item.href);
          const Icon = item.icon;
          const label = t(item.labelKey);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                onNavigate();
                onCloseMobile();
              }}
              aria-label={label}
              title={collapsed ? label : undefined}
              className={cn(
                'sidebar-tooltip group relative flex items-center rounded-md px-2 py-2 text-sm outline-none transition-all duration-200 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#D9FF35]',
                collapsed ? 'justify-center' : 'gap-2.5',
                active ? 'bg-[#D9FF35] text-[#172B4D]' : 'text-white/95 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {!collapsed && <span>{label}</span>}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-2 -translate-x-1 rounded-md bg-[#172B4D] px-2 py-1 text-xs text-white opacity-0 shadow transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-2 md:hidden">
        <button onClick={onCloseMobile} className="flex w-full items-center justify-center rounded-md bg-white/10 px-2 py-2 text-xs">
          <ChevronLeft className="mr-1 h-4 w-4" /> {t('nav.close')}
        </button>
      </div>
    </aside>
  );
}
