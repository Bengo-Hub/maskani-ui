'use client';

import { useMemo } from 'react';
import { TwoSeriesBars, type TwoSeriesRow } from '@/components/dashboard/two-series-bars';
import type { Insights } from '@/lib/api/insights';
import { kes, num, periodLabel } from '@/lib/utils';
import { ChartCard, FiguresTable } from './chart-card';

/** "2026-10" as "Oct 26" for axis ticks; tooltips and tables use the full month name. */
const short = (p: string) => {
  const [y, m] = p.split('-').map(Number);
  return `${new Date(y, m - 1, 1).toLocaleString('en-KE', { month: 'short' })} ${String(y).slice(2)}`;
};
const TREND_NAMES: [string, string] = ['Billed', 'Collected'];
const FORECAST_NAMES: [string, string] = ['Instalments due', 'Recurring charges'];

/** Twelve months of billing against collections. */
export function TrendCard({ data }: { data: Insights }) {
  const rows = useMemo<TwoSeriesRow[]>(() => data.months.map((m) => ({ label: short(m.period), a: num(m.billed), b: num(m.collected) })), [data.months]);
  const best = data.months.reduce<(typeof data.months)[number] | null>((b, m) => (m.collection_rate != null && (!b || num(m.collection_rate) > num(b.collection_rate)) ? m : b), null);
  return (
    <ChartCard
      title="Billed and collected, 12 months"
      description={best ? `Best collection month: ${periodLabel(best.period)} at ${num(best.collection_rate).toFixed(1)}%` : 'Collections follow the bills issued each month.'}
      chart={<TwoSeriesBars rows={rows} names={TREND_NAMES} height={280} />}
      table={<FiguresTable head={['Month', 'Billed', 'Collected', 'Rate']} rows={data.months.map((m) => [
        periodLabel(m.period), kes(m.billed), kes(m.collected), m.collection_rate != null ? `${num(m.collection_rate).toFixed(1)}%` : 'n/a',
      ])} />}
    />
  );
}

/** Expected cash in for the next 12 months, with the method shown so the figure can be trusted. */
export function ForecastCard({ data }: { data: Insights }) {
  const rows = useMemo<TwoSeriesRow[]>(() => data.forecast.map((f) => ({ label: short(f.period), a: num(f.instalments), b: num(f.recurring) })), [data.forecast]);
  const total = data.forecast.reduce((s, f) => s + num(f.total), 0);
  const b = data.forecast_basis;
  return (
    <ChartCard
      title="Cash expected, next 12 months"
      description={<>About <span className="font-semibold text-foreground tabular">{kes(total)}</span> over 12 months</>}
      chart={<TwoSeriesBars rows={rows} names={FORECAST_NAMES} stacked height={280} />}
      table={<FiguresTable head={['Month', 'Instalments', 'Recurring', 'Total']} rows={data.forecast.map((f) => [
        periodLabel(f.period), kes(f.instalments), kes(f.recurring), kes(f.total),
      ])} />}
      footer={<>
        {b.method} Average billing {kes(b.avg_monthly_billed_3m)} a month, collection rate {num(b.collection_rate_6m).toFixed(1)}%.
        {num(b.overdue_instalments) > 0 && <> Overdue instalments not counted: {kes(b.overdue_instalments)}.</>}
      </>}
    />
  );
}
