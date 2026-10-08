'use client';

import { Droplets } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { PropertyRequired, usePropertyOrSingle } from '@/components/common/property-required';
import { useWaterBalance } from '@/hooks/use-utilities';
import { num, periodLabel } from '@/lib/utils';

/** Supplied (bulk meters) against billed (unit meters) and common use; the gap is unaccounted water. */
export default function WaterBalancePage() {
  const propertyId = usePropertyOrSingle();
  const { data = [], isLoading } = useWaterBalance(propertyId);
  if (!propertyId) return <div className="mx-auto max-w-4xl"><PageHeader title="Water balance" /><PropertyRequired what="Water balances" /></div>;
  const max = Math.max(1, ...data.map((r) => num(r.supplied_m3)));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Water balance" subtitle="Water supplied against water billed, month by month" />
      {isLoading ? <Skeleton className="h-64" /> : data.length === 0 ? (
        <EmptyState icon={Droplets} title="No balance yet" description="Needs bulk or borehole meter readings and unit readings for the same month." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr><th className="px-4 py-2">Month</th><th className="px-4 py-2 text-right">Supplied m3</th><th className="px-4 py-2 text-right">Billed m3</th><th className="px-4 py-2 text-right">Common m3</th><th className="px-4 py-2 text-right">Unaccounted</th><th className="px-4 py-2 w-40">Loss</th></tr>
                </thead>
                <tbody className="divide-y">
                  {data.map((r) => {
                    const loss = r.loss_pct == null ? null : num(r.loss_pct);
                    return (
                      <tr key={r.period}>
                        <td className="px-4 py-2 font-medium">{periodLabel(r.period)}{(r.estimated_readings ?? 0) > 0 && <span className="block text-xs text-muted-foreground">{r.estimated_readings} estimated</span>}</td>
                        <td className="px-4 py-2 text-right tabular">{num(r.supplied_m3).toFixed(1)}</td>
                        <td className="px-4 py-2 text-right tabular">{num(r.billed_m3).toFixed(1)}</td>
                        <td className="px-4 py-2 text-right tabular">{num(r.common_m3).toFixed(1)}</td>
                        <td className="px-4 py-2 text-right tabular">{num(r.unaccounted_m3).toFixed(1)}</td>
                        <td className="px-4 py-2">
                          {loss == null ? <span className="text-muted-foreground">n/a</span> : (
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                <div className={loss > 15 ? 'h-full rounded-full bg-destructive' : 'h-full rounded-full bg-chart-1'} style={{ width: `${Math.min(100, (num(r.unaccounted_m3) / max) * 100)}%` }} />
                              </div>
                              <span className={loss > 15 ? 'font-semibold text-destructive tabular' : 'tabular'}>{loss.toFixed(1)}%</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
