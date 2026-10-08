'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSlug } from '@/hooks/use-access';
import { visibleNav, type NavGroup } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

function NavList({ groups, collapsed, onNavigate }: { groups: NavGroup[]; collapsed: boolean; onNavigate?: () => void }) {
  const slug = useSlug();
  const pathname = usePathname() ?? '';
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4 scrollbar-hide">
      {groups.map((g) => (
        <div key={g.label}>
          {!collapsed && <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const href = `/${slug}${item.path}`;
              const active = pathname === href || pathname.startsWith(`${href}/`);
              const link = (
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors',
                    active ? 'bg-sidebar-accent font-semibold text-sidebar-foreground' : 'text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                    collapsed && 'justify-center px-0',
                  )}
                >
                  <item.icon className={cn('h-4 w-4 shrink-0', active && 'text-gold')} aria-hidden />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
              return (
                <li key={item.path}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger render={link} />
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : link}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  const slug = useSlug();
  return (
    <Link href={`/${slug}/dashboard`} className={cn('flex h-16 shrink-0 items-center border-b border-sidebar-border px-4', collapsed && 'justify-center px-0')}>
      {collapsed ? (
        <Image src="/brand/maskani-icon-white.svg" alt="Maskani" width={30} height={30} />
      ) : (
        <Image src="/brand/maskani-logo-dark.svg" alt="Maskani by Codevertex" width={150} height={36} priority />
      )}
    </Link>
  );
}

/** Desktop sidebar (lg and up) plus the phone and tablet drawer. Items follow modules and permissions. */
export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileOpenChange }: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const me = useAuthStore((s) => s.me);
  const groups = visibleNav(me);
  return (
    <>
      <aside className={cn('hidden shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex', collapsed ? 'w-16' : 'w-64')}>
        <Brand collapsed={collapsed} />
        <NavList groups={groups} collapsed={collapsed} />
        <button
          type="button"
          onClick={onToggle}
          className="flex h-11 items-center justify-center gap-2 border-t border-sidebar-border text-xs text-sidebar-muted hover:text-sidebar-foreground"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Collapse</>}
        </button>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" showCloseButton={false} className="w-72 max-w-[85vw] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Brand collapsed={false} />
          <NavList groups={groups} collapsed={false} onNavigate={() => onMobileOpenChange(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
