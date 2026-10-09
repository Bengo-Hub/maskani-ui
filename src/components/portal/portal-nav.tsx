'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, LogOut, UserRound, type LucideIcon } from 'lucide-react';
import { AUTH_UI_URL } from '@/lib/config';
import { cn, estateName, initials } from '@/lib/utils';

export interface PortalTab { key: string; label: string; hint: string; href: string; icon: LucideIcon; active: boolean }

/** The estate's own logo, large enough to read, with its name; the Maskani mark when it has none. */
export function PortalBrand({ logoUrl, orgName, href, compact }: { logoUrl?: string | null; orgName?: string | null; href: string; compact?: boolean }) {
  const name = estateName(orgName) ?? 'Your estate';
  return (
    <Link href={href} className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
      {logoUrl ? (
        // Tenant logos come from any host and any shape: sized by height, never squeezed into a square.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className={cn('w-auto shrink-0 object-contain object-left', compact ? 'h-9 max-w-[7.5rem]' : 'h-14 max-w-[11rem]')} />
      ) : (
        <span className={cn('flex shrink-0 items-center justify-center rounded-2xl bg-primary/10', compact ? 'h-9 w-9' : 'h-12 w-12')}>
          <Image src="/brand/maskani-icon.svg" alt="" width={compact ? 22 : 28} height={compact ? 22 : 28} />
        </span>
      )}
      {(!logoUrl || !compact) && (
        <span className="min-w-0">
          <span className={cn('block truncate font-display font-semibold leading-tight', compact ? 'text-base' : 'text-lg')}>{name}</span>
          {!compact && <span className="block text-xs text-muted-foreground">Owner and resident portal</span>}
        </span>
      )}
    </Link>
  );
}

/** Sidebar navigation: icon, label and a one-line hint, the current page clearly marked. */
export function PortalSideNav({ tabs }: { tabs: PortalTab[] }) {
  return (
    <nav aria-label="Portal" className="space-y-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.active ? 'page' : undefined}
          className={cn(
            'group flex min-h-12 items-center gap-3 rounded-2xl px-3 py-2 transition-colors duration-200',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            t.active ? 'bg-primary text-primary-foreground shadow-soft' : 'text-foreground hover:bg-primary/8',
          )}
        >
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', t.active ? 'bg-white/15' : 'bg-primary/8 text-primary')}>
            <t.icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{t.label}</span>
            <span className={cn('block truncate text-xs', t.active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{t.hint}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}

interface Person { name?: string; contact?: string }

/** Who is signed in, a link to their Codevertex profile and sign out, kept apart from the pages. */
export function AccountCard({ person, onSignOut }: { person: Person; onSignOut: () => void }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/40 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-3">
        <Avatar name={person.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{person.name || 'Signed in'}</p>
          {person.contact && <p className="truncate text-xs text-muted-foreground">{person.contact}</p>}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a href={`${AUTH_UI_URL}/dashboard/profile`} className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-card/70 text-xs font-medium hover:bg-card">
          <UserRound className="h-3.5 w-3.5" aria-hidden /> Profile
        </a>
        <button type="button" onClick={onSignOut} className="flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-card/70 text-xs font-medium text-destructive hover:bg-card">
          <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out
        </button>
      </div>
    </div>
  );
}

/** Phone header account button with a small menu; closes on outside tap and Escape. */
export function AccountMenu({ person, onSignOut }: { person: Person; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account"
        className="flex min-h-11 cursor-pointer items-center gap-1 rounded-full p-1 pr-2 hover:bg-primary/8 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Avatar name={person.name} small />
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="glass-strong absolute right-0 top-[calc(100%+0.5rem)] z-40 w-64 rounded-2xl p-2">
          <div className="px-2 py-2">
            <p className="truncate text-sm font-semibold">{person.name || 'Signed in'}</p>
            {person.contact && <p className="truncate text-xs text-muted-foreground">{person.contact}</p>}
          </div>
          <a role="menuitem" href={`${AUTH_UI_URL}/dashboard/profile`} className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm hover:bg-primary/8">
            <UserRound className="h-4 w-4" aria-hidden /> Profile and security
          </a>
          <div className="my-1 border-t border-border/60" />
          <button role="menuitem" type="button" onClick={onSignOut} className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl px-2 text-sm text-destructive hover:bg-destructive/8">
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function Avatar({ name, small }: { name?: string; small?: boolean }) {
  return (
    <span aria-hidden className={cn('flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground', small ? 'h-9 w-9 text-xs' : 'h-10 w-10 text-sm')}>
      {initials(name || 'You')}
    </span>
  );
}
