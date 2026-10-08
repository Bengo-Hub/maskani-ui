'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { useCreateChargeType, useFunds, useUpdateChargeType } from '@/hooks/use-billing';
import type { ChargeTypeInput } from '@/lib/api/billing';
import type { ChargeType } from '@/lib/api/types';
import { BILL_TO, CHARGE_BASIS, CHARGE_FREQUENCY, CHARGE_GROUP } from '@/lib/labels';

interface FormState {
  name: string; code: string; description: string; charge_group: string; basis: string; frequency: string;
  fund_code: string; bill_to: string; vat_rate: string; tax_exempt: boolean; allocation_priority: string;
}

const toForm = (c?: ChargeType | null): FormState => ({
  name: c?.name ?? '', code: c?.code ?? '', description: c?.description ?? '', charge_group: c?.charge_group ?? 'services',
  basis: c?.basis ?? 'fixed', frequency: c?.frequency ?? 'monthly', fund_code: c?.fund_code ?? 'estate', bill_to: c?.bill_to ?? 'owner',
  vat_rate: c?.vat_rate != null ? String(c.vat_rate) : '0', tax_exempt: c?.tax_exempt ?? false,
  allocation_priority: c?.allocation_priority != null ? String(c.allocation_priority) : '100',
});

/**
 * Creates a custom charge or edits one's settings. Amounts are not set here: they are dated rates
 * (RateForm), so changing a price never alters bills already issued.
 */
export function ChargeForm({ open, charge, onOpenChange }: { open: boolean; charge: ChargeType | null; onOpenChange: (o: boolean) => void }) {
  const create = useCreateChargeType();
  const update = useUpdateChargeType();
  const { data: funds = [] } = useFunds();
  const [f, setF] = useState<FormState>(toForm(charge));
  useEffect(() => { if (open) setF(toForm(charge)); }, [open, charge]);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
  const code = (f.code || f.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const vat = Number(f.vat_rate);
  const priority = Number(f.allocation_priority);
  const valid = f.name.trim() && code && Number.isFinite(vat) && vat >= 0 && vat <= 100 && Number.isInteger(priority);
  const busy = create.isPending || update.isPending;

  const submit = () => {
    const body: ChargeTypeInput = {
      name: f.name.trim(), description: f.description.trim(), charge_group: f.charge_group, basis: f.basis, frequency: f.frequency,
      fund_code: f.fund_code, bill_to: f.bill_to, vat_rate: vat, tax_exempt: f.tax_exempt, allocation_priority: priority,
    };
    if (charge) update.mutate({ id: charge.id, body }, { onSuccess: () => onOpenChange(false) });
    else create.mutate({ ...body, code }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={charge ? `Edit ${charge.name}` : 'New charge'}
      description="How this charge is worked out and which fund it is paid into. Set the amount with a rate."
      footer={<>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={submit} disabled={!valid || busy}>{busy ? 'Saving...' : charge ? 'Save charge' : 'Add charge'}</Button>
      </>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="ch-name" required>
          <Input id="ch-name" value={f.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Code" htmlFor="ch-code" hint={charge ? 'Codes do not change once bills use them' : 'Used on bills and reports'}>
          <Input id="ch-code" value={charge ? charge.code : code} onChange={(e) => set('code', e.target.value)} disabled={!!charge} className="font-mono" />
        </Field>
        <Field label="Group" htmlFor="ch-group">
          <NativeSelect id="ch-group" value={f.charge_group} onChange={(e) => set('charge_group', e.target.value)}>
            {Object.entries(CHARGE_GROUP).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Worked out" htmlFor="ch-basis" hint={f.basis === 'metered' ? 'Billed from meter readings' : undefined}>
          <NativeSelect id="ch-basis" value={f.basis} onChange={(e) => set('basis', e.target.value)}>
            {Object.entries(CHARGE_BASIS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </NativeSelect>
        </Field>
        <Field label="How often" htmlFor="ch-freq">
          <NativeSelect id="ch-freq" value={f.frequency} onChange={(e) => set('frequency', e.target.value)}>
            {Object.entries(CHARGE_FREQUENCY).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Paid into" htmlFor="ch-fund">
          <NativeSelect id="ch-fund" value={f.fund_code} onChange={(e) => set('fund_code', e.target.value)}>
            {funds.map((fd) => <option key={fd.id} value={fd.code ?? ''}>{fd.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Billed to" htmlFor="ch-billto">
          <NativeSelect id="ch-billto" value={f.bill_to} onChange={(e) => set('bill_to', e.target.value)}>
            {Object.entries(BILL_TO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </NativeSelect>
        </Field>
        <Field label="VAT (%)" htmlFor="ch-vat" hint="0 when the estate does not charge VAT">
          <Input id="ch-vat" inputMode="decimal" value={f.vat_rate} onChange={(e) => set('vat_rate', e.target.value)} disabled={f.tax_exempt} />
        </Field>
        <Field label="Settles in order" htmlFor="ch-prio" hint="Lower numbers are paid first when payments settle by priority">
          <Input id="ch-prio" inputMode="numeric" value={f.allocation_priority} onChange={(e) => set('allocation_priority', e.target.value)} />
        </Field>
        <label className="flex items-center justify-between gap-3 rounded-xl border p-3 sm:col-span-2">
          <span><span className="block text-sm font-medium">Tax exempt</span><span className="text-xs text-muted-foreground">No VAT, and the charge is reported as exempt</span></span>
          <Switch checked={f.tax_exempt} onCheckedChange={(v) => set('tax_exempt', v)} />
        </label>
        <Field label="Description" htmlFor="ch-desc" className="sm:col-span-2">
          <Input id="ch-desc" value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Shown to staff only" />
        </Field>
      </div>
    </FormSheet>
  );
}
