'use client';

import { memo, useMemo } from 'react';
import { TwoSeriesBars, type TwoSeriesRow } from './two-series-bars';
import { fmtDate, num } from '@/lib/utils';
import type { Dashboard } from '@/lib/api/types';

const NAMES: [string, string] = ['Billed', 'Collected'];

/** Billed against collected per week of the month. */
export const CollectionsChart = memo(function CollectionsChart({ weeks }: { weeks: NonNullable<Dashboard['collections_by_week']> }) {
  const rows = useMemo<TwoSeriesRow[]>(
    () => weeks.map((w) => ({ label: fmtDate(w.week_start).replace(/ \d{4}$/, ''), a: num(w.billed), b: num(w.collected) })),
    [weeks],
  );
  return <TwoSeriesBars rows={rows} names={NAMES} tooltipPrefix="Week of " />;
});
