'use client';

import { Home } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import {
  DueSummary, NoticesPanel, PurchaseCard, QuickActions, RequestsPanel, UnitCard, VisitorsPanel,
} from '@/components/portal/home-sections';
import { useSlug } from '@/hooks/use-access';
import { usePortalNotices, usePortalPasses, usePortalPurchase, usePortalRequests, usePortalUnits } from '@/hooks/use-portal';
import { useAuthStore } from '@/store/auth';

/**
 * Owner and resident home (SRDD figure 14): what is owed and how to pay it first, then quick
 * actions, each unit with its accounts and last water reading, visitors, requests, notices and the
 * purchase plan. Everything links to its full page.
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold">{first ? `Hello, ${first}` : 'Your home'}</h1>
        {estate && <p className="text-sm text-muted-foreground">{estate}</p>}
      </div>

      {isLoading && <Skeleton className="h-48 rounded-xl" />}
      {!isLoading && units.length === 0 && (
        <EmptyState icon={Home} title="No unit linked yet" description="Ask the estate office to link your phone number to your unit." />
      )}

      {units.length > 0 && <DueSummary units={units} />}
      {units.length > 0 && <QuickActions base={base} />}

      {units.map((u) => <UnitCard key={u.unit.id} data={u} slug={slug} email={me?.email} />)}

      {contracts.map((c) => (
        <PurchaseCard key={c.id} base={base} contract={c} unitCode={units.find((u) => u.unit.id === c.unit_id)?.unit.code} />
      ))}

      {units.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <VisitorsPanel base={base} passes={passes} />
          <RequestsPanel base={base} requests={requests.rows} />
          <NoticesPanel base={base} notices={notices} />
        </div>
      )}
    </div>
  );
}
