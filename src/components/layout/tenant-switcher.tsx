'use client';

import { useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Landmark } from 'lucide-react';
import { AnchoredPortal } from '@/components/common/anchored-portal';
import { useSlug } from '@/hooks/use-access';
import { settingsApi } from '@/lib/api/operations';
import { qk } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

/**
 * Tenant switcher for the platform owner (treasury's TenantFilter pattern). Tenants see only their
 * own properties; the platform owner picks a tenant here and lands on the same page of that
 * tenant's console, whose property switcher then lists that tenant's properties.
 */
export function TenantSwitcher() {
  const slug = useSlug();
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const owner = useAuthStore((s) => !!s.me?.is_platform_owner);
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: tenants = [] } = useQuery({
    queryKey: qk.platformTenants(),
    queryFn: () => settingsApi.platformTenants(slug).then((r) => r.data ?? []),
    enabled: owner,
    staleTime: 10 * 60 * 1000,
  });

  if (!owner || tenants.length === 0) return null;
  const current = tenants.find((t) => t.slug === slug);
  const q = search.trim().toLowerCase();
  const shown = q ? tenants.filter((t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)) : tenants;

  const go = (to: string) => {
    setOpen(false);
    setSearch('');
    if (to === slug) return;
    // Same page in the other tenant's console (a record page falls back to its list there).
    const rest = pathname.slice(`/${slug}`.length).split('/').slice(0, 2).join('/');
    router.push(`/${to}${rest || '/dashboard'}`);
  };

  return (
    <>
      <button
        ref={anchor}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 min-w-0 max-w-[14rem] items-center gap-2 rounded-lg border bg-background px-3 text-sm hover:bg-muted"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch tenant"
      >
        <Landmark className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate">{current?.name ?? slug}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      <AnchoredPortal anchorRef={anchor} open={open} onClose={() => { setOpen(false); setSearch(''); }} width={280}>
        {tenants.length > 6 && (
          <div className="border-b p-2">
            <input
              autoFocus
              aria-label="Search tenants"
              placeholder="Search tenants"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg bg-muted/60 px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}
        <ul role="listbox" className="max-h-80 overflow-y-auto p-1">
          {shown.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                role="option"
                aria-selected={t.slug === slug}
                onClick={() => go(t.slug)}
                className={cn('flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted', t.slug === slug && 'font-semibold text-primary')}
              >
                <span className="min-w-0">
                  <span className="block truncate">{t.name}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">{t.slug}</span>
                </span>
                {t.slug === slug && <Check className="h-4 w-4 shrink-0" />}
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="px-3 py-4 text-center text-xs text-muted-foreground">No tenants found</li>}
        </ul>
      </AnchoredPortal>
    </>
  );
}
