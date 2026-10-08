'use client';

import { memo, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axisKes, useChartPalette } from '@/lib/chart-palette';
import { fmtDate, kes, num } from '@/lib/utils';
import type { Dashboard } from '@/lib/api/types';

// Hoisted so recharts never sees new object identities between renders (React #185 lesson).
const MARGIN = { top: 8, right: 8, bottom: 0, left: 0 };
const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
const CURSOR = { fillOpacity: 0.06 };
const LEGEND_STYLE = { fontSize: 12 };

interface Row { week: string; billed: number; collected: number }

function TooltipBody({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">Week of {label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-medium tabular">{kes(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

const TOOLTIP = <TooltipBody />;

/** Billed against collected per week. One axis (both KES), legend always shown. */
export const CollectionsChart = memo(function CollectionsChart({ weeks }: { weeks: NonNullable<Dashboard['collections_by_week']> }) {
  const palette = useChartPalette();
  const data = useMemo<Row[]>(
    () => weeks.map((w) => ({ week: fmtDate(w.week_start).replace(/ \d{4}$/, ''), billed: num(w.billed), collected: num(w.collected) })),
    [weeks],
  );
  const tick = useMemo(() => ({ fontSize: 11, fill: palette.axis }), [palette.axis]);
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={MARGIN} barGap={2} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={palette.grid} />
          <XAxis dataKey="week" tick={tick} axisLine={false} tickLine={false} />
          <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={axisKes} width={44} />
          <Tooltip content={TOOLTIP} cursor={CURSOR} />
          <Legend wrapperStyle={LEGEND_STYLE} iconType="square" iconSize={10} />
          <Bar name="Billed" dataKey="billed" fill={palette.series[0]} radius={BAR_RADIUS} maxBarSize={28} />
          <Bar name="Collected" dataKey="collected" fill={palette.series[1]} radius={BAR_RADIUS} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
