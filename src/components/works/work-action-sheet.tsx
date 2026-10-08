'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextField } from '@/components/common/rich-text';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { PhotoPicker, type PickedPhoto } from '@/components/common/photo-picker';
import { useSlug } from '@/hooks/use-access';
import { useVendors, useWorkAction } from '@/hooks/use-works';
import type { WorkAction } from '@/lib/api/types';

const TITLES: Record<WorkAction, string> = {
  assign: 'Assign', quote: 'Record a quote', approve_quote: 'Approve the quote', start: 'Start work',
  complete: 'Mark complete', confirm: 'Confirm on behalf of the resident', reopen: 'Reopen', cancel: 'Cancel work order', close: 'Close',
};

/** One sheet for every lifecycle action; it shows only the fields that action takes. */
export function WorkActionSheet({ workOrderId, action, onClose }: { workOrderId: string; action: WorkAction | null; onClose: () => void }) {
  const slug = useSlug();
  const act = useWorkAction(workOrderId);
  const vendors = useVendors();
  const [vendorId, setVendorId] = useState('');
  const [amount, setAmount] = useState('');
  const [minutes, setMinutes] = useState('');
  const [recharge, setRecharge] = useState(false);
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);

  useEffect(() => { setVendorId(''); setAmount(''); setMinutes(''); setRecharge(false); setNote(''); setPhotos([]); }, [action]);

  if (!action) return null;
  const needsVendor = action === 'assign';
  const needsAmount = action === 'quote' || action === 'complete';
  const valid = (!needsVendor || !!vendorId) && (action !== 'quote' || amount !== '');

  const submit = () => act.mutate({
    action,
    ...(needsVendor ? { vendor_id: vendorId } : {}),
    ...(action === 'quote' ? { quote_amount: Number(amount) } : {}),
    ...(action === 'complete' ? { cost_amount: amount ? Number(amount) : undefined, minutes_on_site: minutes ? Number(minutes) : undefined, recharge, photos: photos.map((p) => p.key) } : {}),
    note: note.trim() || undefined,
  }, { onSuccess: onClose });

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      size={action === 'complete' ? 'lg' : 'md'}
      title={TITLES[action]}
      footer={<>
        <Button variant="outline" onClick={onClose}>Back</Button>
        <Button variant={action === 'cancel' ? 'destructive' : 'default'} onClick={submit} disabled={!valid || act.isPending}>{act.isPending ? 'Saving...' : TITLES[action]}</Button>
      </>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {needsVendor && (
          <Field label="Vendor" htmlFor="wa-vendor" required className="sm:col-span-2">
            <NativeSelect id="wa-vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">Choose a vendor</option>
              {vendors.rows.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </NativeSelect>
          </Field>
        )}
        {needsAmount && (
          <Field label={action === 'quote' ? 'Quote (KES)' : 'Final cost (KES)'} htmlFor="wa-amt" required={action === 'quote'}>
            <Input id="wa-amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
        )}
        {action === 'complete' && (
          <>
            <Field label="Minutes on site" htmlFor="wa-min"><Input id="wa-min" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={recharge} onChange={(e) => setRecharge(e.target.checked)} className="h-4 w-4" /> Bill the cost to the unit owner
            </label>
            <Field label="Photos after the work" className="sm:col-span-2"><PhotoPicker slug={slug} kind="works" value={photos} onChange={setPhotos} /></Field>
          </>
        )}
        <Field label="Note" htmlFor="wa-note" className="sm:col-span-2"><RichTextField id="wa-note" value={note} onChange={setNote} /></Field>
      </div>
    </FormSheet>
  );
}
