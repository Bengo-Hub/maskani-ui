'use client';

import { Building2, Clock, Gauge, Landmark, Receipt, Timer } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButtons } from '@/components/common/export-buttons';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useInsights } from '@/hooks/use-reports';
import { insightsApi } from '@/lib/api/insights';
import { kes, num, periodLabel } from '@/lib/utils';
import { BlocksCard, hours, RevenueMixCard, SalesCard, WorkCard } from './insights-breakdowns';
import { ForecastCard, TrendCard } from './insights-charts';
import { KpiCard } from './kpi-card';

/**
 * The business view under the day-to-day tiles: how the estate is doing against last month and last
 * year, where it is heading, and where the money and the work come from. One API call
 * (/reports/insights), computed on the server from aggregates, so it stays fast as data grows.
 */
export function PerformanceSection({ propertyId, period, base }: { propertyId: string; period: string; base: string }) {
  const { mod } = useAccess();
  const slug = useSlug();
  const { data, isLoading, isError } = useInsights(propertyId, period);
  if (isError) return null;
  const k = data?.kpis;
  const month = periodLabel(period);

  return (
    <section className="mt-8 space-y-4" aria-labelledby="performance-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="performance-heading" className="text-lg font-semibold">Performance and outlook</h2>
          <p className="text-sm text-muted-foreground">{month} against last month and the same month last year, and what is coming in.</p>
        </div>
        <ExportButtons name={`performance-${period}`} title={`Performance, ${month}`} pdfLabel="Report PDF"
          fetchFile={(format) => insightsApi.file(slug, { property_id: propertyId || undefined, period }, format)} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {mod('billing') && (
          <>
            <KpiCard icon={Gauge} label="Collection rate" kind="points" loading={isLoading}
              value={num(k?.collection_rate.value)} display={k?.collection_rate.value != null ? `${num(k.collection_rate.value).toFixed(1)}%` : 'No bills yet'}
              lastMonth={k?.collection_rate.last_month} lastYear={k?.collection_rate.last_year} />
            <KpiCard icon={Landmark} label="Collected" loading={isLoading} value={num(k?.collected.value)} display={kes(k?.collected.value)}
              lastMonth={k?.collected.last_month} lastYear={k?.collected.last_year} />
            <KpiCard icon={Receipt} label="Billed" loading={isLoading} value={num(k?.billed.value)} display={kes(k?.billed.value)}
              lastMonth={k?.billed.last_month} lastYear={k?.billed.last_year} />
            <KpiCard icon={Clock} label="Days to collect" compare={false} loading={isLoading} value={num(k?.days_sales_outstanding)}
              display={k?.days_sales_outstanding != null ? `${num(k.days_sales_outstanding)} days` : 'n/a'}
              footnote={<>What is owed now ({kes(k?.outstanding)}) over the last three months' average daily billing. Lower is better.</>} />
          </>
        )}
        <KpiCard icon={Building2} label="Occupancy" compare={false} loading={isLoading} value={num(k?.occupancy_pct)}
          display={k?.occupancy_pct != null ? `${num(k.occupancy_pct).toFixed(1)}%` : 'n/a'}
          footnote={`${k?.occupied ?? 0} of ${k?.units ?? 0} units lived in or let`} />
        {mod('maintenance') && (
          <KpiCard icon={Timer} label="Time to close a request" compare={false} loading={isLoading} value={num(k?.avg_resolve_hours_90d)}
            display={k?.avg_resolve_hours_90d != null ? hours(num(k.avg_resolve_hours_90d)) : 'n/a'}
            footnote={`Average over 90 days. ${k?.open_work_orders ?? 0} open now.`} />
        )}
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
      ) : (
        <>
          {mod('billing') && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TrendCard data={data} />
              <ForecastCard data={data} />
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {mod('billing') && <RevenueMixCard data={data} />}
            {mod('billing') && <BlocksCard data={data} base={base} />}
            {mod('maintenance') && <WorkCard data={data} base={base} />}
            {mod('sales') && <SalesCard data={data} base={base} />}
          </div>
        </>
      )}
    </section>
  );
}
