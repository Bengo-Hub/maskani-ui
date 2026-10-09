'use client';

import { use, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { NativeSelect } from '@/components/common/field';
import { KeysetTable } from '@/components/common/keyset-table';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useBillingRun, useRetryRun, useRunLines } from '@/hooks/use-billing';
import type { BillingRunLine } from '@/lib/api/types';
import { fmtDate, kes, num, periodLabel } from '@/lib/utils';

const LINE_COLUMNS: DataTableColumn<BillingRunLine>[] = [
  { key: 'unit', header: 'Unit', primary: true, accessor: (l) => l.unit_code, render: (l) => <span className="font-medium">{l.unit_code}</span> },
  { key: 'invoice', header: 'Invoice', accessor: (l) => l.invoice_number ?? '', render: (l) => <span className="font-mono text-xs">{l.invoice_number}</span> },
  { key: 'total', header: 'Total', align: 'right', accessor: (l) => num(l.total), render: (l) => <span className="tabular">{kes(l.total)}</span> },
  { key: 'note', header: 'Note', hideBelow: 'md', accessor: (l) => l.last_error || l.skip_reason || '', render: (l) => <span className="text-xs text-muted-foreground">{l.last_error || l.skip_reason}</span> },
  { key: 'status', header: 'Status', mobileAction: true, accessor: (l) => l.status, render: (l) => <StatusBadge status={l.status} /> },
];

export default function BillingRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const slug = useSlug();
  const { can } = useAccess();
  const { data: run, isLoading } = useBillingRun(id);
  const retry = useRetryRun();
  const [show, setShow] = useState('all');
  // Filtered and paged on the API, in unit code order.
  const lines = useRunLines(id, show === 'all' ? '' : show, run?.status);
  if (isLoading || !run) return <div className="mx-auto max-w-7xl space-y-3"><Skeleton className="h-10 w-56" /><Skeleton className="h-40" /></div>;

  const toBill = Math.max(0, (run.unit_count ?? 0) - (run.skipped_count ?? 0));
  const done = (run.issued_count ?? 0) + (run.failed_count ?? 0);
  const pct = toBill > 0 ? Math.round((done / toBill) * 100) : 100;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        back={{ href: `/${slug}/billing/runs`, label: 'Billing runs' }}
        title={`Bills for ${periodLabel(run.period)}`}
        subtitle={<span className="inline-flex flex-wrap items-center gap-2"><StatusBadge status={run.status} /> Due {fmtDate(run.due_date)}</span>}
        actions={can('billing.run') && (run.failed_count ?? 0) > 0 && run.status !== 'issuing'
          ? <Button onClick={() => retry.mutate(run.id)} disabled={retry.isPending}><RotateCcw /> Retry {run.failed_count} failed</Button>
          : undefined}
      />
      <Card className="mb-4">
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-muted-foreground">{run.status === 'issuing' ? 'Issuing bills...' : 'Issued'}</p>
            <p className="font-display text-lg font-semibold tabular">{run.issued_count ?? 0} of {toBill}</p>
          </div>
          <Progress value={pct} />
          <dl className="grid grid-cols-2 gap-3 pt-1 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-muted-foreground">Total billed</dt><dd className="font-semibold tabular">{kes(run.total_amount)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Issued</dt><dd className="font-semibold tabular">{run.issued_count ?? 0}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Failed</dt><dd className={(run.failed_count ?? 0) > 0 ? 'font-semibold text-destructive tabular' : 'font-semibold tabular'}>{run.failed_count ?? 0}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Skipped</dt><dd className="font-semibold tabular">{run.skipped_count ?? 0}</dd></div>
          </dl>
          {run.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{run.error}</p>}
        </CardContent>
      </Card>
      <h2 className="mb-2 text-sm font-semibold">Units</h2>
      <KeysetTable
        columns={LINE_COLUMNS}
        rows={lines.rows}
        rowKey={(l) => l.id}
        loading={lines.isLoading}
        error={lines.isError}
        onRetry={() => void lines.refetch()}
        hasMore={lines.hasMore}
        loadMore={() => void lines.loadMore()}
        loadingMore={lines.loadingMore}
        emptyText="Nothing to show."
        storageKey="maskani-run-lines"
        exportFileName={`bills-${run.period}`}
        toolbar={
          <NativeSelect className="w-40" value={show} onChange={(e) => setShow(e.target.value)} aria-label="Show">
            <option value="all">All units</option>
            <option value="issued">Issued</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="skipped">Skipped</option>
          </NativeSelect>
        }
      />
    </div>
  );
}
