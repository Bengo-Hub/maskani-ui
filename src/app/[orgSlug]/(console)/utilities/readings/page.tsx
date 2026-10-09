'use client';

import { Suspense, useMemo, useState } from 'react';
import { AlertTriangle, Calculator, Camera, Check, CheckCheck, Droplets, Hourglass } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { NativeSelect } from '@/components/common/field';
import { IconButton } from '@/components/common/icon-button';
import { PageHeader } from '@/components/common/page-header';
import { PeriodPicker } from '@/components/common/period-picker';
import { PropertyRequired, usePropertyOrSingle } from '@/components/common/property-required';
import { SearchInput } from '@/components/common/search-input';
import { StatTile } from '@/components/common/stat-tile';
import { StatusBadge, ToneBadge } from '@/components/common/status-badge';
import { ReadingCapture } from '@/components/utilities/reading-capture';
import { useAccess } from '@/hooks/use-access';
import { useUrlParam } from '@/hooks/use-url-param';
import { useEstimateReading, useReadingRound, useVerifyReading } from '@/hooks/use-utilities';
import type { RoundRow } from '@/lib/api/types';
import { apiErrorMessage } from '@/lib/api/errors';
import { currentPeriod, num } from '@/lib/utils';

const FLAG: Record<string, string> = { lower_than_previous: 'Lower than last', zero_occupied: 'Zero, but occupied', spike: 'Big jump' };
const SHOW = ['todo', 'read', 'flagged', 'waiting', 'all'] as const;
type Show = (typeof SHOW)[number];

export default function ReadingRoundPage() {
  return <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-5xl" />}><ReadingRound /></Suspense>;
}

const flagged = (r: RoundRow) => !!r.current?.flags?.length;
const waiting = (r: RoundRow) => !!r.current && r.current.status !== 'accepted';

/**
 * The monthly round, phone first: meters in walking order grouped by block. Caretakers read; a
 * manager reviews flagged readings, accepts clean ones in one go, or estimates a meter that could
 * not be read.
 */
function ReadingRound() {
  const propertyId = usePropertyOrSingle();
  const { can } = useAccess();
  const manage = can('utilities.manage');
  const [period, setPeriod] = useUrlParam('period', currentPeriod());
  const [show, setShow] = useUrlParam<Show>('show', 'todo', SHOW);
  const [block, setBlock] = useUrlParam('block', '');
  const [q, setQ] = useUrlParam('q', '');
  const { data: round, isLoading } = useReadingRound(propertyId, period);
  const verify = useVerifyReading(propertyId, period);
  const estimate = useEstimateReading(propertyId, period);
  const [capture, setCapture] = useState<RoundRow | null>(null);
  const [accepting, setAccepting] = useState(false);

  const rows = useMemo(() => round?.rows ?? [], [round]);
  const blocks = useMemo(() => [...new Set(rows.map((r) => r.block || 'Other meters'))], [rows]);
  const counts = useMemo(() => ({
    read: rows.filter((r) => r.current).length,
    flagged: rows.filter(flagged).length,
    waiting: rows.filter(waiting).length,
    clean: rows.filter((r) => waiting(r) && !flagged(r) && r.current?.status === 'pending'),
  }), [rows]);

  // Walking order is the API's row order; grouped by block for the caretaker's route.
  const groups = useMemo(() => {
    const t = q.trim().toLowerCase();
    const map = new Map<string, { rows: RoundRow[]; read: number; total: number }>();
    for (const r of rows) {
      const key = r.block || 'Other meters';
      const g = map.get(key) ?? { rows: [], read: 0, total: 0 };
      g.total++;
      if (r.current) g.read++;
      map.set(key, g);
      if (block && key !== block) continue;
      if (t && !`${r.unit_code ?? ''} ${r.serial}`.toLowerCase().includes(t)) continue;
      const keep = show === 'all' || (show === 'todo' && !r.current) || (show === 'read' && !!r.current) || (show === 'flagged' && flagged(r)) || (show === 'waiting' && waiting(r));
      if (keep) g.rows.push(r);
    }
    return [...map.entries()].filter(([, g]) => g.rows.length > 0);
  }, [rows, show, block, q]);

  const acceptClean = async () => {
    setAccepting(true);
    let done = 0;
    try {
      for (const r of counts.clean) {
        await verify.mutateAsync({ readingId: r.current!.id, action: 'accept' });
        done++;
      }
      toast.success(`Accepted ${done} readings`);
    } catch (e) {
      toast.error(`${apiErrorMessage(e, 'Stopped')} (${done} accepted)`);
    } finally {
      setAccepting(false);
    }
  };

  if (!propertyId) return <div className="mx-auto max-w-5xl"><PageHeader title="Meter readings" /><PropertyRequired what="Meter readings" /></div>;
  const total = round?.total ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title="Meter readings"
        subtitle="Walk the round on your phone; a photo of each meter helps but is optional."
        actions={<>
          <PeriodPicker value={period} onChange={setPeriod} />
          {manage && counts.clean.length > 0 && (
            <Button variant="outline" onClick={() => void acceptClean()} disabled={accepting}><CheckCheck /> {accepting ? 'Accepting...' : `Accept ${counts.clean.length} clean`}</Button>
          )}
        </>}
      />
      {isLoading ? <Skeleton className="h-64" /> : !round || total === 0 ? (
        <EmptyState icon={Droplets} title="No meters" description="Add water meters to units before the first reading round." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={Droplets} label="Read" value={`${counts.read} of ${total}`} progress={total ? counts.read / total : 0} />
            <StatTile icon={Camera} label="Still to read" value={total - counts.read} />
            <StatTile icon={AlertTriangle} label="Flagged" value={counts.flagged} tone={counts.flagged ? 'warning' : 'default'} />
            <StatTile icon={Hourglass} label="Waiting to accept" value={counts.waiting} />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <NativeSelect className="sm:w-48" value={show} onChange={(e) => setShow(e.target.value as Show)} aria-label="Show">
              <option value="todo">Still to read</option>
              <option value="read">Read</option>
              <option value="flagged">Flagged</option>
              <option value="waiting">Waiting to accept</option>
              <option value="all">Every meter</option>
            </NativeSelect>
            {blocks.length > 1 && (
              <NativeSelect className="sm:w-44" value={block} onChange={(e) => setBlock(e.target.value)} aria-label="Block">
                <option value="">Every block</option>
                {blocks.map((b) => <option key={b} value={b}>{b}</option>)}
              </NativeSelect>
            )}
            <SearchInput value={q} onSearch={(v) => setQ(v)} placeholder="Unit or meter number" className="sm:max-w-xs" />
          </div>

          {groups.length === 0 && (
            show === 'todo' && !q && !block
              ? <EmptyState icon={Check} title="Round complete" description="Every meter has a reading for this month." />
              : <EmptyState icon={Droplets} title="Nothing to show" description="No meter matches these filters." />
          )}
          <div className="space-y-5">
            {groups.map(([name, g]) => (
              <section key={name}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold">{name}</h2>
                  <div className="flex w-40 items-center gap-2 text-xs text-muted-foreground">
                    <Progress value={(g.read / g.total) * 100} className="flex-1" />
                    <span className="tabular">{g.read}/{g.total}</span>
                  </div>
                </div>
                <ul className="divide-y rounded-2xl border bg-card">
                  {g.rows.map((r) => (
                    <li key={r.meter_id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium">{r.unit_code ?? r.kind.replace(/_/g, ' ')} <span className="font-mono text-xs text-muted-foreground">{r.serial}</span></p>
                        <p className="text-xs text-muted-foreground">
                          Last {r.previous_reading != null ? num(r.previous_reading) : 'none'}
                          {r.current ? `, now ${num(r.current.reading)} (${num(r.current.consumption)} m3)` : ''}
                          {r.current?.estimated ? ', estimated' : ''}
                        </p>
                        {r.current?.flags?.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">{r.current.flags.map((f) => <ToneBadge key={f} tone="warning">{FLAG[f] ?? f}</ToneBadge>)}</div>
                        ) : null}
                      </div>
                      {r.current ? (
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          <StatusBadge status={r.current.status} />
                          {manage && r.current.status !== 'accepted' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => verify.mutate({ readingId: r.current!.id, action: 'accept' })}>Accept</Button>
                              {flagged(r) && <Button size="sm" variant="ghost" onClick={() => verify.mutate({ readingId: r.current!.id, action: 'recheck' })}>Recheck</Button>}
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex shrink-0 items-center gap-2">
                          {manage && <IconButton label="Estimate this reading at the 3-month average" onClick={() => estimate.mutate(r.meter_id)} disabled={estimate.isPending}><Calculator /></IconButton>}
                          <Button size="lg" className="h-11" onClick={() => setCapture(r)}><Camera /> Read</Button>
                        </div>
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
