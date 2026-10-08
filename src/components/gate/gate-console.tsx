'use client';

import { useCallback, useState } from 'react';
import { DoorOpen, LogOut, QrCode, ShieldAlert, ShieldCheck, ShieldX, UserPlus, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormSheet } from '@/components/common/form-sheet';
import { apiErrorMessage } from '@/lib/api/errors';
import type { GateDeviceCreds } from '@/lib/gate/device';
import { verifyPass, type GateVerdict } from '@/lib/gate/verify';
import type { useGate } from '@/hooks/use-gate';
import { cn, fmtDateTime } from '@/lib/utils';
import { IncidentSheet } from './incident-sheet';
import { Keypad } from './keypad';
import { QrScanner, canScanQr } from './qr-scanner';
import { WalkInSheet } from './walk-in-sheet';

type Gate = ReturnType<typeof useGate>;

export function GateConsole({ gate, device }: { gate: Gate; device: GateDeviceCreds }) {
  const [code, setCode] = useState('');
  const [verdict, setVerdict] = useState<GateVerdict | null>(null);
  const [busy, setBusy] = useState(false);
  const [scan, setScan] = useState(false);
  const [walkIn, setWalkIn] = useState(false);
  const [incident, setIncident] = useState(false);
  const { record, passes, online, pending, guard, signOff } = gate;

  const check = useCallback(async (input: { code?: string; qr?: string }) => {
    setBusy(true);
    try {
      setVerdict(await verifyPass(device, passes, input));
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not check the pass.'));
    } finally {
      setBusy(false);
      setCode('');
    }
  }, [device, passes]);

  const admit = async () => {
    if (!verdict?.passId) return;
    await record({ kind: 'entry', pass_id: verdict.passId, visitor_name: verdict.visitorName, host_unit_id: verdict.unitId, offline: verdict.offline });
    toast.success('Entry recorded. The host has been told.');
    setVerdict(null);
  };
  const refuse = async () => {
    await record({ kind: 'denied', pass_id: verdict?.passId, visitor_name: verdict?.visitorName, notes: verdict?.reason });
    setVerdict(null);
  };
  const exit = async () => {
    await record({ kind: 'exit', notes: 'Exit recorded at the gate' });
    toast.success('Exit recorded');
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-sidebar px-4 py-3 text-sidebar-foreground">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold">{device.gateName}</p>
          <p className="text-xs text-sidebar-muted">{guard ? `${guard.name}, on duty since ${fmtDateTime(guard.since)}` : ''}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className={cn('flex items-center gap-1.5 rounded-full px-3 py-1', online ? 'bg-success/20' : 'bg-warning/30')}>
            {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />} {online ? 'Online' : 'Offline'}
          </span>
          {pending > 0 && <span className="rounded-full bg-sidebar-accent px-3 py-1">{pending} waiting to send</span>}
          <Button variant="ghost" size="sm" className="text-sidebar-foreground hover:bg-sidebar-accent" onClick={signOff}><LogOut /> Sign off</Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4 lg:flex-row lg:items-start lg:justify-center lg:gap-12 lg:p-8">
        <section className="flex w-full max-w-sm flex-col items-center gap-4">
          <h1 className="text-center font-display text-xl font-semibold">Enter the visitor&apos;s code</h1>
          <Keypad value={code} disabled={busy} onChange={(v) => { setCode(v); if (v.length === 6) void check({ code: v }); }} />
          {canScanQr() && (
            <Button size="lg" variant="outline" className="h-14 w-full max-w-xs text-lg" onClick={() => setScan(true)}><QrCode /> Scan QR</Button>
          )}
        </section>

        <section className="w-full max-w-md">
          {verdict ? (
            <div className={cn('space-y-4 rounded-2xl border-2 p-6 text-center', verdict.valid ? 'border-success bg-success/5' : 'border-destructive bg-destructive/5')}>
              {verdict.valid ? <ShieldCheck className="mx-auto h-14 w-14 text-success" /> : <ShieldX className="mx-auto h-14 w-14 text-destructive" />}
              <p className="font-display text-2xl font-semibold">{verdict.valid ? 'Pass valid' : 'Not valid'}</p>
              {verdict.visitorName && <p className="text-lg">{verdict.visitorName}{verdict.unitCode ? `, guest of ${verdict.unitCode}` : ''}</p>}
              {verdict.valid && verdict.validTo && <p className="text-sm text-muted-foreground">Valid until {fmtDateTime(verdict.validTo)}</p>}
              {!verdict.valid && verdict.reason && <p className="text-muted-foreground">{verdict.reason}</p>}
              {verdict.offline && <p className="text-xs text-warning">Checked offline from the tablet list</p>}
              {verdict.valid ? (
                <div className="grid grid-cols-2 gap-3">
                  <Button size="lg" variant="outline" className="h-14" onClick={() => void refuse()}>Refuse</Button>
                  <Button size="lg" className="h-14 text-lg" onClick={() => void admit()}><DoorOpen /> Admit</Button>
                </div>
              ) : (
                <Button size="lg" variant="outline" className="h-14 w-full" onClick={() => void refuse()}>Record refusal</Button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
              The result shows here. Visitors without a pass go through Walk-in.
            </div>
          )}
        </section>
      </main>

      <footer className="grid grid-cols-3 gap-2 border-t bg-card p-3 pb-safe">
        <Button size="lg" variant="outline" className="h-16 flex-col gap-1" onClick={() => setWalkIn(true)}><UserPlus /> Walk-in</Button>
        <Button size="lg" variant="outline" className="h-16 flex-col gap-1" onClick={() => void exit()}><LogOut /> Exit</Button>
        <Button size="lg" variant="outline" className="h-16 flex-col gap-1 text-destructive" onClick={() => setIncident(true)}><ShieldAlert /> Incident</Button>
      </footer>

      <FormSheet open={scan} onOpenChange={setScan} size="md" title="Scan the visitor's QR">
        {scan && <QrScanner onScan={(qr) => { setScan(false); void check({ qr }); }} />}
      </FormSheet>
      <WalkInSheet open={walkIn} onOpenChange={setWalkIn} device={device} record={record} online={online} />
      <IncidentSheet open={incident} onOpenChange={setIncident} device={device} />
    </div>
  );
}
