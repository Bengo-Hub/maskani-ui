'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Home, LogOut, ShieldCheck, Wrench } from 'lucide-react';
import { MobileBottomNav, type MobileNavTab } from '@bengo-hub/shared-ui-lib/navigation';
import { useTenantBranding } from '@bengo-hub/shared-ui-lib/tenant';
import { Button } from '@/components/ui/button';
import { AppSplash } from '@/components/layout/app-splash';
import { useSlug } from '@/hooks/use-access';
import { useAuthStore } from '@/store/auth';
import { TermsGate } from './terms-gate';

export function PortalShell({ children }: { children: ReactNode }) {
  const slug = useSlug();
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const { tenant } = useTenantBranding();
  const status = useAuthStore((s) => s.status);
  const me = useAuthStore((s) => s.me);
  const restore = useAuthStore((s) => s.restore);
  const logout = useAuthStore((s) => s.logout);
  const [moreOpen, setMoreOpen] = useState(false);
  const signInPage = pathname.endsWith('/portal/sign-in');

  useEffect(() => {
    if (!signInPage && status === 'idle') void restore(slug);
  }, [signInPage, status, slug, restore]);

  useEffect(() => {
    if (signInPage) return;
    if (status === 'unauthenticated' || (status === 'authenticated' && me && !me.is_portal_user)) {
      router.replace(`/${slug}/portal/sign-in?next=${encodeURIComponent(pathname)}`);
    }
  }, [signInPage, status, me, slug, pathname, router]);

  if (signInPage) return <>{children}</>;
  if (status !== 'authenticated' || !me?.is_portal_user) return <AppSplash />;

  const base = `/${slug}/portal`;
  const tabs: MobileNavTab[] = [
    { key: 'home', label: 'Home', href: base, icon: Home, active: pathname === base || pathname.startsWith(`${base}/statement`) || pathname.startsWith(`${base}/purchase`) },
    { key: 'visitors', label: 'Visitors', href: `${base}/visitors`, icon: ShieldCheck, active: pathname.startsWith(`${base}/visitors`) || pathname.startsWith(`${base}/walk-ins`) },
    { key: 'requests', label: 'Requests', href: `${base}/requests`, icon: Wrench, active: pathname.startsWith(`${base}/requests`) },
    { key: 'notices', label: 'Notices', href: `${base}/notices`, icon: Bell, active: pathname.startsWith(`${base}/notices`) },
  ];

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b bg-card pt-safe">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href={base} className="flex min-w-0 items-center gap-2">
            {tenant?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logoUrl} alt="" className="h-8 w-8 rounded-md object-contain" />
            ) : (
              <Image src="/brand/maskani-icon.svg" alt="" width={28} height={28} />
            )}
            <span className="truncate font-display font-semibold">{tenant?.orgName ?? 'Maskani'}</span>
          </Link>
          {/* The shared bottom bar is hidden from lg up, so wide screens get the same tabs here. */}
          <nav className="hidden items-center gap-1 lg:flex">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm ${t.active ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground hover:bg-muted'}`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </Link>
            ))}
          </nav>
          <Button variant="ghost" size="sm" onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen}>
            {me.user?.name?.split(' ')[0] || 'Account'}
          </Button>
        </div>
        {moreOpen && (
          <div className="mx-auto flex max-w-3xl justify-end px-4 pb-3">
            <Button variant="outline" size="sm" onClick={() => void logout(slug)}><LogOut /> Sign out</Button>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:py-6 lg:pb-8">{children}</main>
      <MobileBottomNav tabs={tabs} LinkComponent={Link} onOpenMore={() => setMoreOpen(true)} moreLabel="Account" />
      <TermsGate />
    </div>
  );
}
