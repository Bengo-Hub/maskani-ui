'use client';

import { useMemo, useState } from 'react';
import { Camera, Check, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { PeriodPicker } from '@/components/common/period-picker';
import { PropertyRequired, usePropertyOrSingle } from '@/components/common/property-required';
import { StatusBadge, ToneBadge } from '@/components/common/status-badge';
import { ReadingCapture } from '@/components/utilities/reading-capture';
import { useAccess } from '@/hooks/use-access';
import { useReadingRound, useVerifyReading } from '@/hooks/use-utilities';
import type { RoundRow } from '@/lib/api/types';
import { currentPeriod, num } from '@/lib/utils';

const FLAG: Record<string, string> = { lower_than_previous: 'Lower than last', zero_occupied: 'Zero, but occupied', spike: 'Big jump' };

export default function ReadingRoundPage() {
  const propertyId = usePropertyOrSingle();
  const { can } = useAccess();
  const [period, setPeriod] = useState(currentPeriod);
  const { data: round, isLoading } = useReadingRound(propertyId, period);
  const verify = useVerifyReading(propertyId, period);
  const [capture, setCapture] = useState<RoundRow | null>(null);
  const [showDone, setShowDone] = useState(false);

  // Walking order is the API's row order; group by block for the caretaker's route.
  const groups = useMemo(() => {
    const map = new Map<string, RoundRow[]>();
    for (const r of round?.rows ?? []) {
      if (!showDone && r.current) continue;
      const key = r.block || 'Other meters';
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()];
  }, [round, showDone]);

  if (!propertyId) return <div className="mx-auto max-w-4xl"><PageHeader title="Meter readings" /><PropertyRequired what="Meter readings" /></div>;
  const read = round?.read ?? 0;
  const total = round?.total ?? 0;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Meter readings" subtitle="Walk the round on your phone; add a meter photo where you can" actions={<PeriodPicker value={period} onChange={setPeriod} />} />
      {isLoading ? <Skeleton className="h-64" /> : !round || total === 0 ? (
        <EmptyState icon={Droplets} title="No meters" description="Add water meters to units before the first reading round." />
      ) : (
        <>
          <div className="mb-4 space-y-2 rounded-xl border bg-card p-4">
            <div className="flex items-baseline justify-between"><span className="text-sm text-muted-foreground">Progress</span><span className="font-display text-lg font-semibold tabular">{read} of {total} read</span></div>
            <Progress value={total ? (read / total) * 100 : 0} />
            <label className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
              <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="h-4 w-4" /> Show meters already read
            </label>
          </div>
          {groups.length === 0 && <EmptyState icon={Check} title="Round complete" description="Every meter has a reading for this month." />}
          <div className="space-y-5">
            {groups.map(([block, rows]) => (
              <section key={block}>
                <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{block}</h2>
                <ul className="divide-y rounded-xl border bg-card">
                  {rows.map((r) => (
                    <li key={r.meter_id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium">{r.unit_code ?? r.kind.replace(/_/g, ' ')} <span className="font-mono text-xs text-muted-foreground">{r.serial}</span></p>
                        <p className="text-xs text-muted-foreground">
                          Last {r.previous_reading != null ? num(r.previous_reading) : 'none'}
                          {r.current ? ` · now ${num(r.current.reading)} (${num(r.current.consumption)} m3)` : ''}
                        </p>
                        {r.current?.flags?.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">{r.current.flags.map((f) => <ToneBadge key={f} tone="warning">{FLAG[f] ?? f}</ToneBadge>)}</div>
                        ) : null}
                      </div>
                      {r.current ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <StatusBadge status={r.current.status} />
                          {can('utilities.manage') && r.current.status !== 'accepted' && (
                            <Button size="sm" variant="outline" onClick={() => verify.mutate({ readingId: r.current!.id, action: 'accept' })}>Accept</Button>
                          )}
                        </div>
                      ) : (
                        <Button size="lg" className="h-11 shrink-0" onClick={() => setCapture(r)}><Camera /> Read</Button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
      <ReadingCapture row={capture} propertyId={propertyId} period={period} onDone={() => setCapture(null)} />
    </div>
  );
}
