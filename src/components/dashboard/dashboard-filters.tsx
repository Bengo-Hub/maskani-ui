'use client';

import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/common/field';
import { useFunds } from '@/hooks/use-billing';
import { useProperty } from '@/hooks/use-register';
import { useUrlParam } from '@/hooks/use-url-param';
import type { DashboardFilters } from '@/lib/api/types';
import { cn, currentPeriod, periodLabel, shiftPeriod } from '@/lib/utils';

const PRESETS = [
  { key: '1', label: 'This month', months: 1 },
  { key: '3', label: '3 months', months: 3 },
  { key: '6', label: '6 months', months: 6 },
  { key: '12', label: '12 months', months: 12 },
] as const;

/** The last 24 months, newest first, for the from and to pickers. */
function monthOptions(): string[] {
  const now = currentPeriod();
  return Array.from({ length: 24 }, (_, i) => shiftPeriod(now, -i));
}

/**
 * Dashboard filters kept in the URL (so a filtered view can be shared or reloaded): a month range
 * of up to 12 months, a block of the selected property and a fund. The API applies every one of
 * them; see the note the page shows when collections cannot follow a block or fund.
 */
export function useDashboardFilters(): [DashboardFilters, { setRange: (from: string, to: string) => void; setBlock: (b: string) => void; setFund: (f: string) => void; reset: () => void }] {
  const now = currentPeriod();
  const [from, setFrom] = useUrlParam('from', now);
  const [to] = useUrlParam('to', now);
  const [block, setBlockParam] = useUrlParam('block', '');
  const [fund, setFundParam] = useUrlParam('fund', '');
  // A hand-typed or stale range is put back in order and capped at 12 months.
  const end = to > now ? now : to;
  let start = from > end ? end : from;
  if (start < shiftPeriod(end, -11)) start = shiftPeriod(end, -11);
  return [
    { from: start, to: end, block_id: block || undefined, fund: fund || undefined },
    {
      setRange: (f, t) => setFrom(f === now ? '' : f, { to: t === now ? null : t }),
      setBlock: (b) => setBlockParam(b),
      setFund: (f) => setFundParam(f),
      reset: () => setFrom('', { to: null, block: null, fund: null }),
    },
  ];
}

export function rangeLabel(f: DashboardFilters): string {
  return f.from === f.to ? periodLabel(f.to) : `${periodLabel(f.from)} to ${periodLabel(f.to)}`;
}

export function DashboardFilterBar({ propertyId, filters, actions }: {
  propertyId: string;
  filters: DashboardFilters;
  actions: ReturnType<typeof useDashboardFilters>[1];
}) {
  const { data: property } = useProperty(propertyId);
  const { data: funds = [] } = useFunds();
  const blocks = property?.edges?.blocks ?? [];
  const months = monthOptions();
  const now = currentPeriod();
  const span = months.indexOf(filters.from) - months.indexOf(filters.to) + 1;
  const active = PRESETS.find((p) => filters.to === now && p.months === span);
  const filtered = filters.from !== now || filters.to !== now || !!filters.block_id || !!filters.fund;

  return (
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-3">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Quick ranges">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => actions.setRange(shiftPeriod(now, -(p.months - 1)), now)}
            aria-pressed={active?.key === p.key}
            className={cn('h-9 cursor-pointer rounded-lg px-3 text-sm font-medium transition-colors',
              active?.key === p.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
          >
            {p.label}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        From
        <NativeSelect aria-label="From month" value={filters.from} className="h-9 min-w-36"
          onChange={(e) => actions.setRange(e.target.value, e.target.value > filters.to ? e.target.value : filters.to)}>
          {months.map((m) => <option key={m} value={m}>{periodLabel(m)}</option>)}
        </NativeSelect>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        To
        <NativeSelect aria-label="To month" value={filters.to} className="h-9 min-w-36"
          onChange={(e) => {
            const t = e.target.value;
            // Keep the range within 12 months by pulling the start along.
            const f = filters.from > t ? t : filters.from < shiftPeriod(t, -11) ? shiftPeriod(t, -11) : filters.from;
            actions.setRange(f, t);
          }}>
          {months.map((m) => <option key={m} value={m}>{periodLabel(m)}</option>)}
        </NativeSelect>
      </label>
      {propertyId && blocks.length > 0 && (
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Block
          <NativeSelect aria-label="Block" value={filters.block_id ?? ''} className="h-9 min-w-32" onChange={(e) => actions.setBlock(e.target.value)}>
            <option value="">All blocks</option>
            {blocks.map((b) => <option key={b.id} value={b.id}>{b.name || b.code}</option>)}
          </NativeSelect>
        </label>
      )}
      {funds.length > 1 && (
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Fund
          <NativeSelect aria-label="Fund" value={filters.fund ?? ''} className="h-9 min-w-32" onChange={(e) => actions.setFund(e.target.value)}>
            <option value="">All funds</option>
            {funds.map((f) => <option key={f.id} value={f.code}>{f.name}</option>)}
          </NativeSelect>
        </label>
      )}
      {filtered && (
        <Button variant="ghost" size="sm" className="h-9" onClick={actions.reset}><RotateCcw /> Reset</Button>
      )}
    </div>
  );
}
