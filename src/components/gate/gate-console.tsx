'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Building2, CalendarClock, Car, DoorOpen, History, Home, Loader2, LogOut, QrCode, RefreshCw, ShieldAlert, ShieldCheck,
  ShieldX, Ticket, UserPlus, UserRound, Users, Wifi, WifiOff, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormSheet } from '@/components/common/form-sheet';
import { IconButton } from '@/components/common/icon-button';
import { apiErrorMessage } from '@/lib/api/errors';
import type { PassType } from '@/lib/api/types';
import type { GateDeviceCreds } from '@/lib/gate/device';
import { verifyPass, type GateVerdict } from '@/lib/gate/verify';
import type { useGate } from '@/hooks/use-gate';
import { cn, fmtDateTime } from '@/lib/utils';
import { ExitSheet, useInside } from './exit-sheet';
import { IncidentSheet } from './incident-sheet';
import { Keypad } from './keypad';
import { QrScanner, canScanQr } from './qr-scanner';
import { WalkInSheet } from './walk-in-sheet';

type Gate = ReturnType<typeof useGate>;

const PASS_TYPES: Record<PassType, string> = {
  guest_single: 'Guest, one visit',
  guest_recurring: 'Regular guest',
  domestic_staff: 'Domestic staff',
  delivery: 'Delivery',
  contractor: 'Contractor',
  agency: 'Agency',
};
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

/**
 * The gate screen, built as a tablet and phone app: an app bar with the guard and the connection,
 * the code pad (keyboard and USB keypads work too) with QR scan, a result card that spells out the
 * pass, and a bottom bar for walk-ins, exits and incidents. On a landscape tablet the result and
 * the people inside sit beside the pad.
 */
export function GateConsole({ gate, device }: { gate: Gate; device: GateDeviceCreds }) {
  const [code, setCode] = useState('');
  const [verdict, setVerdict] = useState<GateVerdict | null>(null);
  const [busy, setBusy] = useState(false);
  const [scan, setScan] = useState(false);
  const [walkIn, setWalkIn] = useState(false);
  const [exit, setExit] = useState(false);
  const [incident, setIncident] = useState(false);
  const [rejected, setRejected] = useState(false);
  const { record, passes, online, pending, guard, signOff, walkInPolicy, localInside, sync } = gate;
  const anySheet = walkIn || exit || incident || scan;
  const inside = useInside(device, localInside, !anySheet);

  const check = useCallback(async (input: { code?: string; qr?: string }) => {
    setBusy(true);
    try {
      const v = await verifyPass(device, passes, input);
      setVerdict(v);
      setRejected(!v.valid);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not check the pass.'));
    } finally {
      setBusy(false);
      setCode('');
    }
  }, [device, passes]);

  // A result clears itself after a minute so the next visitor starts on a clean screen.
  useEffect(() => {
    if (!verdict) return;
    const t = setTimeout(() => setVerdict(null), 60_000);
    return () => clearTimeout(t);
  }, [verdict]);

  const admit = async () => {
    if (!verdict?.passId) return;
    await record({ kind: 'entry', pass_id: verdict.passId, visitor_name: verdict.visitorName, host_unit_id: verdict.unitId, offline: verdict.offline });
    toast.success(`${verdict.visitorName ?? 'Visitor'} let in. The host has been told.`);
    setVerdict(null);
    void inside.reload();
  };
  const refuse = async () => {
    if (!verdict) return;
    await record({ kind: 'denied', pass_id: verdict.passId, visitor_name: verdict.visitorName, host_unit_id: verdict.unitId, notes: verdict.reason ?? 'Refused at the gate' });
    toast('Refusal logged');
    setVerdict(null);
  };

  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-112 w-112 rounded-full bg-accent/15 blur-3xl" />
      </div>

      {/* App bar */}
      <header className="glass-strong sticky top-0 z-20 flex items-center gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><ShieldCheck className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold leading-tight sm:text-lg">{device.gateName}</p>
          {guard && <p className="truncate text-xs text-muted-foreground">{guard.name} on duty since {fmtDateTime(guard.since)}</p>}
        </div>
        <span role="status" className={cn('flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
          online ? 'bg-success/15 text-success' : 'bg-warning/20 text-warning-foreground')}>
          {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{online ? 'Online' : 'Offline'}</span>
          {pending > 0 && <span className="tabular">· {pending} to send</span>}
        </span>
        <IconButton label="Sync now" side="bottom" onClick={() => void sync()}><RefreshCw /></IconButton>
        <IconButton label={guard ? `Sign off ${guard.name}` : 'Sign off'} side="bottom" onClick={signOff}>
          {guard ? <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{initials(guard.name)}</span> : <LogOut />}
        </IconButton>
      </header>

      <main className="relative mx-auto grid w-full max-w-7xl flex-1 gap-5 p-4 pb-32 sm:p-6 sm:pb-32 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-8">
        {/* Code pad: on phones the result takes its place until it is dealt with. */}
        <section className={cn('glass flex flex-col items-center gap-5 rounded-3xl p-5 sm:p-7', verdict && 'hidden lg:flex')}>
          <div className="text-center">
            <h1 className="font-display text-xl font-semibold">Check a visitor pass</h1>
            <p className="text-sm text-muted-foreground">Type the 6-digit code or scan the QR.</p>
          </div>
          <Keypad
            value={code}
            busy={busy}
            disabled={busy}
            error={rejected && !code}
            label="Pass code"
            onChange={(v) => { setRejected(false); setCode(v); if (v.length === 6) void check({ code: v }); }}
            onSubmit={() => { if (code.length === 6) void check({ code }); }}
          />
          {canScanQr() && (
            <Button size="lg" variant="outline" className="h-14 w-full max-w-xs rounded-2xl text-base" onClick={() => setScan(true)}>
              <QrCode /> Scan QR
            </Button>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-5">
          {verdict ? <ResultCard verdict={verdict} onAdmit={admit} onRefuse={refuse} onClose={() => setVerdict(null)} onWalkIn={() => { setVerdict(null); setWalkIn(true); }} />
            : (
              <section className="hidden rounded-3xl border border-dashed p-8 text-center text-muted-foreground lg:block">
                <Ticket className="mx-auto mb-3 h-10 w-10 opacity-60" />
                The pass shows here: who it is for, the unit and block, the host and how long it is valid.
                Visitors without a pass go through Walk-in.
              </section>
            )}

          <section className="glass rounded-3xl p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Users className="h-5 w-5 text-primary" /> Inside now
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-sm tabular text-primary">{inside.list.length}</span>
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setExit(true)}>Record an exit</Button>
            </div>
            {inside.loading && !inside.list.length ? (
              <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />)}</div>
            ) : inside.list.length ? (
              <ul className="divide-y">
                {inside.list.slice(0, 6).map((p) => (
                  <li key={p.event_id} className="flex items-center gap-3 py-2.5">
                    {p.vehicle_plate ? <Car className="h-4 w-4 shrink-0 text-muted-foreground" /> : <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className="min-w-0 flex-1 truncate text-sm"><span className="font-medium">{p.visitor_name}</span>
                      <span className="text-muted-foreground">{p.unit_code ? ` · ${p.unit_code}` : ''}{p.vehicle_plate ? ` · ${p.vehicle_plate}` : ''}</span></span>
                    <span className="shrink-0 text-xs text-muted-foreground">{fmtDateTime(p.since)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{inside.offline ? 'Offline: the list loads when the tablet reconnects.' : 'Nobody is recorded inside.'}</p>
            )}
          </section>
        </div>
      </main>

      {/* Bottom action bar */}
      <nav aria-label="Gate actions" className="glass-strong fixed inset-x-0 bottom-0 z-20 pb-safe">
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-2 p-3">
          <ActionButton icon={UserPlus} label="Walk-in" onClick={() => setWalkIn(true)} />
          <ActionButton icon={LogOut} label="Exit" onClick={() => setExit(true)} />
          <ActionButton icon={ShieldAlert} label="Incident" onClick={() => setIncident(true)} danger />
        </div>
      </nav>

      <FormSheet open={scan} onOpenChange={setScan} size="md" title="Scan the visitor's QR">
        {scan && <QrScanner onScan={(qr) => { setScan(false); void check({ qr }); }} />}
      </FormSheet>
      <WalkInSheet open={walkIn} onOpenChange={setWalkIn} device={device} record={record} online={online} policy={walkInPolicy} />
      <ExitSheet open={exit} onOpenChange={setExit} device={device} record={record} localInside={localInside} />
      <IncidentSheet open={incident} onOpenChange={setIncident} device={device} />
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, danger }: { icon: typeof UserPlus; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('flex h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl text-sm font-medium transition active:scale-95 hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary',
        danger ? 'text-destructive' : 'text-foreground')}>
      <Icon className="h-6 w-6" /> {label}
    </button>
  );
}

function ResultCard({ verdict: v, onAdmit, onRefuse, onClose, onWalkIn }: {
  verdict: GateVerdict;
  onAdmit: () => Promise<void>;
  onRefuse: () => Promise<void>;
  onClose: () => void;
  onWalkIn: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const run = (fn: () => Promise<void>) => async () => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  const banned = v.visitor?.banned;
  const ok = v.valid && !banned;
  const rows: { icon: typeof Home; label: string; value?: string }[] = [
    { icon: Home, label: 'Visiting', value: v.unitCode },
    { icon: Building2, label: 'Block', value: v.block },
    { icon: UserRound, label: 'Host', value: v.hostName },
    { icon: Ticket, label: 'Pass', value: v.passType ? PASS_TYPES[v.passType as PassType] ?? v.passType : undefined },
    { icon: Car, label: 'Car', value: v.vehiclePlate },
    { icon: CalendarClock, label: 'Valid until', value: v.validTo ? fmtDateTime(v.validTo) : undefined },
    { icon: DoorOpen, label: 'Entries left', value: v.entriesLeft !== undefined ? String(v.entriesLeft) : undefined },
  ].filter((r) => r.value);

  return (
    <section aria-live="assertive" className={cn('overflow-hidden rounded-3xl border-2 bg-card shadow-lg', ok ? 'border-success' : 'border-destructive')}>
      <div className={cn('flex items-center gap-4 p-5', ok ? 'bg-success/10' : 'bg-destructive/10')}>
        {ok ? <ShieldCheck className="h-12 w-12 shrink-0 text-success" /> : <ShieldX className="h-12 w-12 shrink-0 text-destructive" />}
        <div className="min-w-0 flex-1">
          <p className={cn('font-display text-2xl font-semibold', ok ? 'text-success' : 'text-destructive')}>
            {banned ? 'Not allowed in' : v.valid ? 'Pass valid' : 'Not valid'}
          </p>
          {!v.valid && v.reason && <p className="text-sm text-muted-foreground">{v.reason}</p>}
          {v.offline && <p className="text-xs text-warning-foreground">Checked offline from the tablet&apos;s list</p>}
        </div>
        <IconButton label="Close the result" onClick={onClose}><X /></IconButton>
      </div>

      <div className="space-y-4 p-5">
        {v.visitorName && <p className="font-display text-3xl font-semibold leading-tight">{v.visitorName}</p>}
        {rows.length > 0 && (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {rows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="truncate font-medium">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        )}
        {v.visitor && (
          <p className={cn('flex items-center gap-2 rounded-xl p-3 text-sm', banned ? 'bg-destructive/10 text-destructive' : 'bg-muted')}>
            <History className="h-4 w-4 shrink-0" />
            {banned ? `Marked not allowed in${v.visitor.notes ? `: ${v.visitor.notes}` : ''}`
              : `${v.visitor.visits} earlier ${v.visitor.visits === 1 ? 'visit' : 'visits'}${v.visitor.last_visit_at ? `, last ${fmtDateTime(v.visitor.last_visit_at)}` : ''}`}
          </p>
        )}

        {ok ? (
          <div className="grid grid-cols-[1fr_1.6fr] gap-3 pt-1">
            <Button size="lg" variant="outline" className="h-14 rounded-2xl" disabled={busy} onClick={run(onRefuse)}>Refuse</Button>
            <Button size="lg" className="h-14 rounded-2xl text-lg" disabled={busy} onClick={run(onAdmit)}>
              {busy ? <Loader2 className="animate-spin" /> : <DoorOpen />} Let in
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button size="lg" variant="outline" className="h-14 rounded-2xl" disabled={busy} onClick={run(onRefuse)}>Log refusal</Button>
            <Button size="lg" variant="secondary" className="h-14 rounded-2xl" disabled={busy || banned} onClick={onWalkIn}><UserPlus /> Walk-in instead</Button>
          </div>
        )}
      </div>
    </section>
  );
}
