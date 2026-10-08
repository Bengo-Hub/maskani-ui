'use client';

import { memo, useMemo } from 'react';
import { kes, num } from '@/lib/utils';
import type { Dashboard } from '@/lib/api/types';

/**
 * Arrears by age as labelled horizontal bars. Four buckets read better as a ranked list with the
 * exact figure beside each bar than as a chart with an axis; one series, so no legend.
 */
export const ArrearsAgeing = memo(function ArrearsAgeing({ buckets }: { buckets: NonNullable<Dashboard['arrears_ageing']> }) {
  const rows = useMemo(() => buckets.map((b) => ({ ...b, value: num(b.amount) })), [buckets]);
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.bucket} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{r.bucket} days</span>
            <span className="font-medium tabular">
              {kes(r.value)} <span className="text-xs font-normal text-muted-foreground">({r.accounts} {r.accounts === 1 ? 'account' : 'accounts'})</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-chart-1" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
});
