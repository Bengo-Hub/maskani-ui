'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { NativeSelect } from '@/components/common/field';
import { KeysetTable } from '@/components/common/keyset-table';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { useSlug } from '@/hooks/use-access';
import { useReservations } from '@/hooks/use-sales';
import type { Reservation } from '@/lib/api/types';
import { fmtDate, kes, num, titleCase } from '@/lib/utils';
import { useSelectedPropertyId } from '@/store/property';

const STATUSES: Reservation['status'][] = ['pending_payment', 'active', 'converted', 'expired', 'cancelled'];

/** Whole calendar days from today to a date (negative once it has passed). */
function daysLeft(v?: string): number | null {
  if (!v) return null;
  const end = new Date(v);
  const a = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const t = new Date();
  const b = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((a - b) / 86_400_000);
}

export default function ReservationsPage() {
  const slug = useSlug();
  const router = useRouter();
  const propertyId = useSelectedPropertyId(slug);
  const [status, setStatus] = useState('');
  const list = useReservations({ property_id: propertyId, status });

  const columns = useMemo<DataTableColumn<Reservation>[]>(() => [
    { key: 'unit', header: 'Unit', primary: true, accessor: (r) => r.unit_code ?? '', render: (r) => <div><p className="font-medium">{r.unit_code}</p><p className="text-xs text-muted-foreground">{r.buyer_name}</p></div> },
    { key: 'price', header: 'Price', align: 'right', hideBelow: 'md', accessor: (r) => num(r.price), render: (r) => <span className="tabular">{kes(r.price ?? 0)}</span> },
    {
      key: 'fee', header: 'Fee', align: 'right', accessor: (r) => num(r.fee_amount),
      render: (r) => <div className="text-right"><p className="tabular">{kes(r.fee_amount ?? 0)}</p><p className="text-xs text-muted-foreground">{r.fee_paid_at ? `Paid ${fmtDate(r.fee_paid_at)}` : 'Not paid'}</p></div>,
    },
    {
      key: 'expires', header: 'Holds until', hideBelow: 'sm', accessor: (r) => r.expires_at ?? '',
      render: (r) => {
        const d = daysLeft(r.expires_at);
        const live = r.status === 'active' || r.status === 'pending_payment';
        return <div><p>{fmtDate(r.expires_at)}</p>{live && d != null && <p className={d <= 2 ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>{d < 0 ? 'Lapsing now' : d === 0 ? 'Last day' : `${d} day${d === 1 ? '' : 's'} left`}</p>}</div>;
      },
    },
    { key: 'status', header: 'Status', mobileAction: true, accessor: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
  ], []);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Reservations"
        subtitle="Units held for buyers. A hold lapses on its date unless it becomes a contract."
        actions={
          <NativeSelect className="w-44" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">Any status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
          </NativeSelect>
        }
      />
      <KeysetTable
        columns={columns}
        rows={list.rows}
        rowKey={(r) => r.id}
        loading={list.isLoading}
        error={list.isError}
        onRetry={() => void list.refetch()}
        hasMore={list.hasMore}
        loadMore={() => void list.loadMore()}
        loadingMore={list.loadingMore}
        emptyText="No reservations. Reserve a unit from the availability board."
        onRowClick={(r) => (r.sale_contract_id ? router.push(`/${slug}/sales/contracts/${r.sale_contract_id}`) : router.push(`/${slug}/sales`))}
        exportFileName="reservations"
      />
    </div>
  );
}
