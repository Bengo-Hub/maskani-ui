'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { gateDeviceApi } from '@/lib/gate/api';
import type { GateDeviceCreds } from '@/lib/gate/device';
import type { GateEventInput } from '@/lib/gate/queue';

const WAIT_MS = 5 * 60 * 1000;
type Phase = 'form' | 'waiting' | 'approved' | 'declined' | 'timeout';

/**
 * A visitor without a pass: record the walk-in, the host gets a WhatsApp button to allow or
 * decline, and the tablet polls the answer for up to 5 minutes (SRDD figure 13).
 */
export function WalkInSheet({ open, onOpenChange, device, record, online }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  device: GateDeviceCreds;
  record: (e: Omit<GateEventInput, 'client_event_id' | 'occurred_at' | 'guard_personnel_id'> & { client_event_id?: string }) => Promise<string>;
  online: boolean;
}) {
  const [units, setUnits] = useState<{ id: string; code: string }[]>([]);
  const [f, setF] = useState({ name: '', phone: '', unit: '', plate: '', idSeen: false });
  const [phase, setPhase] = useState<Phase>('form');
  const [left, setLeft] = useState(WAIT_MS);
  const eventId = useRef('');

  useEffect(() => {
    if (!open) return;
    setPhase('form');
    setF({ name: '', phone: '', unit: '', plate: '', idSeen: false });
    gateDeviceApi(device).units().then((r) => setUnits(r.data ?? [])).catch(() => setUnits([]));
  }, [open, device]);

  // Poll the host's decision every 3 seconds while waiting, with a visible countdown.
  useEffect(() => {
    if (phase !== 'waiting') return;
    const started = Date.now();
    const tick = setInterval(() => setLeft(Math.max(0, WAIT_MS - (Date.now() - started))), 1000);
    const poll = setInterval(async () => {
      if (Date.now() - started > WAIT_MS) { setPhase('timeout'); return; }
      try {
        const r = await gateDeviceApi(device).walkIn(eventId.current);
        if (r.decision === 'approved' || r.decision === 'declined' || r.decision === 'timeout') setPhase(r.decision);
      } catch { /* keep polling */ }
    }, 3000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [phase, device]);

  const visitor = () => ({ visitor_name: f.name.trim(), visitor_phone: f.phone.trim() || undefined, host_unit_id: f.unit, vehicle_plate: f.plate.trim() || undefined, id_sighted: f.idSeen });

  const ask = async () => {
    eventId.current = await record({ kind: 'walk_in_request', ...visitor() });
    setLeft(WAIT_MS);
    setPhase('waiting');
  };
  const admit = async () => { await record({ kind: 'entry', ...visitor(), notes: 'Walk-in approved by host' }); onOpenChange(false); };
  const deny = async () => { await record({ kind: 'denied', ...visitor(), notes: phase === 'timeout' ? 'Host did not answer in 5 minutes' : 'Host declined' }); onOpenChange(false); };

  const mins = Math.floor(left / 60000);
  const secs = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="Walk-in visitor"
      description={phase === 'form' ? 'No pass? Ask the host to approve. Do not photograph or keep the ID card.' : undefined}
      footer={phase === 'form' ? <>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={() => void ask()} disabled={!f.name.trim() || !f.unit || !online}>{online ? 'Ask the host' : 'Needs a connection'}</Button>
      </> : phase === 'approved' ? <Button size="lg" className="h-14 w-full text-lg" onClick={() => void admit()}><Check /> Admit</Button>
        : phase === 'waiting' ? <Button variant="outline" onClick={() => void deny()}>Stop waiting and refuse</Button>
          : <Button size="lg" variant="outline" className="h-14 w-full text-lg" onClick={() => void deny()}>Record refusal</Button>}
    >
      {phase === 'form' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Visitor name" htmlFor="w-name" required><Input id="w-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="h-12" /></Field>
          <Field label="Phone" htmlFor="w-phone"><Input id="w-phone" type="tel" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="h-12" /></Field>
          <Field label="Visiting unit" htmlFor="w-unit" required>
            <NativeSelect id="w-unit" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className="h-12">
              <option value="">Choose the unit</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.code}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Car plate" htmlFor="w-plate"><Input id="w-plate" value={f.plate} onChange={(e) => setF({ ...f, plate: e.target.value })} className="h-12 uppercase" /></Field>
          <label className="flex items-center gap-3 rounded-lg border p-3 text-sm sm:col-span-2">
            <Checkbox checked={f.idSeen} onCheckedChange={(v) => setF({ ...f, idSeen: !!v })} /> I have seen their ID card
          </label>
        </div>
      )}
      {phase === 'waiting' && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Clock className="h-12 w-12 text-warning" />
          <p className="font-display text-4xl font-semibold tabular">{mins}:{secs}</p>
          <p className="text-muted-foreground">Waiting for the host to answer on WhatsApp</p>
        </div>
      )}
      {phase === 'approved' && <div className="flex flex-col items-center gap-3 py-8 text-center"><Check className="h-14 w-14 text-success" /><p className="font-display text-2xl font-semibold">Host said yes</p></div>}
      {(phase === 'declined' || phase === 'timeout') && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <X className="h-14 w-14 text-destructive" />
          <p className="font-display text-2xl font-semibold">{phase === 'declined' ? 'Host said no' : 'No answer in 5 minutes'}</p>
          <p className="text-muted-foreground">Do not let the visitor in.</p>
        </div>
      )}
    </FormSheet>
  );
}
