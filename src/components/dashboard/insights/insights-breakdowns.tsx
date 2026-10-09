'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useChargeTypes } from '@/hooks/use-billing';
import type { Insights } from '@/lib/api/insights';
import { useChartPalette } from '@/lib/chart-palette';
import { kes, num, titleCase } from '@/lib/utils';

/** Horizontal bars of one hue (magnitude, not identity), each labelled with its full figure. */
function Bars({ items }: { items: { key: string; label: string; value: number; detail?: string }[] }) {
  const palette = useChartPalette();
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{i.label}</span>
            <span className="shrink-0 font-medium tabular">{kes(i.value)}{i.detail && <span className="ml-1 text-xs font-normal text-muted-foreground">{i.detail}</span>}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full" style={{ width: `${Math.max(2, (i.value / max) * 100)}%`, background: palette.series[0] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Where the money billed comes from, last three complete months. */
export function RevenueMixCard({ data }: { data: Insights }) {
  const { data: charges = [] } = useChargeTypes();
  const names = useMemo(() => new Map(charges.map((c) => [c.code, c.name])), [charges]);
  const total = data.revenue_mix.reduce((s, r) => s + num(r.amount), 0);
  const items = data.revenue_mix.map((r) => ({
    key: r.charge_code, label: names.get(r.charge_code) ?? titleCase(r.charge_code.replace(/_/g, ' ')), value: num(r.amount),
    detail: total > 0 ? `${Math.round((num(r.amount) / total) * 100)}%` : undefined,
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by charge</CardTitle>
        <CardDescription>Billed over the last three complete months, {kes(total)} in all</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length ? <Bars items={items} /> : <p className="py-8 text-center text-sm text-muted-foreground">No bills in the last three months.</p>}
      </CardContent>
    </Card>
  );
}

/** Blocks side by side: billing last month and what each owes now. */
export function BlocksCard({ data, base }: { data: Insights; base: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Blocks compared</CardTitle>
        <CardDescription>Billed last month and owing now, per block</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.blocks.length ? (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium sm:px-6">Block</th><th className="px-2 py-2 text-right font-medium">Units</th>
              <th className="px-2 py-2 text-right font-medium">Billed</th><th className="px-4 py-2 text-right font-medium sm:px-6">Owing</th>
            </tr></thead>
            <tbody>
              {data.blocks.map((b) => (
                <tr key={b.block_id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 sm:px-6"><Link className="hover:text-primary hover:underline" href={`${base}/units?block_id=${b.block_id}`}>{b.name}</Link></td>
                  <td className="px-2 py-2.5 text-right tabular">{b.units}</td>
                  <td className="px-2 py-2.5 text-right tabular">{kes(b.billed_last_month)}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular sm:px-6">{kes(b.owing)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="px-6 py-8 text-center text-sm text-muted-foreground">No blocks set up.</p>}
      </CardContent>
    </Card>
  );
}

/** Maintenance performance by category over 90 days. */
export function WorkCard({ data, base }: { data: Insights; base: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance, 90 days</CardTitle>
        <CardDescription>Requests by category, how fast they close and how many broke their time limit</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.work_by_category.length ? (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium sm:px-6">Category</th><th className="px-2 py-2 text-right font-medium">Opened</th>
              <th className="px-2 py-2 text-right font-medium">Done</th><th className="hidden px-2 py-2 text-right font-medium sm:table-cell">Late</th>
              <th className="px-4 py-2 text-right font-medium sm:px-6">Avg time</th>
            </tr></thead>
            <tbody>
              {data.work_by_category.map((w) => (
                <tr key={w.category} className="border-b last:border-0">
                  <td className="px-4 py-2.5 sm:px-6"><Link className="hover:text-primary hover:underline" href={`${base}/works`}>{titleCase(w.category.replace(/_/g, ' '))}</Link></td>
                  <td className="px-2 py-2.5 text-right tabular">{w.opened}</td>
                  <td className="px-2 py-2.5 text-right tabular">{w.completed}</td>
                  <td className="hidden px-2 py-2.5 text-right tabular sm:table-cell">{w.breached}</td>
                  <td className="px-4 py-2.5 text-right tabular sm:px-6">{w.avg_resolve_hours != null ? hours(num(w.avg_resolve_hours)) : 'n/a'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="px-6 py-8 text-center text-sm text-muted-foreground">No requests in the last 90 days.</p>}
      </CardContent>
    </Card>
  );
}

/** Hours as "35 min", "6 h" or "2.5 days". */
export function hours(h: number): string {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${(h / 24).toFixed(1)} days`;
}

/** Sales pace: signed in six months, monthly rate, stock left and how long it lasts at this pace. */
export function SalesCard({ data, base }: { data: Insights; base: string }) {
  const s = data.sales;
  const collectedPct = num(s.contract_value) > 0 ? Math.round((num(s.contract_collected) / num(s.contract_value)) * 100) : null;
  const row = (label: string, value: string) => (
    <div className="flex items-baseline justify-between gap-3 border-b py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span><span className="font-medium tabular">{value}</span>
    </div>
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales pace</CardTitle>
        <CardDescription><Link href={`${base}/sales`} className="text-primary hover:underline">Open the availability board</Link></CardDescription>
      </CardHeader>
      <CardContent>
        {row('Signed in the last 6 months', String(s.signed_last_6m))}
        {row('Average per month', num(s.monthly_rate).toFixed(1))}
        {row('Units still for sale', String(s.available))}
        {row('Months to sell out at this pace', s.months_to_sell_out != null ? num(s.months_to_sell_out).toFixed(1) : 'No recent sales')}
        {row('Contract value', kes(s.contract_value))}
        {row('Collected on contracts', `${kes(s.contract_collected)}${collectedPct != null ? ` (${collectedPct}%)` : ''}`)}
      </CardContent>
    </Card>
  );
}
