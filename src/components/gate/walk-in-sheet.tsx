'use client';

import { useEffect, useRef, useState } from 'react';
import { BellRing, Check, DoorOpen, History, Loader2, MessageCircleQuestion, Search, ShieldAlert, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import type { RecordGateEvent } from '@/hooks/use-gate';
import { apiErrorMessage } from '@/lib/api/errors';
import { gateDeviceApi, type VisitorMatch, type WalkInPolicy, type WalkInState } from '@/lib/gate/api';
import type { GateDeviceCreds } from '@/lib/gate/device';
import { cn, fmtDateTime } from '@/lib/utils';

type Phase = 'form' | 'waiting' | 'approved' | 'declined';
const RING_GAP_MS = 30_000;
const blank = { name: '', phone: '', unit: '', plate: '', idNumber: '', idSeen: false };

/**
 * A visitor without a pass. By default the guard lets them in and the host is told on their
 * phone; an estate that wants the host's say first sets "ask the host". While asking, the guard
 * can ring the host (a push that pops up on their phone, plus WhatsApp) or decide themselves on
 * the same walk-in, so one visit is one log line. Returning visitors are found as the guard types.
 */
export function WalkInSheet({ open, onOpenChange, device, record, online, policy }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  device: GateDeviceCreds;
  record: RecordGateEvent;
  online: boolean;
  policy: WalkInPolicy;
}) {
  const api = gateDeviceApi(device);
  const [units, setUnits] = useState<{ id: string; code: string }[]>([]);
  const [f, setF] = useState(blank);
  const [q, setQ] = useState('');
  const [matches, setMatches] = useState<VisitorMatch[]>([]);
  const [looking, setLooking] = useState(false);
  const [known, setKnown] = useState<VisitorMatch | null>(null);
  const [phase, setPhase] = useState<Phase>('form');
  const [state, setState] = useState<WalkInState | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [rangAt, setRangAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const eventId = useRef('');

  useEffect(() => {
    if (!open) return;
    setPhase('form');
    setF(blank);
    setQ('');
    setMatches([]);
    setKnown(null);
    setState(null);
    gateDeviceApi(device).units().then((r) => setUnits(r.data ?? [])).catch(() => setUnits([]));
  }, [open, device]);

  // Returning visitors: look up as the guard types (phone, plate or name), 300 ms after the last key.
  useEffect(() => {
    const term = q.trim();
    if (!open || !online || term.length < 3) { setMatches([]); return; }
    let live = true;
    setLooking(true);
    const t = setTimeout(() => {
      gateDeviceApi(device).visitors(term)
        .then((r) => { if (live) setMatches(r.data ?? []); })
        .catch(() => { if (live) setMatches([]); })
        .finally(() => { if (live) setLooking(false); });
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [q, open, online, device]);

  // While asking: poll the answer every 3 seconds and show how long the visitor has waited.
  useEffect(() => {
    if (phase !== 'waiting') return;
    const tick = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    const poll = setInterval(async () => {
      try {
        const r = await gateDeviceApi(device).walkIn(eventId.current);
        setState(r);
        if (r.decision === 'approved') setPhase('approved');
        else if (r.decision === 'declined') setPhase('declined');
      } catch { /* keep polling */ }
    }, 3000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [phase, device, startedAt]);

  const pick = (v: VisitorMatch) => {
    setKnown(v);
    setF((s) => ({ ...s, name: v.name, phone: v.phone ?? '', plate: v.vehicle_plate ?? '', unit: v.last_host_unit_id ?? s.unit }));
    setQ('');
    setMatches([]);
  };

  const details = () => ({
    visitor_name: f.name.trim(),
    visitor_phone: f.phone.trim() || undefined,
    host_unit_id: f.unit || undefined,
    vehicle_plate: f.plate.trim().toUpperCase() || undefined,
    id_number: f.idNumber.trim() || undefined,
    id_sighted: f.idSeen || !!f.idNumber.trim(),
  });
  const ready = !!f.name.trim() && !!f.unit;
  const unitCode = units.find((u) => u.id === f.unit)?.code;

  const letIn = async (note: string) => {
    setBusy(true);
    try {
      await record({ kind: 'entry', ...details(), notes: note });
      toast.success(`${f.name.trim()} let in${unitCode ? ` to ${unitCode}` : ''}. The host has been told.`);
      onOpenChange(false);
    } finally { setBusy(false); }
  };
  const turnAway = async () => {
    setBusy(true);
    try {
      await record({ kind: 'denied', ...details(), notes: 'Walk-in turned away at the gate' });
      toast('Turned away and logged');
      onOpenChange(false);
    } finally { setBusy(false); }
  };
  const ask = async () => {
    setBusy(true);
    try {
      eventId.current = await record({ kind: 'walk_in_request', ...details() });
      const now = Date.now();
      setStartedAt(now);
      setElapsed(0);
      setRangAt(now);
      setState(null);
      setPhase('waiting');
    } finally { setBusy(false); }
  };
  const ring = async () => {
    try {
      setState(await api.ringHost(eventId.current));
      setRangAt(Date.now());
      toast.success('The host\'s phone is ringing');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not ring the host.'));
    }
  };
  const decide = async (admit: boolean) => {
    setBusy(true);
    try {
      const r = await api.resolveWalkIn(eventId.current, admit, admit ? 'Let in by the guard' : undefined);
      // A host who answered first has the last word.
      if (r.decided_by === 'host') toast(`The host already ${r.decision === 'approved' ? 'said yes' : 'said no'}.`);
      else toast.success(admit ? 'Let in. The host has been told.' : 'Turned away and logged');
      onOpenChange(false);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not save the decision.'));
    } finally { setBusy(false); }
  };

  // startedAt + elapsed is "now" as of the last tick, which keeps render pure.
  const ringWait = Math.max(0, RING_GAP_MS - (startedAt + elapsed - rangAt));
  const mins = Math.floor(elapsed / 60000);
  const secs = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
  const askHost = policy === 'ask_host';

  const footer = phase === 'form' ? (
    <div className="grid w-full gap-2 sm:grid-cols-[1fr_1fr_1.4fr]">
      <Button size="lg" variant="outline" className="h-12 text-destructive" disabled={!f.name.trim() || busy} onClick={() => void turnAway()}>
        <X /> Turn away
      </Button>
      {askHost ? (
        <>
          <Button size="lg" variant="outline" className="h-12" disabled={!ready || busy} onClick={() => void letIn('Let in by the guard without asking the host')}>
            <DoorOpen /> Let in anyway
          </Button>
          <Button size="lg" className="h-12" disabled={!ready || busy || !online} onClick={() => void ask()}>
            <MessageCircleQuestion /> {online ? 'Ask the host' : 'Asking needs a connection'}
          </Button>
        </>
      ) : (
        <>
          <Button size="lg" variant="outline" className="h-12" disabled={!ready || busy || !online} onClick={() => void ask()}>
            <MessageCircleQuestion /> Ask the host first
          </Button>
          <Button size="lg" className="h-12 text-base" disabled={!ready || busy} onClick={() => void letIn('Walk-in let in by the guard')}>
            <DoorOpen /> Let in
          </Button>
        </>
      )}
    </div>
  ) : phase === 'waiting' ? (
    <div className="grid w-full grid-cols-2 gap-2">
      <Button size="lg" variant="outline" className="h-12 text-destructive" disabled={busy} onClick={() => void decide(false)}><X /> Turn away</Button>
      <Button size="lg" className="h-12" disabled={busy} onClick={() => void decide(true)}><DoorOpen /> Let in</Button>
    </div>
  ) : (
    <Button size="lg" className="h-14 w-full text-lg" onClick={() => onOpenChange(false)}>Done</Button>
  );

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="Walk-in visitor"
      description={phase === 'form'
        ? (askHost ? 'This estate asks the host before a walk-in comes in.' : 'Let them in and the host is told on their phone. Ask first when you are unsure.')
        : undefined}
      footer={footer}
    >
      {phase === 'form' && (
        <div className="space-y-5">
          {online && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Been here before? Phone, plate or name"
                className="h-12 pl-9" aria-label="Find a returning visitor" autoComplete="off" />
              {looking && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
              {matches.length > 0 && (
                <ul className="mt-2 divide-y overflow-hidden rounded-xl border bg-card">
                  {matches.map((m) => (
                    <li key={m.id}>
                      <button type="button" onClick={() => pick(m)} className="flex w-full cursor-pointer items-center justify-between gap-3 p-3 text-left hover:bg-muted">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{m.name}{m.banned && <span className="ml-2 text-xs font-semibold text-destructive">Not allowed in</span>}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[m.phone, m.vehicle_plate, m.last_unit_code && `last to ${m.last_unit_code}`].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">{m.visits} {m.visits === 1 ? 'visit' : 'visits'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {known && (
            <div className={cn('flex items-start gap-3 rounded-xl border p-3 text-sm', known.banned ? 'border-destructive bg-destructive/10' : 'bg-primary/5')}>
              {known.banned ? <ShieldAlert className="h-5 w-5 shrink-0 text-destructive" /> : <History className="h-5 w-5 shrink-0 text-primary" />}
              <div>
                <p className="font-medium">{known.banned ? 'This visitor is not allowed in' : `Returning visitor, ${known.visits} ${known.visits === 1 ? 'visit' : 'visits'}`}</p>
                <p className="text-muted-foreground">
                  {known.last_visit_at ? `Last here ${fmtDateTime(known.last_visit_at)}` : ''}
                  {known.id_number_hint ? ` · ID ending ${known.id_number_hint}` : ''}
                  {known.notes ? ` · ${known.notes}` : ''}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Visitor name" htmlFor="w-name" required>
              <Input id="w-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="h-12" autoComplete="off" />
            </Field>
            <Field label="Phone" htmlFor="w-phone">
              <Input id="w-phone" type="tel" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="h-12" autoComplete="off" />
            </Field>
            <Field label="Visiting unit" htmlFor="w-unit" required>
              <NativeSelect id="w-unit" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className="h-12">
                <option value="">Choose the unit</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.code}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Car plate" htmlFor="w-plate">
              <Input id="w-plate" value={f.plate} onChange={(e) => setF({ ...f, plate: e.target.value })} className="h-12 uppercase" autoComplete="off" />
            </Field>
            <Field label="ID number" htmlFor="w-id" hint="Used to recognise them next time; only the last digits are shown.">
              <Input id="w-id" inputMode="numeric" value={f.idNumber} onChange={(e) => setF({ ...f, idNumber: e.target.value })} className="h-12" autoComplete="off" />
            </Field>
            <label className="flex items-center gap-3 self-end rounded-lg border p-3 text-sm">
              <Checkbox checked={f.idSeen} onCheckedChange={(v) => setF({ ...f, idSeen: !!v })} /> I have seen their ID card
            </label>
          </div>
        </div>
      )}

      {phase === 'waiting' && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="relative flex h-20 w-20 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/20 motion-reduce:hidden" />
            <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/15"><BellRing className="h-9 w-9 text-primary" /></span>
          </span>
          <div>
            <p className="font-display text-xl font-semibold">Asking {unitCode ?? 'the host'}</p>
            <p className="text-sm text-muted-foreground">Sent to the host&apos;s phone and WhatsApp. Waiting {mins}:{secs}</p>
            {state?.decision === 'timeout' && <p className="mt-1 text-sm font-medium text-warning-foreground">No answer yet. Ring again or decide yourself.</p>}
          </div>
          <Button size="lg" variant="outline" className="h-12 min-w-56" disabled={ringWait > 0} onClick={() => void ring()}>
            <BellRing /> {ringWait > 0 ? `Ring again in ${Math.ceil(ringWait / 1000)}s` : 'Ring the host'}{state?.rings ? ` (${state.rings})` : ''}
          </Button>
          <p className="max-w-sm text-xs text-muted-foreground">Ringing pops up on the host&apos;s phone. You can let the visitor in or turn them away at any time.</p>
        </div>
      )}

      {phase === 'approved' && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15"><Check className="h-10 w-10 text-success" /></span>
          <p className="font-display text-2xl font-semibold">Host said yes</p>
          <p className="text-muted-foreground">Let {f.name.trim() || 'the visitor'} in. The entry is already logged.</p>
        </div>
      )}
      {phase === 'declined' && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/15"><X className="h-10 w-10 text-destructive" /></span>
          <p className="font-display text-2xl font-semibold">Host said no</p>
          <p className="text-muted-foreground">Do not let the visitor in. This is logged.</p>
        </div>
      )}
    </FormSheet>
  );
}
