'use client';

import { useEffect, useMemo, useState } from 'react';
import { Car, Loader2, LogOut, RefreshCw, Search, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormSheet } from '@/components/common/form-sheet';
import { IconButton } from '@/components/common/icon-button';
import type { LocalInside, RecordGateEvent } from '@/hooks/use-gate';
import { isNetworkError } from '@/lib/api/errors';
import { gateDeviceApi, type InsidePerson } from '@/lib/gate/api';
import type { GateDeviceCreds } from '@/lib/gate/device';
import { fmtDateTime } from '@/lib/utils';

/** Loads who is inside now (server list plus entries still queued on this tablet). */
export function useInside(device: GateDeviceCreds, localInside: LocalInside[], active: boolean) {
  const [rows, setRows] = useState<InsidePerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [gone, setGone] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const r = await gateDeviceApi(device).inside();
      setRows(r.data ?? []);
      setGone(new Set());
      setOffline(false);
    } catch (e) {
      if (isNetworkError(e)) setOffline(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active) void load();
  }, [active, device]);

  const list: LocalInside[] = useMemo(
    () => [...localInside, ...rows].filter((p) => !gone.has(p.event_id)),
    [localInside, rows, gone],
  );
  const markGone = (id: string) => setGone((s) => new Set(s).add(id));
  return { list, loading, offline, reload: load, markGone };
}

/**
 * Exit: the guard picks who is leaving from the people inside, so the exit closes that entry and
 * names the visitor. One exit per entry: the row leaves the list on the first tap and the server
 * refuses a second exit for the same entry.
 */
export function ExitSheet({ open, onOpenChange, device, record, localInside }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  device: GateDeviceCreds;
  record: RecordGateEvent;
  localInside: LocalInside[];
}) {
  const inside = useInside(device, localInside, open);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [fallback, setFallback] = useState({ name: '', plate: '' });

  useEffect(() => { if (open) { setQ(''); setFallback({ name: '', plate: '' }); } }, [open]);

  const term = q.trim().toLowerCase();
  const shown = term
    ? inside.list.filter((p) => [p.visitor_name, p.vehicle_plate, p.unit_code].some((v) => v?.toLowerCase().includes(term)))
    : inside.list;

  const leave = async (p: LocalInside) => {
    if (busy) return;
    setBusy(p.event_id);
    inside.markGone(p.event_id);
    try {
      await record(p.local
        ? { kind: 'exit', entry_client_event_id: p.event_id, visitor_name: p.visitor_name, vehicle_plate: p.vehicle_plate }
        : { kind: 'exit', entry_event_id: p.event_id, visitor_name: p.visitor_name, vehicle_plate: p.vehicle_plate });
      toast.success(`${p.visitor_name} left${p.unit_code ? ` (${p.unit_code})` : ''}`);
    } finally {
      setBusy(null);
    }
  };

  // Offline with nothing listed: the server matches the exit to an entry by plate, or by name.
  const leaveByDetails = async () => {
    const name = fallback.name.trim();
    const plate = fallback.plate.trim().toUpperCase();
    if (!name && !plate) return;
    await record({ kind: 'exit', visitor_name: name || undefined, vehicle_plate: plate || undefined });
    toast.success('Exit saved. It is matched to the entry when the tablet is back online.');
    onOpenChange(false);
  };

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} size="md" title="Who is leaving?"
      description="Tap the person or car going out. Everyone let in during the last day without an exit is listed.">
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, plate or unit" className="h-12 pl-9" aria-label="Search people inside" autoComplete="off" />
          </div>
          <IconButton label="Refresh the list" variant="outline" className="h-12 w-12" onClick={() => void inside.reload()} disabled={inside.loading}>
            {inside.loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          </IconButton>
        </div>

        {inside.loading && !inside.list.length ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>
        ) : shown.length ? (
          <ul className="space-y-2">
            {shown.map((p) => (
              <li key={p.event_id}>
                <button type="button" disabled={!!busy} onClick={() => void leave(p)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 text-left transition active:scale-[0.99] hover:border-primary disabled:opacity-60">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {p.vehicle_plate ? <Car className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.visitor_name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[p.vehicle_plate, p.unit_code && `${p.unit_code}${p.block ? `, ${p.block}` : ''}`, `in since ${fmtDateTime(p.since)}`, p.walk_in ? 'walk-in' : 'pass', p.local && 'not sent yet']
                        .filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  {busy === p.event_id ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5 text-muted-foreground" />}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {inside.offline ? 'Offline, so the list of people inside cannot load.' : term ? 'Nobody inside matches that.' : 'Nobody is recorded inside.'}
          </p>
        )}

        {inside.offline && (
          <div className="space-y-3 rounded-xl border p-4">
            <p className="text-sm font-medium">Record the exit by plate or name</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={fallback.plate} onChange={(e) => setFallback({ ...fallback, plate: e.target.value })} placeholder="Car plate" className="h-12 uppercase" aria-label="Car plate" />
              <Input value={fallback.name} onChange={(e) => setFallback({ ...fallback, name: e.target.value })} placeholder="Visitor name" className="h-12" aria-label="Visitor name" />
            </div>
            <Button className="h-12 w-full" disabled={!fallback.name.trim() && !fallback.plate.trim()} onClick={() => void leaveByDetails()}><LogOut /> Record exit</Button>
          </div>
        )}
      </div>
    </FormSheet>
  );
}
