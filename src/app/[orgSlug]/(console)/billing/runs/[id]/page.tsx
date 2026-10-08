'use client';

import { use, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { NativeSelect } from '@/components/common/field';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useBillingRun, useRetryRun, useRunLines } from '@/hooks/use-billing';
import { fmtDate, kes, periodLabel } from '@/lib/utils';

export default function BillingRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const slug = useSlug();
  const { can } = useAccess();
  const { data: run, isLoading } = useBillingRun(id);
  const { data: lines = [] } = useRunLines(id, run?.status);
  const retry = useRetryRun();
  const [show, setShow] = useState('all');

  const shown = useMemo(() => (show === 'all' ? lines : lines.filter((l) => l.status === show)), [lines, show]);
  if (isLoading || !run) return <div className="mx-auto max-w-4xl space-y-3"><Skeleton className="h-10 w-56" /><Skeleton className="h-40" /></div>;

  const toBill = Math.max(0, (run.unit_count ?? 0) - (run.skipped_count ?? 0));
  const done = (run.issued_count ?? 0) + (run.failed_count ?? 0);
  const pct = toBill > 0 ? Math.round((done / toBill) * 100) : 100;

  return (
    <div className="mx-auto max-w-4xl">
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
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Units</h2>
        <NativeSelect className="w-40" value={show} onChange={(e) => setShow(e.target.value)} aria-label="Show">
          <option value="all">All units</option>
          <option value="issued">Issued</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
          <option value="skipped">Skipped</option>
        </NativeSelect>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing to show.</li>}
        {shown.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium">{l.unit_code} {l.invoice_number && <span className="font-mono text-xs text-muted-foreground">{l.invoice_number}</span>}</p>
              {(l.last_error || l.skip_reason) && <p className="truncate text-xs text-muted-foreground">{l.last_error || l.skip_reason}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm tabular">{kes(l.total)}</span>
              <StatusBadge status={l.status} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
