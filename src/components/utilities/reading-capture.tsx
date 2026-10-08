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

/**
 * Capture sheet for one meter: numeric keypad entry and a required meter photo. Obvious problems
 * (lower than last month, a big jump) are flagged before saving so the caretaker can look again.
 */
export function ReadingCapture({ row, propertyId, period, onDone }: { row: RoundRow | null; propertyId: string; period: string; onDone: () => void }) {
  const slug = useSlug();
  const save = useSaveReading(propertyId, period);
  const [value, setValue] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [confirmOdd, setConfirmOdd] = useState(false);

  useEffect(() => { setValue(''); setPhotos([]); setConfirmOdd(false); }, [row]);
  if (!row) return null;

  const prev = row.previous_reading != null ? num(row.previous_reading) : null;
  const reading = value === '' ? null : Number(value);
  const used = prev != null && reading != null ? reading - prev : null;
  const warning = used == null ? null : used < 0 ? 'Lower than last month' : prev != null && prev > 0 && used > Math.max(30, prev * 0.5) ? 'Much higher than usual' : null;
  const ready = reading != null && Number.isFinite(reading) && reading >= 0 && photos.length === 1;

  const submit = () => {
    if (!ready || reading == null) return;
    if (warning && !confirmOdd) { setConfirmOdd(true); return; }
    save.mutate({ meterId: row.meter_id, reading, photoKey: photos[0].key }, { onSuccess: onDone });
  };

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onDone()}
      size="sm"
      title={`${row.unit_code ?? 'Meter'} · ${row.serial}`}
      description={prev != null ? `Last reading ${prev}` : 'First reading for this meter'}
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
        {used != null && <p className="text-center text-sm text-muted-foreground">Used this month: <strong className="text-foreground">{used.toFixed(1)} m3</strong></p>}
        {warning && (
          <p className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {warning}. Check the meter again{confirmOdd ? ', then save anyway if it is right.' : '.'}
          </p>
        )}
        <Field label="Photo of the meter (required)">
          <PhotoPicker slug={slug} kind="readings" value={photos} onChange={setPhotos} max={1} required label="Take photo" />
        </Field>
      </div>
    </FormSheet>
  );
}
