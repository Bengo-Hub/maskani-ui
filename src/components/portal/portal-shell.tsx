'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Home, ShieldCheck, Wrench } from 'lucide-react';
import { MobileBottomNav, type MobileNavTab } from '@bengo-hub/shared-ui-lib/navigation';
import { useTenantBranding } from '@bengo-hub/shared-ui-lib/tenant';
import { AppSplash } from '@/components/layout/app-splash';
import { useSlug } from '@/hooks/use-access';
import { useAuthStore } from '@/store/auth';
import { AccountCard, AccountMenu, PortalBrand, PortalSideNav, type PortalTab } from './portal-nav';
import { TermsGate } from './terms-gate';

/** Width of the desktop sidebar column; the content area starts after it. */
const SIDE = 'lg:pl-[18.5rem]';

/**
 * The owner and resident portal. From 1024px a floating glass sidebar carries the estate's logo,
 * the pages and the account; the content uses the width beside it. On phones a glass header keeps
 * the logo and account menu, and the shared bottom tabs carry the pages.
 */
export function PortalShell({ children }: { children: ReactNode }) {
  const slug = useSlug();
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const { tenant } = useTenantBranding();
  const status = useAuthStore((s) => s.status);
  const me = useAuthStore((s) => s.me);
  const restore = useAuthStore((s) => s.restore);
  const logout = useAuthStore((s) => s.logout);
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
  const tabs: PortalTab[] = [
    { key: 'home', label: 'Home', hint: 'What you owe and pay', href: base, icon: Home,
      active: pathname === base || pathname.startsWith(`${base}/statement`) || pathname.startsWith(`${base}/purchase`) },
    { key: 'visitors', label: 'Visitors', hint: 'Passes for guests', href: `${base}/visitors`, icon: ShieldCheck,
      active: pathname.startsWith(`${base}/visitors`) || pathname.startsWith(`${base}/walk-ins`) },
    { key: 'requests', label: 'Requests', hint: 'Repairs and problems', href: `${base}/requests`, icon: Wrench, active: pathname.startsWith(`${base}/requests`) },
    { key: 'notices', label: 'Notices', hint: 'News from the estate', href: `${base}/notices`, icon: Bell, active: pathname.startsWith(`${base}/notices`) },
  ];
  const mobileTabs: MobileNavTab[] = tabs.map(({ key, label, href, icon, active }) => ({ key, label, href, icon, active }));
  const person = { name: me.user?.name, contact: me.email || me.user?.email || me.user?.phone };
  const signOut = () => void logout(slug);

  return (
    <div className="portal-surface relative min-h-dvh bg-background">
      <PortalCanvas />

      <a href="#portal-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-card focus:px-4 focus:py-2">
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[18.5rem] p-4 lg:block">
        <div className="glass flex h-full flex-col rounded-[1.75rem] p-5">
          <PortalBrand logoUrl={tenant?.logoUrl} orgName={tenant?.orgName} href={base} />
          <div className="mt-8 flex-1 overflow-y-auto">
            <PortalSideNav tabs={tabs} />
          </div>
          <AccountCard person={person} onSignOut={signOut} />
        </div>
      </aside>

      <header className="sticky top-0 z-30 px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)] lg:hidden">
        <div className="glass-strong flex h-16 items-center justify-between gap-3 rounded-2xl px-3">
          <PortalBrand logoUrl={tenant?.logoUrl} orgName={tenant?.orgName} href={base} compact />
          <AccountMenu person={person} onSignOut={signOut} />
        </div>
      </header>

      <main id="portal-main" className={`relative ${SIDE}`}>
        <div className="mx-auto w-full max-w-6xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
          {children}
        </div>
      </main>

      <div className="lg:hidden">
        <MobileBottomNav tabs={mobileTabs} LinkComponent={Link} />
      </div>
      <TermsGate />
    </div>
  );
}

/**
 * The calm canvas the glass sits on: the page tone with two large, very faint blurred shapes in the
 * brand plum and gold. Decorative only, fixed so it never scrolls or shifts layout.
 */
function PortalCanvas() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
      <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-primary/12 blur-3xl" />
      <div className="absolute -bottom-48 right-[-10rem] h-[36rem] w-[36rem] rounded-full bg-gold/14 blur-3xl" />
      <div className="absolute left-1/2 top-1/3 h-[22rem] w-[22rem] rounded-full bg-primary/6 blur-3xl" />
    </div>
  );
}
