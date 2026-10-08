'use client';

import { useMemo } from 'react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { KeysetTable } from '@/components/common/keyset-table';
import { PageHeader } from '@/components/common/page-header';
import { PropertyRequired, usePropertyOrSingle } from '@/components/common/property-required';
import { ToneBadge, type Tone } from '@/components/common/status-badge';
import { useGateEvents } from '@/hooks/use-security';
import type { GateEvent } from '@/lib/api/types';
import { fmtDateTime } from '@/lib/utils';

const KIND: Record<string, { label: string; tone: Tone }> = {
  entry: { label: 'Entry', tone: 'success' },
  exit: { label: 'Exit', tone: 'neutral' },
  denied: { label: 'Refused', tone: 'danger' },
  walk_in_request: { label: 'Walk-in asked', tone: 'warning' },
  walk_in_approved: { label: 'Walk-in allowed', tone: 'success' },
  walk_in_declined: { label: 'Walk-in refused', tone: 'danger' },
};

export default function GateLogPage() {
  const propertyId = usePropertyOrSingle();
  const list = useGateEvents(propertyId);
  const columns = useMemo<DataTableColumn<GateEvent>[]>(() => [
    { key: 'when', header: 'When', primary: true, accessor: (e) => e.occurred_at, render: (e) => <div><p className="font-medium">{fmtDateTime(e.occurred_at)}</p>{e.offline && <p className="text-xs text-warning">Recorded offline</p>}</div> },
    { key: 'kind', header: 'Event', mobileAction: true, accessor: (e) => e.kind, render: (e) => <ToneBadge tone={KIND[e.kind]?.tone ?? 'neutral'}>{KIND[e.kind]?.label ?? e.kind}</ToneBadge> },
    { key: 'visitor', header: 'Visitor', accessor: (e) => e.visitor_name ?? '' },
    { key: 'unit', header: 'Unit', hideBelow: 'md', accessor: (e) => e.host_unit_code ?? '' },
    { key: 'plate', header: 'Car', hideBelow: 'lg', accessor: (e) => e.vehicle_plate ?? '' },
    { key: 'notes', header: 'Notes', hideBelow: 'lg', accessor: (e) => e.notes ?? '' },
  ], []);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Gate log" subtitle="Entries, exits and refusals from the gate tablets. Kept for 90 days." />
      {!propertyId ? <PropertyRequired what="Gate records" /> : (
        <KeysetTable
          columns={columns}
          rows={list.rows}
          rowKey={(e) => e.id}
          loading={list.isLoading}
          error={list.isError}
          onRetry={() => void list.refetch()}
          hasMore={list.hasMore}
          loadMore={() => void list.loadMore()}
          loadingMore={list.loadingMore}
          emptyText="Nothing recorded at the gate yet."
          exportFileName="gate-log"
        />
      )}
    </div>
  );
}
