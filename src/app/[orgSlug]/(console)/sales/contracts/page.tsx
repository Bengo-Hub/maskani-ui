'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { NativeSelect } from '@/components/common/field';
import { KeysetTable } from '@/components/common/keyset-table';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { useSlug } from '@/hooks/use-access';
import { useContracts } from '@/hooks/use-sales';
import type { SaleContract } from '@/lib/api/types';
import { fmtDate, kes, num, titleCase } from '@/lib/utils';
import { useSelectedPropertyId } from '@/store/property';

export default function ContractsPage() {
  const slug = useSlug();
  const router = useRouter();
  const propertyId = useSelectedPropertyId(slug);
  const [status, setStatus] = useState('');
  const list = useContracts({ property_id: propertyId, status });

  const columns = useMemo<DataTableColumn<SaleContract>[]>(() => [
    { key: 'no', header: 'Contract', primary: true, accessor: (c) => c.contract_number, render: (c) => <div><p className="font-mono font-medium">{c.contract_number}</p><p className="text-xs text-muted-foreground">{titleCase(c.payment_option)}</p></div> },
    { key: 'net', header: 'Net price', align: 'right', accessor: (c) => num(c.net_price), render: (c) => <span className="tabular">{kes(c.net_price)}</span> },
    { key: 'paid', header: 'Paid', align: 'right', hideBelow: 'md', accessor: (c) => num(c.paid_total), render: (c) => <span className="tabular">{kes(c.paid_total ?? 0)}</span> },
    { key: 'signed', header: 'Signed', hideBelow: 'lg', accessor: (c) => c.signed_at ?? '', render: (c) => fmtDate(c.signed_at) || 'Not yet' },
    { key: 'status', header: 'Status', mobileAction: true, accessor: (c) => c.status, render: (c) => <StatusBadge status={c.status} /> },
  ], []);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Sale contracts"
        subtitle="Start a sale from the availability board"
        actions={
          <NativeSelect className="w-44" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">Any status</option>
            {['draft', 'active', 'fully_paid', 'handed_over', 'in_default', 'terminated'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
          </NativeSelect>
        }
      />
      <KeysetTable
        columns={columns}
        rows={list.rows}
        rowKey={(c) => c.id}
        loading={list.isLoading}
        error={list.isError}
        onRetry={() => void list.refetch()}
        hasMore={list.hasMore}
        loadMore={() => void list.loadMore()}
        loadingMore={list.loadingMore}
        emptyText="No contracts yet."
        onRowClick={(c) => router.push(`/${slug}/sales/contracts/${c.id}`)}
        exportFileName="sale-contracts"
      />
    </div>
  );
}
