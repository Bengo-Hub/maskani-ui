'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { AlertTriangle, Droplets, Gauge, TrendingDown } from 'lucide-react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { PropertyRequired, usePropertyOrSingle } from '@/components/common/property-required';
import { StatTile } from '@/components/common/stat-tile';
import { ToneBadge } from '@/components/common/status-badge';
import { WaterBalanceChart } from '@/components/utilities/water-balance-chart';
import { useSlug } from '@/hooks/use-access';
import { useWaterBalance } from '@/hooks/use-utilities';
import type { WaterBalanceRow } from '@/lib/api/types';
import { num, periodLabel } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

/** Supplied (bulk meters) against billed (unit meters) and common use; the gap is unaccounted water. */
export default function WaterBalancePage() {
  const slug = useSlug();
  const propertyId = usePropertyOrSingle();
  const { data = [], isLoading } = useWaterBalance(propertyId);
  // The alert threshold is the estate's own setting (Settings, General, Meter readings), which
  // /auth/me already carries, so people without settings access still see it.
  const limit = useAuthStore((s) => Number(s.me?.settings?.water_loss_alert_pct ?? 15));

  const summary = useMemo(() => {
    const withLoss = data.filter((r) => r.loss_pct != null);
    // Weighted by volume: a month with ten times the water counts ten times, unlike a plain mean
    // of monthly percentages.
    const supplied = withLoss.reduce((s, r) => s + num(r.supplied_m3), 0);
    const lost = withLoss.reduce((s, r) => s + num(r.unaccounted_m3), 0);
    const avg = supplied > 0 ? (lost / supplied) * 100 : null;
    const over = withLoss.filter((r) => num(r.loss_pct) > limit).length;
    const unaccounted = data.reduce((s, r) => s + num(r.unaccounted_m3), 0);
    return { latest: data[0], avg, over, unaccounted };
  }, [data, limit]);

  const columns = useMemo<DataTableColumn<WaterBalanceRow>[]>(() => [
    {
      key: 'month', header: 'Month', primary: true, accessor: (r) => r.period,
      render: (r) => <div><p className="font-medium">{periodLabel(r.period)}</p>{(r.estimated_readings ?? 0) > 0 && <p className="text-xs text-muted-foreground">{r.estimated_readings} estimated readings</p>}</div>,
    },
    { key: 'supplied', header: 'Supplied m3', align: 'right', accessor: (r) => num(r.supplied_m3), render: (r) => <span className="tabular">{num(r.supplied_m3).toFixed(1)}</span> },
    { key: 'billed', header: 'Billed m3', align: 'right', accessor: (r) => num(r.billed_m3), render: (r) => <span className="tabular">{num(r.billed_m3).toFixed(1)}</span> },
    { key: 'common', header: 'Common m3', align: 'right', hideBelow: 'md', accessor: (r) => num(r.common_m3), render: (r) => <span className="tabular">{num(r.common_m3).toFixed(1)}</span> },
    { key: 'gap', header: 'Unaccounted m3', align: 'right', hideBelow: 'md', accessor: (r) => num(r.unaccounted_m3), render: (r) => <span className="tabular">{num(r.unaccounted_m3).toFixed(1)}</span> },
    {
      key: 'loss', header: 'Loss', align: 'right', mobileAction: true, accessor: (r) => (r.loss_pct == null ? -1 : num(r.loss_pct)),
      render: (r) => r.loss_pct == null ? <span className="text-muted-foreground">n/a</span>
        : <ToneBadge tone={num(r.loss_pct) > limit ? 'danger' : 'success'}>{num(r.loss_pct).toFixed(1)}%</ToneBadge>,
    },
  ], [limit]);

  if (!propertyId) return <div className="mx-auto max-w-6xl"><PageHeader title="Water balance" /><PropertyRequired what="Water balances" /></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title="Water balance"
        subtitle={<>Water supplied against water billed, month by month. Losses above {limit}% are flagged (<Link href={`/${slug}/settings?tab=general`} className="text-primary underline">change</Link>).</>}
      />
      {isLoading ? <Skeleton className="h-64" /> : data.length === 0 ? (
        <EmptyState icon={Droplets} title="No balance yet" description="Needs bulk or borehole meter readings and unit readings for the same month." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={Gauge} label={`Loss, ${periodLabel(summary.latest.period)}`} value={summary.latest.loss_pct == null ? 'n/a' : `${num(summary.latest.loss_pct).toFixed(1)}%`}
              tone={summary.latest.loss_pct != null && num(summary.latest.loss_pct) > limit ? 'danger' : 'default'} />
            <StatTile icon={TrendingDown} label="Average loss" value={summary.avg == null ? 'n/a' : `${summary.avg.toFixed(1)}%`} detail={`over ${data.length} months`} />
            <StatTile icon={AlertTriangle} label="Months over the limit" value={summary.over} tone={summary.over ? 'warning' : 'default'} />
            <StatTile icon={Droplets} label="Unaccounted water" value={`${summary.unaccounted.toFixed(0)} m3`} detail="all months shown" />
          </div>
          <Card>
            <CardHeader><CardTitle>Supplied and billed</CardTitle></CardHeader>
            <CardContent><WaterBalanceChart rows={data} /></CardContent>
          </Card>
          <DataTable columns={columns} rows={data} rowKey={(r) => r.period} emptyText="No months yet." storageKey="maskani-water" />
        </>
      )}
    </div>
  );
}
