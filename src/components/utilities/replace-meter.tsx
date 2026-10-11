'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { useReplaceMeter } from '@/hooks/use-utilities';
import { apiErrorMessage } from '@/lib/api/errors';
import type { RoundRow } from '@/lib/api/types';
import { num } from '@/lib/utils';

/**
 * Replaces a meter: the old meter's closing reading (billed with this period) and the new meter's
 * serial and opening reading. The unit's use this period is the old meter's last stretch plus the
 * new meter's use from its opening reading.
 */
export function ReplaceMeter({ row, propertyId, period, onDone }: { row: RoundRow | null; propertyId: string; period: string; onDone: () => void }) {
  const replace = useReplaceMeter(propertyId, period);
  const [f, setF] = useState({ closing: '', serial: '', make: '', opening: '0', notes: '' });
  const [error, setError] = useState('');
  const last = row ? num(row.previous_reading) : 0;
  const closing = Number(f.closing);
  const problem = f.closing !== '' && !(closing >= last) ? `At least the last reading, ${last}` : '';
  const valid = !!row && f.closing !== '' && !problem && f.serial.trim() !== '' && Number(f.opening) >= 0;
  const close = () => { setF({ closing: '', serial: '', make: '', opening: '0', notes: '' }); setError(''); onDone(); };

  return (
    <FormSheet
      open={!!row}
      onOpenChange={(o) => !o && close()}
      size="md"
      title={row ? `Replace meter ${row.serial}` : 'Replace meter'}
      description={row ? `${row.unit_code ?? row.kind.replace(/_/g, ' ')}, last reading ${last}` : undefined}
      footer={<>
        <Button variant="outline" onClick={close}>Cancel</Button>
        <Button disabled={!valid || replace.isPending}
          onClick={() => row && replace.mutate({ meterId: row.meter_id, body: { period, closing_reading: closing, new_serial: f.serial.trim(),
            new_make: f.make.trim() || undefined, opening_reading: Number(f.opening), notes: f.notes.trim() || undefined } },
          { onSuccess: close, onError: (e) => setError(apiErrorMessage(e)) })}>
          {replace.isPending ? 'Replacing...' : 'Replace meter'}
        </Button>
      </>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Old meter's closing reading" htmlFor="rm-close" required error={problem || undefined}>
          <Input id="rm-close" inputMode="decimal" value={f.closing} onChange={(e) => setF({ ...f, closing: e.target.value })} />
        </Field>
        <Field label="New meter's opening reading" htmlFor="rm-open" required>
          <Input id="rm-open" inputMode="decimal" value={f.opening} onChange={(e) => setF({ ...f, opening: e.target.value })} />
        </Field>
        <Field label="New meter number" htmlFor="rm-serial" required>
          <Input id="rm-serial" value={f.serial} onChange={(e) => setF({ ...f, serial: e.target.value })} className="font-mono" />
        </Field>
        <Field label="Make" htmlFor="rm-make">
          <Input id="rm-make" value={f.make} onChange={(e) => setF({ ...f, make: e.target.value })} />
        </Field>
        <Field label="Note" htmlFor="rm-notes" className="sm:col-span-2" error={error || undefined}>
          <Input id="rm-notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Old meter stuck; replaced by the plumber" />
        </Field>
      </div>
    </FormSheet>
  );
}
