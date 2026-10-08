'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { useAddRate } from '@/hooks/use-billing';
import { useProperties } from '@/hooks/use-register';
import { useCatalogue } from '@/hooks/use-settings';
import type { RateInput } from '@/lib/api/billing';
import type { ChargeType } from '@/lib/api/types';
import { apiDate, todayInput } from '@/lib/utils';

interface Block { from: string; to: string; rate: string }

/**
 * Adds a dated rate. The new rate closes the previous one at the same scope, so bills already
 * issued never change. Per-unit-type charges price each unit type; metered charges take a flat
 * rate per m3 or block tariff bands, plus an optional fixed meter charge.
 */
export function RateForm({ charge, onClose }: { charge: ChargeType | null; onClose: () => void }) {
  const add = useAddRate();
  const { data: properties = [] } = useProperties();
  const { data: unitTypes = [] } = useCatalogue('unit_type');
  const [scope, setScope] = useState<RateInput['scope']>('tenant');
  const [propertyId, setPropertyId] = useState('');
  const [unitType, setUnitType] = useState('');
  const [amount, setAmount] = useState('');
  const [fixed, setFixed] = useState('');
  const [from, setFrom] = useState(todayInput);
  const [blocks, setBlocks] = useState<Block[]>([{ from: '0', to: '', rate: '' }]);

  const block = charge?.tariff_kind === 'block';
  const metered = charge?.basis === 'metered';

  useEffect(() => {
    if (!charge) return;
    setScope(charge.basis === 'per_unit_type' ? 'unit_type' : 'tenant');
    setPropertyId(''); setUnitType(''); setAmount(''); setFixed(''); setFrom(todayInput());
    setBlocks([{ from: '0', to: '', rate: '' }]);
  }, [charge]);

  const valid = !!from && (block ? blocks.every((b) => b.rate !== '') : amount !== '') && (scope !== 'unit_type' || !!unitType) && (scope !== 'property' || !!propertyId);

  const submit = () => {
    if (!charge || !valid) return;
    const rate: RateInput = {
      scope,
      effective_from: apiDate(from),
      ...(scope === 'property' ? { property_id: propertyId } : {}),
      ...(scope === 'unit_type' ? { unit_type: unitType } : {}),
      ...(block
        ? { tariff: blocks.map((b) => ({ from: Number(b.from) || 0, to: b.to === '' ? null : Number(b.to), rate: Number(b.rate) })) }
        : { amount: Number(amount) }),
      ...(metered && fixed !== '' ? { fixed_meter_charge: Number(fixed) } : {}),
    };
    add.mutate({ chargeTypeId: charge.id, rate }, { onSuccess: onClose });
  };

  return (
    <FormSheet
      open={!!charge}
      onOpenChange={(o) => !o && onClose()}
      size={block ? 'lg' : 'md'}
      title={`New rate for ${charge?.name ?? ''}`}
      description="Takes effect from the date below. Earlier bills keep the rate they were issued at."
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={!valid || add.isPending}>{add.isPending ? 'Saving...' : 'Save rate'}</Button>
      </>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Applies to" htmlFor="rt-scope">
          <NativeSelect id="rt-scope" value={scope} onChange={(e) => setScope(e.target.value as RateInput['scope'])}>
            <option value="tenant">Every property</option>
            <option value="property">One property</option>
            <option value="unit_type">One unit type</option>
          </NativeSelect>
        </Field>
        {scope === 'property' && (
          <Field label="Property" htmlFor="rt-prop" required>
            <NativeSelect id="rt-prop" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              <option value="">Choose a property</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </NativeSelect>
          </Field>
        )}
        {scope === 'unit_type' && (
          <Field label="Unit type" htmlFor="rt-ut" required>
            <NativeSelect id="rt-ut" value={unitType} onChange={(e) => setUnitType(e.target.value)}>
              <option value="">Choose a unit type</option>
              {unitTypes.map((u) => <option key={u.code} value={u.code}>{u.name}</option>)}
            </NativeSelect>
          </Field>
        )}
        <Field label="Effective from" htmlFor="rt-from" required>
          <Input id="rt-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        {!block && (
          <Field label={metered ? 'Rate per m3 (KES)' : charge?.basis === 'per_sqm' ? 'Rate per m2 (KES)' : charge?.basis === 'percentage' ? 'Percentage' : 'Amount (KES)'} htmlFor="rt-amt" required>
            <Input id="rt-amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
        )}
        {metered && (
          <Field label="Fixed meter charge (KES)" htmlFor="rt-fixed" hint="Optional monthly standing charge">
            <Input id="rt-fixed" inputMode="decimal" value={fixed} onChange={(e) => setFixed(e.target.value)} />
          </Field>
        )}
        {block && (
          <div className="space-y-2 sm:col-span-2">
            <p className="text-sm font-medium">Tariff bands (m3)</p>
            {blocks.map((b, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                <Field label="From"><Input inputMode="decimal" value={b.from} onChange={(e) => setBlocks((s) => s.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} /></Field>
                <Field label="To"><Input inputMode="decimal" value={b.to} placeholder="and above" onChange={(e) => setBlocks((s) => s.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} /></Field>
                <Field label="KES per m3"><Input inputMode="decimal" value={b.rate} onChange={(e) => setBlocks((s) => s.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)))} /></Field>
                <Button variant="ghost" size="icon" disabled={blocks.length === 1} onClick={() => setBlocks((s) => s.filter((_, j) => j !== i))} aria-label="Remove band"><Trash2 /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setBlocks((s) => [...s, { from: s[s.length - 1]?.to ?? '', to: '', rate: '' }])}><Plus /> Add band</Button>
          </div>
        )}
      </div>
    </FormSheet>
  );
}
