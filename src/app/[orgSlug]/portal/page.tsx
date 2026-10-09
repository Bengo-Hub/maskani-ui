'use client';

import { Home } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import {
  HomeHero, NoticesPanel, PurchaseCard, QuickActions, RequestsPanel, UnitCard, VisitorsPanel,
} from '@/components/portal/home-sections';
import { PushPrompt } from '@/components/portal/push-prompt';
import { useSlug } from '@/hooks/use-access';
import { usePortalNotices, usePortalPasses, usePortalPurchase, usePortalRequests, usePortalUnits } from '@/hooks/use-portal';
import { useAuthStore } from '@/store/auth';

/**
 * Owner and resident home (SRDD figure 14): the greeting band with what is owed and Pay now, quick
 * actions, then each unit with its accounts and last water reading beside visitors, requests and
 * notices on wide screens (stacked on phones), and the purchase plan. Everything links to its page.
 */
export default function PortalHome() {
  const slug = useSlug();
  const base = `/${slug}`;
  const me = useAuthStore((s) => s.me);
  const { data: units = [], isLoading } = usePortalUnits();
  const { data: contracts = [] } = usePortalPurchase();
  const { data: passes = [] } = usePortalPasses();
  const requests = usePortalRequests();
  const { data: notices = [] } = usePortalNotices();
  const first = me?.user?.name?.split(' ')[0];
  const estate = units[0]?.property?.name;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-56 rounded-[1.75rem]" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-18 rounded-2xl" />)}</div>
        <Skeleton className="h-64 rounded-[1.25rem]" />
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div className="space-y-5">
        <HomeHero name={first} units={[]} />
        <EmptyState icon={Home} title="No unit linked yet" description="Ask the estate office to link your phone number to your unit." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HomeHero name={first} estate={estate} units={units} />
      <PushPrompt slug={slug} />
      <QuickActions base={base} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-label="Your units" className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your {units.length === 1 ? 'unit' : 'units'}</h2>
          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
            {units.map((u) => <UnitCard key={u.unit.id} data={u} slug={slug} email={me?.email} />)}
          </div>
          {contracts.map((c) => (
            <PurchaseCard key={c.id} base={base} contract={c} unitCode={units.find((u) => u.unit.id === c.unit_id)?.unit.code} />
          ))}
        </section>

        <aside aria-label="Around the estate" className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Around the estate</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-1">
            <VisitorsPanel base={base} passes={passes} />
            <RequestsPanel base={base} requests={requests.rows} />
            <NoticesPanel base={base} notices={notices} />
          </div>
        </aside>
      </div>
    </div>
  );
}
