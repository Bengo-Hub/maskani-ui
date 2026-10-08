'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { KeysetTable } from '@/components/common/keyset-table';
import { PageHeader } from '@/components/common/page-header';
import { useSlug } from '@/hooks/use-access';
import { useAccounts } from '@/hooks/use-billing';
import type { UnitAccount } from '@/lib/api/types';
import { fmtDate, kes, num } from '@/lib/utils';
import { useSelectedPropertyId } from '@/store/property';

export default function AccountsPage() {
  const slug = useSlug();
  const router = useRouter();
  const propertyId = useSelectedPropertyId(slug);
  const [owing, setOwing] = useState(true);
  const list = useAccounts({ property_id: propertyId, owing: owing || undefined });

  const columns = useMemo<DataTableColumn<UnitAccount>[]>(() => [
    {
      key: 'ref', header: 'Account', primary: true, accessor: (a) => a.account_ref,
      render: (a) => <div><p className="font-mono font-semibold">{a.account_ref}</p><p className="text-xs text-muted-foreground">{a.edges?.fund?.name}</p></div>,
    },
    { key: 'name', header: 'Bill to', accessor: (a) => a.customer_name ?? '', render: (a) => a.customer_name || <span className="text-muted-foreground">No owner</span> },
    { key: 'phone', header: 'Phone', hideBelow: 'lg', accessor: (a) => a.customer_phone ?? '' },
    { key: 'last', header: 'Last paid', hideBelow: 'md', accessor: (a) => a.last_payment_at ?? '', render: (a) => (a.last_payment_at ? fmtDate(a.last_payment_at) : 'Never') },
    {
      key: 'balance', header: 'Balance', align: 'right', mobileAction: true, accessor: (a) => num(a.balance),
      render: (a) => <span className={num(a.balance) > 0 ? 'font-semibold text-destructive tabular' : 'tabular'}>{kes(a.balance)}</span>,
    },
  ], []);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Unit accounts"
        subtitle="One account per unit and fund. The account code is the paybill account number."
        actions={
          <ToggleGroup value={[owing ? 'owing' : 'all']} onValueChange={(v) => setOwing(v[0] !== 'all')} variant="outline">
            <ToggleGroupItem value="owing">Owing</ToggleGroupItem>
            <ToggleGroupItem value="all">All</ToggleGroupItem>
          </ToggleGroup>
        }
      />
      <KeysetTable
        columns={columns}
        rows={list.rows}
        rowKey={(a) => a.id}
        loading={list.isLoading}
        error={list.isError}
        onRetry={() => void list.refetch()}
        hasMore={list.hasMore}
        loadMore={() => void list.loadMore()}
        loadingMore={list.loadingMore}
        emptyText={owing ? 'No account owes anything.' : 'No accounts yet. They open on the first billing run.'}
        onRowClick={(a) => router.push(`/${slug}/billing/accounts/${a.id}`)}
        exportFileName="unit-accounts"
      />
    </div>
  );
}
