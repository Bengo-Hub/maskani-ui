'use client';

import { Suspense, useMemo } from 'react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { NativeSelect } from '@/components/common/field';
import { KeysetTable } from '@/components/common/keyset-table';
import { PageHeader } from '@/components/common/page-header';
import { PropertyRequired, usePropertyOrSingle } from '@/components/common/property-required';
import { ToneBadge, type Tone } from '@/components/common/status-badge';
import { InsideNow } from '@/components/security/inside-now';
import { useGateEvents } from '@/hooks/use-security';
import { useUrlParam } from '@/hooks/use-url-param';
import type { GateEvent, GateEventKind } from '@/lib/api/types';
import { fmtDateTime } from '@/lib/utils';

const KIND: Record<GateEventKind, { label: string; tone: Tone }> = {
  entry: { label: 'Entry', tone: 'success' },
  exit: { label: 'Exit', tone: 'neutral' },
  denied: { label: 'Refused', tone: 'danger' },
  walk_in_request: { label: 'Walk-in asked', tone: 'warning' },
  walk_in_approved: { label: 'Walk-in allowed', tone: 'success' },
  walk_in_declined: { label: 'Walk-in refused', tone: 'danger' },
};
const KINDS = ['', ...Object.keys(KIND)] as const;

const DECIDED_BY: Record<string, string> = { host: 'Host', guard: 'Guard' };

export default function GateLogPage() {
  return <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-7xl" />}><GateLog /></Suspense>;
}

function GateLog() {
  const propertyId = usePropertyOrSingle();
  const [kind, setKind] = useUrlParam<string>('kind', '', KINDS);
  const list = useGateEvents(propertyId, (kind || undefined) as GateEventKind | undefined);
  const columns = useMemo<DataTableColumn<GateEvent>[]>(() => [
    { key: 'when', header: 'When', primary: true, accessor: (e) => e.occurred_at, render: (e) => <div><p className="font-medium">{fmtDateTime(e.occurred_at)}</p>{e.offline && <p className="text-xs text-warning">Recorded offline</p>}</div> },
    { key: 'kind', header: 'Event', mobileAction: true, accessor: (e) => KIND[e.kind]?.label ?? e.kind, render: (e) => <ToneBadge tone={KIND[e.kind]?.tone ?? 'neutral'}>{KIND[e.kind]?.label ?? e.kind}</ToneBadge> },
    {
      key: 'visitor', header: 'Visitor', accessor: (e) => e.visitor_name ?? '',
      render: (e) => <div><p>{e.visitor_name}</p>{e.vehicle_plate && <p className="font-mono text-xs text-muted-foreground">{e.vehicle_plate}</p>}</div>,
    },
    { key: 'unit', header: 'Unit', accessor: (e) => [e.unit_code, e.block].filter(Boolean).join(', ') },
    { key: 'guard', header: 'Guard', hideBelow: 'md', accessor: (e) => e.guard_name ?? '' },
    { key: 'decided', header: 'Decided by', hideBelow: 'lg', accessor: (e) => (e.decided_by ? DECIDED_BY[e.decided_by] ?? e.decided_by : '') },
    {
      key: 'exited', header: 'Left', hideBelow: 'lg', accessor: (e) => e.exited_at ?? '',
      render: (e) => e.exited_at ? fmtDateTime(e.exited_at) : e.kind === 'entry' || e.kind === 'walk_in_approved' ? <span className="text-muted-foreground">Still inside</span> : '',
    },
    { key: 'notes', header: 'Notes', hideBelow: 'xl', defaultHidden: true, accessor: (e) => e.notes ?? '' },
  ], []);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Gate log"
        subtitle="Entries, exits and refusals from the gate tablets. Kept for 90 days."
        actions={propertyId ? (
          <NativeSelect className="w-44" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Event">
            <option value="">Every event</option>
            {Object.entries(KIND).map(([v, k]) => <option key={v} value={v}>{k.label}</option>)}
          </NativeSelect>
        ) : undefined}
      />
      {!propertyId ? <PropertyRequired what="Gate records" /> : (
        <>
          <InsideNow propertyId={propertyId} />
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
            storageKey="maskani-gate-log"
            exportFileName="gate-log"
          />
        </>
      )}
    </div>
  );
}
