'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { PhotoPicker, type PickedPhoto } from '@/components/common/photo-picker';
import { useSlug } from '@/hooks/use-access';
import { useSaveReading } from '@/hooks/use-utilities';
import type { RoundRow } from '@/lib/api/types';
import { num } from '@/lib/utils';
import { flagReason, m3 } from './reading-maths';

/**
 * Capture sheet for one meter: numeric keypad entry and an optional meter photo. A reading below
 * the last one, or use above the API's spike limit, is pointed out before saving so the caretaker
 * can look again.
 */
export function ReadingCapture({ row, propertyId, period, onDone }: { row: RoundRow | null; propertyId: string; period: string; onDone: () => void }) {
  const slug = useSlug();
  const save = useSaveReading(propertyId, period);
  const [value, setValue] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [confirmOdd, setConfirmOdd] = useState(false);

  useEffect(() => { setValue(''); setPhotos([]); setConfirmOdd(false); }, [row]);
  if (!row) return null;

  const prev = num(row.previous_reading);
  const reading = value === '' ? null : Number(value);
  // Use is the dial difference times the meter's multiplier, as the API stores it.
  const mult = num(row.multiplier ?? 1) || 1;
  const used = reading != null && Number.isFinite(reading) ? (reading - prev) * mult : null;
  // The same two checks the API flags on: below the last reading, or use above the row's
  // spike_above (a multiple of this meter's average). No limit is guessed here without history.
  const warning = used == null ? null
    : used < 0 ? flagReason('lower_than_previous', row, 0, reading ?? 0)
    : row.spike_above != null && used > num(row.spike_above) ? flagReason('spike', row, used, reading ?? 0)
    : null;
  // The photo is optional (user decision 2026-10-08): it settles disputes, but a failed camera or
  // upload must never block a reading.
  const ready = reading != null && Number.isFinite(reading) && reading >= 0;

  const submit = () => {
    if (!ready || reading == null) return;
    if (warning && !confirmOdd) { setConfirmOdd(true); return; }
    save.mutate({ meterId: row.meter_id, reading, photoKey: photos[0]?.key }, { onSuccess: onDone });
  };

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onDone()}
      size="sm"
      title={`${row.unit_code ?? 'Meter'} · ${row.serial}`}
      description={`Last reading ${m3(prev)}${row.average_use != null ? `, usually about ${m3(row.average_use)} m3 a month` : ''}`}
      footer={<>
        <Button variant="outline" onClick={onDone}>Skip</Button>
        <Button size="lg" onClick={submit} disabled={!ready || save.isPending}>
          {save.isPending ? 'Saving...' : warning && confirmOdd ? 'Save anyway' : 'Save reading'}
        </Button>
      </>}
    >
      <div className="space-y-4">
        <Field label="Reading (m3)" htmlFor="rd-val">
          <Input id="rd-val" inputMode="decimal" autoFocus value={value} onChange={(e) => { setValue(e.target.value.replace(/[^\d.]/g, '')); setConfirmOdd(false); }} className="h-14 text-center font-mono text-2xl" />
        </Field>
        {used != null && reading != null && (
          <p className="text-center text-sm text-muted-foreground">
            {m3(reading)} new minus {m3(prev)} last: <strong className="text-foreground">{m3(used)} m3 used</strong>
          </p>
        )}
        {warning && (
          <p className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{warning} Check the meter again{confirmOdd ? ', then save anyway if it is right.' : '.'}</span>
          </p>
        )}
        <Field label="Photo of the meter" hint="Optional, but it helps if the owner queries the bill">
          <PhotoPicker slug={slug} kind="readings" value={photos} onChange={setPhotos} max={1} label="Take photo" />
        </Field>
      </div>
    </FormSheet>
  );
}
