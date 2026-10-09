'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Gauge, LayoutGrid, Plus, Wallet, Wrench, Lock } from 'lucide-react';
import { MobileBottomNav, type MobileNavTab } from '@bengo-hub/shared-ui-lib/navigation';
import { FeatureLock } from '@bengo-hub/shared-ui-lib/subscription';
import { AppSplash } from './app-splash';
import { Header } from './header';
import { ModuleReadOnly } from './module-read-only';
import { Sidebar } from './sidebar';
import { EmptyState } from '@/components/common/empty-state';
import { useSlug } from '@/hooks/use-access';
import { navAllowed, navItemFor } from '@/lib/nav';
import { hasPermission, useAuthStore } from '@/store/auth';

const COLLAPSE_KEY = 'maskani-sidebar-collapsed';

function useStaffSession(slug: string) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const status = useAuthStore((s) => s.status);
  const session = useAuthStore((s) => s.session);
  const restore = useAuthStore((s) => s.restore);

  useEffect(() => {
    if (status === 'idle') void restore(slug);
  }, [status, slug, restore]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/${slug}/login?return_to=${encodeURIComponent(pathname)}`);
    } else if (status === 'authenticated' && session?.kind === 'portal') {
      router.replace(`/${slug}/portal`);
    }
  }, [status, session?.kind, slug, pathname, router]);

  return status === 'authenticated' && session?.kind !== 'portal';
}

export function ConsoleShell({ children }: { children: ReactNode }) {
  const slug = useSlug();
  const pathname = usePathname() ?? '';
  const ready = useStaffSession(slug);
  const me = useAuthStore((s) => s.me);
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1'); } catch { /* storage blocked */ }
  }, []);
  const toggle = () => setCollapsed((v) => {
    try { localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1'); } catch { /* storage blocked */ }
    return !v;
  });

  if (!ready) return <AppSplash />;

  const sub = pathname.slice(`/${slug}`.length) || '/';
  const item = navItemFor(sub);
  const allowed = !item || navAllowed(me, item);
  // Role allows it but the module is switched off: open read only (FR-09) instead of blocking,
  // so records stay viewable and exportable. The nav still hides the module.
  const readOnly = !allowed && !!item?.modules?.length && navAllowed(me, { perms: item.perms });

  const base = `/${slug}`;
  const tabs: MobileNavTab[] = [
    { key: 'home', label: 'Home', href: `${base}/dashboard`, icon: Gauge, active: sub.startsWith('/dashboard') },
    { key: 'units', label: 'Units', href: `${base}/units`, icon: LayoutGrid, active: sub.startsWith('/units') },
    { key: 'money', label: 'Money', href: `${base}/billing/accounts`, icon: Wallet, active: sub.startsWith('/billing') || sub.startsWith('/collections') },
    { key: 'works', label: 'Works', href: `${base}/works`, icon: Wrench, active: sub.startsWith('/works') },
  ].filter((t) => {
    const n = navItemFor(t.href.slice(base.length));
    return !n || navAllowed(me, n);
  });

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} onToggle={toggle} mobileOpen={drawer} onMobileOpenChange={setDrawer} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header title={item?.label} onMenu={() => setDrawer(true)} />
        {/* The shell owns page padding; pages add only a max-w wrapper. min-h-0 lets it scroll. */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-4 py-5 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6 lg:px-8 lg:pb-8">
            {allowed ? children : readOnly && item?.modules ? (
              // A plan without the module still shows the upgrade path; FeatureLock passes its
              // children through when the plan covers it and the estate only switched it off.
              <FeatureLock feature={`maskani_${item.modules[0]}`} mode="block">
                <ModuleReadOnly modules={item.modules} settingsHref={`${base}/settings?tab=modules`} canManage={hasPermission(me, 'settings.manage')}>
                  {children}
                </ModuleReadOnly>
              </FeatureLock>
            ) : (
              <EmptyState
                icon={Lock}
                title="This area is not available"
                description="Your role does not include it. Ask an administrator."
                action={<Link href={`${base}/dashboard`} className="text-sm font-medium text-primary hover:underline">Back to the dashboard</Link>}
              />
            )}
          </div>
        </main>
      </div>
      <div className="lg:hidden">
        <MobileBottomNav
          tabs={tabs}
          centerAction={navAllowed(me, { modules: ['maintenance'], perms: ['works.manage'] }) ? { label: 'New request', href: `${base}/works?new=1`, icon: Plus } : undefined}
          onOpenMore={() => setDrawer(true)}
          LinkComponent={Link}
        />
      </div>
    </div>
  );
}
