'use client';

import { AlertTriangle } from 'lucide-react';
import type { ReadingFlag, RoundRow } from '@/lib/api/types';
import { num } from '@/lib/utils';

const meter = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 2 });
/** A meter figure as people read it: 2,082 or 12.5. */
export const m3 = (v: string | number | null | undefined) => meter.format(num(v));

/**
 * Why the API flagged a reading, in words, from the round row's own figures: the spike limit is
 * `spike_above`, a multiple of the meter's `average_use`, both worked out on the API.
 */
export function flagReason(flag: ReadingFlag | string, row: RoundRow, used: number, reading: number): string {
  switch (flag) {
    case 'spike': {
      if (row.spike_above == null || row.average_use == null) return 'Much higher than usual for this meter.';
      const times = num(row.average_use) > 0 ? Math.round(num(row.spike_above) / num(row.average_use)) : 0;
      return `${m3(used)} m3 is above ${m3(row.spike_above)} m3, which is ${times ? `${times} times ` : ''}this meter's average use of ${m3(row.average_use)} m3 a month.`;
    }
    case 'lower_than_previous':
      return `The new reading ${m3(reading)} is below the last one, ${m3(row.previous_reading)}. Use counts as 0 until it is checked.`;
    case 'zero_occupied':
      return 'No water used, but the unit is occupied.';
    default:
      return flag.replace(/_/g, ' ');
  }
}

/**
 * The arithmetic behind one reading: last reading, new reading and what was used (new minus last,
 * as the API stores it), then the reason for each flag.
 */
export function ReadingMaths({ row }: { row: RoundRow }) {
  const cur = row.current;
  if (!cur) {
    return (
      <p className="text-xs text-muted-foreground">
        Last reading <span className="tabular text-foreground">{m3(row.previous_reading)}</span>
        {row.average_use != null && <>, usually about <span className="tabular">{m3(row.average_use)}</span> m3 a month</>}
      </p>
    );
  }
  const used = num(cur.consumption);
  const reading = num(cur.reading);
  const last = cur.previous_reading ?? row.previous_reading;
  return (
    <div className="space-y-1">
      <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
        <span className="text-muted-foreground">Last</span><span className="tabular">{m3(last)}</span>
        <span className="text-muted-foreground">, new</span><span className="tabular">{m3(reading)}</span>
        <span className="text-muted-foreground">:</span>
        <strong className="tabular">{m3(used)} m3 used</strong>
        {cur.is_estimated && <span className="text-xs text-muted-foreground">(estimated)</span>}
      </p>
      {cur.flags?.map((f) => (
        <p key={f} className="flex items-start gap-1.5 text-xs text-warning">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" /> {flagReason(f, row, used, reading)}
        </p>
      ))}
      {!cur.flags?.length && row.average_use != null && (
        <p className="text-xs text-muted-foreground">Usual use about {m3(row.average_use)} m3 a month</p>
      )}
    </div>
  );
}
