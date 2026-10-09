import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { num } from '@/lib/utils';

/** How a change is worded: money and counts as a percentage change, rates as percentage points. */
export type DeltaKind = 'percent' | 'points';

function delta(value: number, before: number | undefined, kind: DeltaKind): { text: string; dir: -1 | 0 | 1 } | null {
  if (before == null || Number.isNaN(before)) return null;
  if (kind === 'points') {
    const d = Math.round((value - before) * 10) / 10;
    if (d === 0) return { text: 'level', dir: 0 };
    return { text: `${d > 0 ? 'up' : 'down'} ${Math.abs(d)} pts`, dir: d > 0 ? 1 : -1 };
  }
  if (before === 0) return value === 0 ? { text: 'level', dir: 0 } : null;
  const pct = Math.round(((value - before) / Math.abs(before)) * 100);
  if (pct === 0) return { text: 'level', dir: 0 };
  return { text: `${pct > 0 ? 'up' : 'down'} ${Math.abs(pct)}%`, dir: pct > 0 ? 1 : -1 };
}

function Compare({ label, value, before, kind }: { label: string; value: number; before?: string | number; kind: DeltaKind }) {
  const d = delta(value, before == null ? undefined : num(before), kind);
  if (!d) return <span className="text-muted-foreground">{label}: no figure</span>;
  const Icon = d.dir > 0 ? ArrowUpRight : d.dir < 0 ? ArrowDownRight : ArrowRight;
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-foreground" aria-hidden />
      <span><span className="font-medium text-foreground">{d.text}</span> on {label}</span>
    </span>
  );
}

/**
 * A headline figure with the two comparisons managers ask for first: last month and the same month
 * last year. Direction is said in words with an arrow, never by colour alone.
 */
export function KpiCard({
  icon: Icon, label, value, display, lastMonth, lastYear, kind = 'percent', compare = true, footnote, loading,
}: {
  /** False for positions with no history yet (days sales outstanding, occupancy). */
  compare?: boolean;
  icon: LucideIcon;
  label: string;
  value: number;
  display: ReactNode;
  lastMonth?: string | number;
  lastYear?: string | number;
  kind?: DeltaKind;
  footnote?: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" aria-hidden /> {label}
      </span>
      {loading ? <Skeleton className="h-8 w-28" /> : <p className="text-2xl font-semibold tabular tracking-tight">{display}</p>}
      {!loading && compare && (
        <div className="flex flex-col gap-0.5 text-xs">
          <Compare label="last month" value={value} before={lastMonth} kind={kind} />
          <Compare label="last year" value={value} before={lastYear} kind={kind} />
        </div>
      )}
      {footnote && !loading && <p className="mt-auto text-xs text-muted-foreground">{footnote}</p>}
    </div>
  );
}
