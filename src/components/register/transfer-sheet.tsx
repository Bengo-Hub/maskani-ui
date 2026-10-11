'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { useTransferUnit } from '@/hooks/use-register';
import { apiErrorMessage } from '@/lib/api/errors';
import type { TransferResult } from '@/lib/api/register';
import type { Party } from '@/lib/api/types';
import { apiDate, todayInput } from '@/lib/utils';
import { PartyPicker } from './party-picker';

/**
 * Resale or transfer of a unit (SRDD 16.3). Every account must be clear first. The buyer becomes the
 * primary owner, the sellers' links end on the date (their passes stop, the caretaker is asked for a
 * final reading, the accounts move to the buyer), and the month's split by days is shown for
 * finance to settle fixed charges between them.
 */
export function TransferSheet({ open, onOpenChange, unitId, unitCode }: { open: boolean; onOpenChange: (o: boolean) => void; unitId: string; unitCode: string }) {
  const transfer = useTransferUnit(unitId);
  const [buyer, setBuyer] = useState<Party | null>(null);
  const [date, setDate] = useState(todayInput);
  const [reading, setReading] = useState('');
  const [invite, setInvite] = useState(true);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState<TransferResult | null>(null);
  const close = () => {
    setBuyer(null); setDate(todayInput()); setReading(''); setInvite(true); setNote(''); setError(''); setDone(null);
    onOpenChange(false);
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => !o && close()}
      size="lg"
      title={`Transfer ${unitCode} to a new owner`}
      description="Clear every account and issue the clearance certificate first."
      footer={done ? <Button onClick={close}>Done</Button> : <>
        <Button variant="outline" onClick={close}>Cancel</Button>
        <Button disabled={!buyer || transfer.isPending}
          onClick={() => buyer && transfer.mutate(
            { new_owner_id: buyer.id, date: apiDate(date), reading: reading === '' ? undefined : Number(reading), invite, note: note.trim() || undefined },
            { onSuccess: (r) => setDone(r), onError: (e) => setError(apiErrorMessage(e)) },
          )}>
          {transfer.isPending ? 'Transferring...' : 'Transfer ownership'}
        </Button>
      </>}
    >
      {done ? (
        <div className="space-y-2 text-sm">
          <p>
            {done.ended_links} previous ownership{done.ended_links === 1 ? '' : 's'} ended; the accounts now bill the new owner
            {done.invited ? ', who has been invited to the portal' : ''}.
          </p>
          <p className="rounded-xl bg-muted/50 px-3 py-2">
            {done.apportion.period}: {done.apportion.outgoing_days} days to the seller, {done.apportion.incoming_days} to the buyer
            {done.apportion.handover_use != null ? `; water used up to handover ${done.apportion.handover_use} m3` : ''}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <PartyPicker value={buyer} onChange={setBuyer} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Transfer date" htmlFor="tr-date" required hint="Today or earlier ends the old ownership now">
              <Input id="tr-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Meter reading at handover" htmlFor="tr-reading" hint="Optional; splits the month's water">
              <Input id="tr-reading" inputMode="decimal" value={reading} onChange={(e) => setReading(e.target.value)} />
            </Field>
            <Field label="Note" htmlFor="tr-note" className="sm:col-span-2">
              <Input id="tr-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sale agreement dated 2 October" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={invite} onCheckedChange={(v) => setInvite(v === true)} /> Invite the new owner to the portal
          </label>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </div>
      )}
    </FormSheet>
  );
}
