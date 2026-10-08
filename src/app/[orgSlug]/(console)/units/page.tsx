'use client';

import { Suspense, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FileUp, Plus } from 'lucide-react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NativeSelect } from '@/components/common/field';
import { KeysetTable } from '@/components/common/keyset-table';
import { PageHeader } from '@/components/common/page-header';
import { SearchInput } from '@/components/common/search-input';
import { StatusBadge } from '@/components/common/status-badge';
import { UnitForm } from '@/components/register/unit-form';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useProperties, useProperty, useUnits } from '@/hooks/use-register';
import type { Unit } from '@/lib/api/types';
import { label, OCCUPANCY_STATUS, SALE_STATUS } from '@/lib/labels';
import { kes, num, titleCase } from '@/lib/utils';
import { useSelectedPropertyId } from '@/store/property';

export default function UnitsPage() {
  return <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-7xl" />}><Units /></Suspense>;
}

function Units() {
  const slug = useSlug();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { can, mod } = useAccess();
  const selected = useSelectedPropertyId(slug);
  const { data: properties = [] } = useProperties();
  const [open, setOpen] = useState(false);

  const filters = useMemo(() => ({
    property_id: sp.get('property_id') ?? selected ?? '',
    block_id: sp.get('block_id') ?? '',
    sale_status: sp.get('sale_status') ?? '',
    occupancy_status: sp.get('occupancy_status') ?? '',
    q: sp.get('q') ?? '',
  }), [sp, selected]);
  const { data: property } = useProperty(filters.property_id);
  const list = useUnits(filters);

  const setFilter = (k: string, v: string) => {
    const next = new URLSearchParams(sp.toString());
    if (v) next.set(k, v); else next.delete(k);
    if (k === 'property_id') next.delete('block_id');
    router.replace(`${pathname}?${next.toString()}`);
  };

  const columns = useMemo<DataTableColumn<Unit>[]>(() => [
    {
      key: 'code', header: 'Unit', primary: true, accessor: (u) => u.code,
      render: (u) => (
        <div className="min-w-0">
          <p className="font-semibold">{u.code}</p>
          <p className="text-xs text-muted-foreground">{[titleCase(u.unit_type), u.bedrooms != null ? `${u.bedrooms} bed` : ''].filter(Boolean).join(' · ')}</p>
        </div>
      ),
    },
    { key: 'block', header: 'Block', hideBelow: 'md', accessor: (u) => u.edges?.block?.code ?? '', render: (u) => u.edges?.block?.name || u.edges?.block?.code || '' },
    { key: 'owner', header: 'Owner', accessor: (u) => u.owner_name ?? '', render: (u) => u.owner_name || <span className="text-muted-foreground">No owner</span> },
    { key: 'occupancy', header: 'Occupancy', hideBelow: 'lg', accessor: (u) => u.occupancy_status, render: (u) => <StatusBadge status={u.occupancy_status} label={label(OCCUPANCY_STATUS, u.occupancy_status)} /> },
    ...(mod('sales') ? [{ key: 'sale', header: 'Sale', hideBelow: 'md' as const, accessor: (u: Unit) => u.sale_status, render: (u: Unit) => <StatusBadge status={u.sale_status} label={label(SALE_STATUS, u.sale_status)} /> }] : []),
    ...(mod('billing') ? [{
      key: 'balance', header: 'Balance', align: 'right' as const, mobileAction: true, accessor: (u: Unit) => num(u.balance),
      render: (u: Unit) => <span className={num(u.balance) > 0 ? 'font-semibold text-destructive tabular' : 'tabular text-muted-foreground'}>{kes(u.balance)}</span>,
    }] : []),
  ], [mod]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Units"
        subtitle={property ? property.name : 'All properties'}
        actions={can('units.manage') ? (
          <>
            {can('parties.manage') && (
              <Link href={`/${slug}/units/import`} className={buttonVariants({ variant: 'outline' })}><FileUp /> Import CSV</Link>
            )}
            <Button onClick={() => setOpen(true)}><Plus /> New unit</Button>
          </>
        ) : undefined}
      />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput value={filters.q} onSearch={(q) => setFilter('q', q)} placeholder="Unit code" />
        {properties.length > 1 && (
          <NativeSelect className="sm:w-48" value={filters.property_id} onChange={(e) => setFilter('property_id', e.target.value)} aria-label="Property">
            <option value="">All properties</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </NativeSelect>
        )}
        {(property?.edges?.blocks?.length ?? 0) > 0 && (
          <NativeSelect className="sm:w-36" value={filters.block_id} onChange={(e) => setFilter('block_id', e.target.value)} aria-label="Block">
            <option value="">All blocks</option>
            {property?.edges?.blocks?.map((b) => <option key={b.id} value={b.id}>{b.name || b.code}</option>)}
          </NativeSelect>
        )}
        <NativeSelect className="sm:w-44" value={filters.occupancy_status} onChange={(e) => setFilter('occupancy_status', e.target.value)} aria-label="Occupancy">
          <option value="">Any occupancy</option>
          {Object.entries(OCCUPANCY_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </NativeSelect>
        {mod('sales') && (
          <NativeSelect className="sm:w-44" value={filters.sale_status} onChange={(e) => setFilter('sale_status', e.target.value)} aria-label="Sale status">
            <option value="">Any sale status</option>
            {Object.entries(SALE_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </NativeSelect>
        )}
      </div>
      <KeysetTable
        columns={columns}
        rows={list.rows}
        rowKey={(u) => u.id}
        loading={list.isLoading}
        error={list.isError}
        onRetry={() => void list.refetch()}
        hasMore={list.hasMore}
        loadMore={() => void list.loadMore()}
        loadingMore={list.loadingMore}
        emptyText="No units match these filters."
        onRowClick={(u) => router.push(`/${slug}/units/${u.id}`)}
        storageKey="maskani-units"
        exportFileName="units"
      />
      <UnitForm open={open} onOpenChange={setOpen} propertyId={filters.property_id} onSaved={(u) => router.push(`/${slug}/units/${u.id}`)} />
    </div>
  );
}
