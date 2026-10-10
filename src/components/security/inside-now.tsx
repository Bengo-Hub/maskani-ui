'use client';

import { Car, DoorOpen, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToneBadge } from '@/components/common/status-badge';
import { useGateInside } from '@/hooks/use-security';
import { fmtDateTime } from '@/lib/utils';

/** "35 min" or "3 h 10 min" since the entry. */
function sinceLabel(iso: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return min % 60 ? `${h} h ${min % 60} min` : `${h} h`;
}

/**
 * Who is inside the estate now, from `GET /gate/inside`: people let in with no exit recorded in
 * the last 24 hours. Refreshes every minute and on every gate event.
 */
export function InsideNow({ propertyId }: { propertyId: string }) {
  const { data = [], isLoading, isError } = useGateInside(propertyId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Inside now</CardTitle>
          <CardDescription>Visitors let in with no exit recorded in the last 24 hours</CardDescription>
        </div>
        {!isLoading && <span className="font-display text-2xl font-semibold tabular">{data.length}</span>}
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-20" /> : isError ? (
          <p className="text-sm text-destructive">Could not load who is inside.</p>
        ) : data.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><DoorOpen className="h-4 w-4" /> Nobody is recorded inside.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {data.map((p) => (
              <li key={p.event_id} className="rounded-xl border px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-medium">{p.visitor_name || 'Unnamed visitor'}</p>
                  <span className="shrink-0 text-xs text-muted-foreground tabular" title={fmtDateTime(p.since)}>{sinceLabel(p.since)}</span>
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>{[p.unit_code, p.block].filter(Boolean).join(', ') || 'Estate visitor'}</span>
                  {p.vehicle_plate && <span className="inline-flex items-center gap-1 font-mono"><Car className="h-3 w-3" />{p.vehicle_plate}</span>}
                  <ToneBadge tone={p.walk_in ? 'warning' : 'primary'}>{p.walk_in ? 'Walk-in' : 'Pass'}</ToneBadge>
                  {(p.guard_name || p.gate_name) && <span>let in{p.guard_name ? ` by ${p.guard_name}` : ''}{p.gate_name ? ` at ${p.gate_name}` : ''}</span>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
