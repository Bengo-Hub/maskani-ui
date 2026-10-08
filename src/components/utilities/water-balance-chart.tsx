'use client';

import { memo, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartPalette } from '@/lib/chart-palette';
import type { WaterBalanceRow } from '@/lib/api/types';
import { num, periodLabel } from '@/lib/utils';

// Hoisted so recharts never sees new object identities between renders (React #185 lesson).
const MARGIN = { top: 8, right: 8, bottom: 0, left: 0 };
const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
const CURSOR = { fillOpacity: 0.06 };
const LEGEND_STYLE = { fontSize: 12 };

interface Row { month: string; supplied: number; billed: number }

function TooltipBody({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const supplied = payload.find((p) => p.name === 'Supplied')?.value ?? 0;
  const billed = payload.find((p) => p.name === 'Billed')?.value ?? 0;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-medium tabular">{p.value.toFixed(1)} m3</span>
        </p>
      ))}
      {supplied > 0 && <p className="mt-1 border-t pt-1 text-muted-foreground">Gap {(supplied - billed).toFixed(1)} m3</p>}
    </div>
  );
}

const TOOLTIP = <TooltipBody />;

/** Water supplied (bulk meters) against water billed (unit meters), oldest month first. One axis, m3. */
export const WaterBalanceChart = memo(function WaterBalanceChart({ rows }: { rows: WaterBalanceRow[] }) {
  const palette = useChartPalette();
  const data = useMemo<Row[]>(
    () => [...rows].reverse().map((r) => ({ month: periodLabel(r.period), supplied: num(r.supplied_m3), billed: num(r.billed_m3) })),
    [rows],
  );
  const tick = useMemo(() => ({ fontSize: 11, fill: palette.axis }), [palette.axis]);
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={MARGIN} barGap={2} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={palette.grid} />
          <XAxis dataKey="month" tick={tick} axisLine={false} tickLine={false} />
          <YAxis tick={tick} axisLine={false} tickLine={false} width={44} />
          <Tooltip content={TOOLTIP} cursor={CURSOR} />
          <Legend wrapperStyle={LEGEND_STYLE} iconType="square" iconSize={10} />
          <Bar name="Supplied" dataKey="supplied" fill={palette.series[0]} radius={BAR_RADIUS} maxBarSize={28} />
          <Bar name="Billed" dataKey="billed" fill={palette.series[1]} radius={BAR_RADIUS} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
