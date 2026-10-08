'use client';

import { Suspense, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Inbox } from 'lucide-react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/common/empty-state';
import { KeysetTable } from '@/components/common/keyset-table';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { AssignSuspense } from '@/components/billing/assign-suspense';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useArrears, useSuspense } from '@/hooks/use-billing';
import type { ArrearsRow, SuspenseRow } from '@/lib/api/types';
import { fmtDate, fmtDateTime, kes, num } from '@/lib/utils';
import { useSelectedPropertyId } from '@/store/property';

export default function CollectionsPage() {
  return <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-7xl" />}><Collections /></Suspense>;
}

function Collections() {
  const slug = useSlug();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { can } = useAccess();
  const tab = sp.get('tab') ?? (can('billing.collect') ? 'suspense' : 'arrears');
  const propertyId = useSelectedPropertyId(slug);
  const suspense = useSuspense(60);
  const arrears = useArrears(propertyId);
  const [assigning, setAssigning] = useState<SuspenseRow | null>(null);
  const openRows = useMemo(() => (suspense.data ?? []).filter((r) => r.status !== 'claimed'), [suspense.data]);

  const arrearsCols = useMemo<DataTableColumn<ArrearsRow>[]>(() => [
    { key: 'ref', header: 'Account', primary: true, accessor: (r) => r.account_ref, render: (r) => <span className="font-mono font-semibold">{r.account_ref}</span> },
    { key: 'name', header: 'Owner', accessor: (r) => r.customer_name ?? '' },
    { key: 'phone', header: 'Phone', hideBelow: 'md', accessor: (r) => r.customer_phone ?? '' },
    { key: 'last', header: 'Last paid', hideBelow: 'md', accessor: (r) => r.last_payment_at ?? '', render: (r) => (r.last_payment_at ? fmtDate(r.last_payment_at) : 'Never') },
    { key: 'balance', header: 'Owing', align: 'right', mobileAction: true, accessor: (r) => num(r.balance), render: (r) => <span className="font-semibold text-destructive tabular">{kes(r.balance)}</span> },
  ], []);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Collections" subtitle="Unmatched paybill payments and who owes what" />
      <Tabs value={tab} onValueChange={(v) => router.replace(`${pathname}?tab=${v}`)}>
        <TabsList>
          {can('billing.collect') && <TabsTrigger value="suspense">Unmatched payments{openRows.length ? ` (${openRows.length})` : ''}</TabsTrigger>}
          <TabsTrigger value="arrears">Arrears</TabsTrigger>
        </TabsList>
        {can('billing.collect') && (
          <TabsContent value="suspense" className="pt-4">
            {suspense.isLoading ? <Skeleton className="h-48" /> : openRows.length === 0 ? (
              <EmptyState icon={Inbox} title="Nothing unmatched" description="Every paybill payment in the last 60 days found its account." />
            ) : (
              <ul className="divide-y rounded-xl border bg-card">
                {openRows.map((r) => (
                  <li key={r.trans_id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="min-w-0">
                      <p className="font-medium tabular">{kes(r.amount)} <span className="font-normal text-muted-foreground">from {r.payer_name || r.msisdn || 'unknown'}</span></p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDateTime(r.trans_time)} · paybill {r.business_shortcode} · account typed &quot;{r.bill_ref_number || 'blank'}&quot; · {r.trans_id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} />
                      <Button size="sm" onClick={() => setAssigning(r)}>Assign</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        )}
        <TabsContent value="arrears" className="pt-4">
          <KeysetTable
            columns={arrearsCols}
            rows={arrears.rows}
            rowKey={(r) => r.account_id}
            loading={arrears.isLoading}
            error={arrears.isError}
            onRetry={() => void arrears.refetch()}
            hasMore={arrears.hasMore}
            loadMore={() => void arrears.loadMore()}
            loadingMore={arrears.loadingMore}
            emptyText="No arrears."
            onRowClick={(r) => router.push(`/${slug}/billing/accounts/${r.account_id}`)}
            exportFileName="arrears"
          />
        </TabsContent>
      </Tabs>
      <AssignSuspense row={assigning} onClose={() => setAssigning(null)} />
    </div>
  );
}
