'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Clock, Inbox, Landmark, Users, Wallet } from 'lucide-react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { NativeSelect } from '@/components/common/field';
import { KeysetTable } from '@/components/common/keyset-table';
import { PageHeader } from '@/components/common/page-header';
import { SearchInput } from '@/components/common/search-input';
import { SectionLayout, type Section } from '@/components/common/section-nav';
import { StatTile } from '@/components/common/stat-tile';
import { StatusBadge } from '@/components/common/status-badge';
import { AssignSuspense } from '@/components/billing/assign-suspense';
import { ArrearsAgeing } from '@/components/dashboard/arrears-ageing';
import { ExportButtons } from '@/components/common/export-buttons';
import { useAccess, useSlug } from '@/hooks/use-access';
import { billingApi } from '@/lib/api/billing';
import { useArrears, useSuspense } from '@/hooks/use-billing';
import { useDashboard } from '@/hooks/use-reports';
import { useUrlParam } from '@/hooks/use-url-param';
import type { ArrearsRow, SuspenseRow } from '@/lib/api/types';
import { currentPeriod, fmtDate, fmtDateTime, kes, num } from '@/lib/utils';
import { useSelectedPropertyId } from '@/store/property';

const TABS = ['suspense', 'arrears'] as const;
type Tab = (typeof TABS)[number];

export default function CollectionsPage() {
  return <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-7xl" />}><Collections /></Suspense>;
}

/** Money in and money owed: paybill payments that found no account, and who is behind. */
function Collections() {
  const slug = useSlug();
  const router = useRouter();
  const { can } = useAccess();
  const collect = can('billing.collect');
  const propertyId = useSelectedPropertyId(slug);
  const [tab, setTab] = useUrlParam<Tab>('tab', collect ? 'suspense' : 'arrears', collect ? TABS : ['arrears']);
  const [days, setDays] = useUrlParam<string>('days', '60', ['30', '60', '90', '180']);
  const [q, setQ] = useUrlParam('q', '');
  const [min, setMin] = useUrlParam('min', '');
  const suspense = useSuspense(Number(days));
  const arrears = useArrears(propertyId, { q: tab === 'arrears' ? q : undefined, min });
  const { data: dash, isLoading: dashLoading } = useDashboard(propertyId, { from: currentPeriod(), to: currentPeriod() });
  const [assigning, setAssigning] = useState<SuspenseRow | null>(null);

  const open = useMemo(() => (suspense.data ?? []).filter((r) => r.status !== 'claimed'), [suspense.data]);
  const openValue = open.reduce((s, r) => s + num(r.amount), 0);

  const shownSuspense = useMemo(() => {
    const t = q.trim().toLowerCase();
    return open.filter((r) => !t || `${r.payer_name ?? ''} ${r.msisdn ?? ''} ${r.bill_ref_number} ${r.trans_id}`.toLowerCase().includes(t));
  }, [open, q]);

  const suspenseCols = useMemo<DataTableColumn<SuspenseRow>[]>(() => [
    { key: 'when', header: 'Received', accessor: (r) => r.trans_time, render: (r) => <span className="text-sm">{fmtDateTime(r.trans_time)}</span> },
    { key: 'amount', header: 'Amount', primary: true, align: 'right', accessor: (r) => num(r.amount), render: (r) => <span className="font-semibold tabular">{kes(r.amount)}</span> },
    { key: 'payer', header: 'Paid by', accessor: (r) => r.payer_name || r.msisdn || '', render: (r) => <div><p>{r.payer_name || 'Unknown'}</p>{r.msisdn && <p className="text-xs text-muted-foreground">{r.msisdn}</p>}</div> },
    { key: 'typed', header: 'Account typed', accessor: (r) => r.bill_ref_number, render: (r) => <span className="font-mono">{r.bill_ref_number || 'blank'}</span> },
    { key: 'paybill', header: 'Paybill', hideBelow: 'lg', accessor: (r) => r.business_shortcode },
    { key: 'ref', header: 'M-Pesa ref', hideBelow: 'lg', accessor: (r) => r.trans_id, render: (r) => <span className="font-mono text-xs">{r.trans_id}</span> },
    { key: 'status', header: 'Status', hideBelow: 'md', accessor: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
    { key: 'assign', header: '', mobileAction: true, accessor: () => '', render: (r) => <Button size="sm" onClick={() => setAssigning(r)}>Assign</Button> },
  ], []);

  const arrearsCols = useMemo<DataTableColumn<ArrearsRow>[]>(() => [
    { key: 'ref', header: 'Account', primary: true, accessor: (r) => r.account_ref, render: (r) => <span className="font-mono font-semibold">{r.account_ref}</span> },
    { key: 'name', header: 'Owner', accessor: (r) => r.customer_name ?? '' },
    { key: 'phone', header: 'Phone', hideBelow: 'md', accessor: (r) => r.customer_phone ?? '' },
    { key: 'last', header: 'Last paid', hideBelow: 'md', accessor: (r) => r.last_payment_at ?? '', render: (r) => (r.last_payment_at ? fmtDate(r.last_payment_at) : <span className="text-muted-foreground">Never</span>) },
    { key: 'balance', header: 'Owing', align: 'right', mobileAction: true, accessor: (r) => num(r.balance), render: (r) => <span className="font-semibold text-destructive tabular">{kes(r.balance)}</span> },
  ], []);

  const sections: Section<Tab>[] = [
    ...(collect ? [{ value: 'suspense' as Tab, label: 'Unmatched payments', icon: Inbox, count: open.length, hint: 'Paybill payments with no account' }] : []),
    { value: 'arrears', label: 'Arrears', icon: AlertTriangle, count: dash?.accounts_owing, hint: 'Accounts that owe' },
  ];
  const ageing = dash?.arrears_ageing ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title="Collections" subtitle="Paybill payments that need an account, and who owes what." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Landmark} label="Collected this month" value={kes(dash?.collected)} detail={`of ${kes(dash?.billed)} billed`} loading={dashLoading}
          progress={num(dash?.billed) > 0 ? num(dash?.collected) / num(dash?.billed) : undefined} />
        <StatTile icon={Wallet} label="Owing in all" value={kes(dash?.outstanding)} detail={`${dash?.accounts_owing ?? 0} accounts`} loading={dashLoading} />
        <StatTile icon={Clock} label="Over 60 days" value={kes(dash?.arrears_60_amount)} detail={`${dash?.arrears_60_accounts ?? 0} accounts`} tone={(dash?.arrears_60_accounts ?? 0) > 0 ? 'danger' : 'default'} loading={dashLoading} />
        {collect
          ? <StatTile icon={Inbox} label="Unmatched payments" value={kes(openValue)} detail={`${open.length} in the last ${days} days`} tone={open.length ? 'warning' : 'default'} loading={suspense.isLoading} />
          : <StatTile icon={Users} label="Accounts owing" value={dash?.accounts_owing ?? 0} loading={dashLoading} />}
      </div>

      <SectionLayout sections={sections} value={tab} onChange={(v) => setTab(v, { q: null })}>
        {tab === 'suspense' && collect ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <SearchInput value={q} onSearch={(v) => setQ(v)} placeholder="Payer, phone, typed account or ref" className="sm:max-w-sm" />
              <NativeSelect className="sm:w-48" value={days} onChange={(e) => setDays(e.target.value)} aria-label="Period">
                <option value="30">Last 30 days</option>
                <option value="60">Last 60 days</option>
                <option value="90">Last 90 days</option>
                <option value="180">Last 6 months</option>
              </NativeSelect>
            </div>
            {!suspense.isLoading && open.length === 0 ? (
              <EmptyState icon={Inbox} title="Nothing unmatched" description={`Every paybill payment in the last ${days} days found its account.`} />
            ) : (
              <DataTable columns={suspenseCols} rows={shownSuspense} rowKey={(r) => r.trans_id} loading={suspense.isLoading} emptyText="No payments match." storageKey="maskani-suspense" />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {ageing.length > 0 && (
              <div className="rounded-2xl border bg-card p-4">
                <p className="mb-3 text-sm font-semibold">Owing by age</p>
                <ArrearsAgeing buckets={ageing} />
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <SearchInput value={q} onSearch={(v) => setQ(v)} placeholder="Account or owner name" className="sm:max-w-sm" />
              <NativeSelect className="sm:w-52" value={min} onChange={(e) => setMin(e.target.value)} aria-label="Owing at least">
                <option value="">Any amount owing</option>
                <option value="1000">KES 1,000 or more</option>
                <option value="5000">KES 5,000 or more</option>
                <option value="20000">KES 20,000 or more</option>
                <option value="100000">KES 100,000 or more</option>
              </NativeSelect>
              {/* The download follows the same search, amount and property as the list. */}
              <div className="sm:ml-auto">
                <ExportButtons name="arrears" title="Arrears" perm="reports.export"
                  fetchFile={(format) => billingApi.arrearsFile(slug, { property_id: propertyId || undefined, q: q || undefined, min: min || undefined }, format)} />
              </div>
            </div>
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
          </div>
        )}
      </SectionLayout>
      <AssignSuspense row={assigning} onClose={() => setAssigning(null)} />
    </div>
  );
}
