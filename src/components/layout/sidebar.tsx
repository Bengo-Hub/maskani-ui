'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTenantBranding } from '@bengo-hub/shared-ui-lib/tenant';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { WithTooltip } from '@/components/common/icon-button';
import { useSlug } from '@/hooks/use-access';
import { navPathActive, visibleNav, type NavGroup, type NavItem } from '@/lib/nav';
import { cn, estateName } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

const GROUPS_KEY = 'maskani-nav-closed-groups';

interface Loc {
  path: string; // pathname after /{slug}
  search: URLSearchParams;
}

/** True when the item or any of its descendants is the current page. */
function branchActive(item: NavItem, loc: Loc): boolean {
  // A parent matches its own page exactly; deeper pages belong to whichever child owns them, so
  // /settings/users lights "Users and roles", not "Settings".
  if (navPathActive(item.path, loc.path, loc.search, !!item.children?.length)) return true;
  return !!item.children?.some((c) => branchActive(c, loc));
}

/** Leaf highlight: the deepest item matching the location, so a parent and its child never both fill. */
function leafActive(item: NavItem, loc: Loc): boolean {
  if (!navPathActive(item.path, loc.path, loc.search, !!item.children?.length)) return false;
  return !item.children?.some((c) => branchActive(c, loc));
}

function ItemRow({ item, depth, loc, onNavigate }: { item: NavItem; depth: number; loc: Loc; onNavigate?: () => void }) {
  const slug = useSlug();
  const hasChildren = !!item.children?.length;
  const inBranch = branchActive(item, loc);
  const [open, setOpen] = useState(inBranch);
  useEffect(() => { if (inBranch) setOpen(true); }, [inBranch]);
  const active = leafActive(item, loc);
  const Icon = item.icon;

  return (
    <li>
      <div className="group/row relative flex items-center">
        <Link
          href={`/${slug}${item.path}`}
          onClick={onNavigate}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-3 rounded-xl text-sm transition-colors',
            depth === 0 ? 'h-10 px-3' : 'h-9 px-3',
            active
              ? 'bg-primary font-semibold text-primary-foreground shadow-sm shadow-primary/20'
              : inBranch
                ? 'font-semibold text-sidebar-foreground'
                : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground',
            hasChildren && 'pr-9',
          )}
        >
          {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : depth > 0 ? <span className="w-1" aria-hidden /> : null}
          <span className="truncate">{item.label}</span>
        </Link>
        {hasChildren && (
          <WithTooltip label={`${open ? 'Hide' : 'Show'} ${item.label} pages`} side="right">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={`${open ? 'Hide' : 'Show'} ${item.label} pages`}
              className={cn(
                'absolute right-1 grid h-7 w-7 place-items-center rounded-lg transition-colors',
                active ? 'text-primary-foreground/80 hover:bg-primary-foreground/15' : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground',
              )}
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')} />
            </button>
          </WithTooltip>
        )}
      </div>
      {hasChildren && open && (
        <ul className="ml-5 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
          {item.children!.map((c) => <ItemRow key={c.path} item={c} depth={depth + 1} loc={loc} onNavigate={onNavigate} />)}
        </ul>
      )}
    </li>
  );
}

function CollapsedItem({ item, loc }: { item: NavItem; loc: Loc }) {
  const slug = useSlug();
  const active = branchActive(item, loc);
  const Icon = item.icon;
  return (
    <li>
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href={`/${slug}${item.path}`}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              className={cn(
                'mx-auto grid h-10 w-10 place-items-center rounded-xl transition-colors',
                active ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20' : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground',
              )}
            >
              {Icon ? <Icon className="h-4 w-4" aria-hidden /> : <span className="text-xs font-semibold">{item.label[0]}</span>}
            </Link>
          }
        />
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    </li>
  );
}

function readClosed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(GROUPS_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function NavTree({ groups, collapsed, onNavigate }: { groups: NavGroup[]; collapsed: boolean; onNavigate?: () => void }) {
  const slug = useSlug();
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const loc: Loc = { path: pathname.slice(slug.length + 1) || '/', search: new URLSearchParams(searchParams?.toString() ?? '') };
  const [closed, setClosed] = useState<string[]>([]);
  useEffect(() => setClosed(readClosed()), []);

  const toggleGroup = (label: string) => {
    setClosed((prev) => {
      const next = prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label];
      try { localStorage.setItem(GROUPS_KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
      return next;
    });
  };

  return (
    <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4 scrollbar-hide" aria-label="Main">
      {groups.map((g) => {
        // A group holding the current page always shows, even if the user folded it earlier.
        const open = !closed.includes(g.label) || g.items.some((i) => branchActive(i, loc));
        if (collapsed) {
          return (
            <ul key={g.label} className="space-y-1 border-b border-sidebar-border/60 pb-3 last:border-0">
              {g.items.map((i) => <CollapsedItem key={i.path} item={i} loc={loc} />)}
            </ul>
          );
        }
        return (
          <div key={g.label}>
            <button
              type="button"
              onClick={() => toggleGroup(g.label)}
              aria-expanded={open}
              className="group/header mb-1 flex w-full items-center justify-between px-3 py-0.5"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-muted/80 transition-colors group-hover/header:text-sidebar-foreground">
                {g.label}
              </span>
              <ChevronDown className={cn('h-3 w-3 text-sidebar-muted/60 transition-transform duration-200', open && 'rotate-180')} aria-hidden />
            </button>
            {open && (
              <ul className="space-y-0.5">
                {g.items.map((i) => <ItemRow key={i.path} item={i} depth={0} loc={loc} onNavigate={onNavigate} />)}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** The tenant's own logo and name when set in SSO branding; Maskani's otherwise. */
function Brand({ collapsed }: { collapsed: boolean }) {
  const slug = useSlug();
  const { tenant } = useTenantBranding();
  const name = estateName(tenant?.orgName) || '';
  return (
    <Link
      href={`/${slug}/dashboard`}
      className={cn('flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-4', collapsed && 'justify-center px-0')}
    >
      {tenant?.logoUrl ? (
        // Tenant logos are hosted by auth-api on varied hosts, so a plain img.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tenant.logoUrl} alt={name || 'Logo'} className={cn('object-contain', collapsed ? 'h-9 w-9' : 'h-10 max-w-30')} />
      ) : collapsed ? (
        <Image src="/brand/maskani-icon.svg" alt="Maskani" width={30} height={30} />
      ) : (
        <>
          <Image src="/brand/maskani-logo.svg" alt="Maskani by Codevertex" width={140} height={34} priority className="dark:hidden" />
          <Image src="/brand/maskani-logo-dark.svg" alt="Maskani by Codevertex" width={140} height={34} priority className="hidden dark:block" />
        </>
      )}
      {!collapsed && tenant?.logoUrl && name && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-sidebar-foreground">{name}</span>
          <span className="block text-[11px] text-sidebar-muted">Maskani</span>
        </span>
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
      <aside className={cn('hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex', collapsed ? 'w-18' : 'w-64')}>
        <Brand collapsed={collapsed} />
        <Suspense fallback={<div className="flex-1" />}>
          <NavTree groups={groups} collapsed={collapsed} />
        </Suspense>
        {/* Collapsed, the toggle is icon only, so it gets a tooltip; expanded it reads "Collapse". */}
        {collapsed ? (
          <WithTooltip label="Expand sidebar" side="right">
            <button
              type="button"
              onClick={onToggle}
              className="flex h-11 items-center justify-center gap-2 border-t border-sidebar-border text-xs text-sidebar-muted hover:text-sidebar-foreground"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </WithTooltip>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-11 items-center justify-center gap-2 border-t border-sidebar-border text-xs text-sidebar-muted hover:text-sidebar-foreground"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" /> Collapse
          </button>
        )}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" showCloseButton={false} className="w-72 max-w-[85vw] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Brand collapsed={false} />
          <Suspense fallback={<div className="flex-1" />}>
            <NavTree groups={groups} collapsed={false} onNavigate={() => onMobileOpenChange(false)} />
          </Suspense>
        </SheetContent>
      </Sheet>
    </>
  );
}
