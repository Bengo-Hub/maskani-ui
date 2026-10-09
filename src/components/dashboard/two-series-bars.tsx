'use client';

import { memo, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axisKes, useChartPalette } from '@/lib/chart-palette';
import { kes } from '@/lib/utils';

// Hoisted so recharts never sees new object identities between renders (React #185 lesson).
const MARGIN = { top: 8, right: 8, bottom: 0, left: 0 };
const TOP_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
const NO_RADIUS: [number, number, number, number] = [0, 0, 0, 0];
const CURSOR = { fillOpacity: 0.06 };
const LEGEND_STYLE = { fontSize: 12 };

export interface TwoSeriesRow { label: string; a: number; b: number }

function TooltipBody({ active, payload, label, prefix, total }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; prefix?: string; total?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const sum = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{prefix}{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto pl-3 font-medium tabular">{kes(p.value)}</span>
        </p>
      ))}
      {total && <p className="mt-1 flex border-t pt-1"><span className="text-muted-foreground">Total</span><span className="ml-auto font-semibold tabular">{kes(sum)}</span></p>}
    </div>
  );
}

/**
 * Two KES series on one axis (never two scales): side by side to compare (billed and collected),
 * or stacked to show parts of a whole (forecast instalments and recurring). Palette order is fixed:
 * series a is plum, series b gold. A 2px surface gap separates stacked segments.
 */
export const TwoSeriesBars = memo(function TwoSeriesBars({
  rows, names, stacked = false, tooltipPrefix = '', height = 256,
}: {
  rows: TwoSeriesRow[];
  names: [string, string];
  stacked?: boolean;
  tooltipPrefix?: string;
  height?: number;
}) {
  const palette = useChartPalette();
  const tick = useMemo(() => ({ fontSize: 11, fill: palette.axis }), [palette.axis]);
  const tooltip = useMemo(() => <TooltipBody prefix={tooltipPrefix} total={stacked} />, [tooltipPrefix, stacked]);
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={MARGIN} barGap={2} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={palette.grid} />
          <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={axisKes} width={44} />
          <Tooltip content={tooltip} cursor={CURSOR} />
          <Legend wrapperStyle={LEGEND_STYLE} iconType="square" iconSize={10} />
          <Bar name={names[0]} dataKey="a" fill={palette.series[0]} radius={stacked ? NO_RADIUS : TOP_RADIUS} maxBarSize={28}
            stackId={stacked ? 's' : undefined} stroke={stacked ? palette.surface : undefined} strokeWidth={stacked ? 2 : 0} />
          <Bar name={names[1]} dataKey="b" fill={palette.series[1]} radius={TOP_RADIUS} maxBarSize={28}
            stackId={stacked ? 's' : undefined} stroke={stacked ? palette.surface : undefined} strokeWidth={stacked ? 2 : 0} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
