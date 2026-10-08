'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { useAccess } from '@/hooks/use-access';
import { useProperties, useProperty, useSaveUnit } from '@/hooks/use-register';
import { useCatalogue } from '@/hooks/use-settings';
import type { UnitInput } from '@/lib/api/register';
import type { Unit } from '@/lib/api/types';
import { OCCUPANCY_STATUS, SALE_STATUS, UNIT_USE } from '@/lib/labels';
import { num } from '@/lib/utils';

interface FormState {
  property_id: string; block_id: string; code: string; unit_type: string; use: string;
  bedrooms: string; bathrooms: string; size_sqm: string; floor: string; parking_bays: string;
  sale_status: string; occupancy_status: string;
}

function toForm(u?: Unit, propertyId = ''): FormState {
  return {
    property_id: u?.property_id ?? propertyId, block_id: u?.block_id ?? '', code: u?.code ?? '', unit_type: u?.unit_type ?? '',
    use: u?.use ?? 'residential', bedrooms: u?.bedrooms != null ? String(u.bedrooms) : '', bathrooms: u?.bathrooms != null ? String(u.bathrooms) : '',
    size_sqm: u?.size_sqm != null ? String(num(u.size_sqm)) : '', floor: u?.floor != null ? String(u.floor) : '',
    parking_bays: u?.parking_bays != null ? String(u.parking_bays) : '', sale_status: u?.sale_status ?? 'not_for_sale',
    occupancy_status: u?.occupancy_status ?? 'vacant',
  };
}

const optInt = (v: string) => (v.trim() === '' ? undefined : Number.parseInt(v, 10));
const optNum = (v: string) => (v.trim() === '' ? undefined : Number(v));

export function UnitForm({ open, onOpenChange, unit, propertyId, onSaved }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  unit?: Unit;
  propertyId?: string;
  onSaved?: (u: Unit) => void;
}) {
  const { mod } = useAccess();
  const [f, setF] = useState<FormState>(() => toForm(unit, propertyId));
  const { data: properties = [] } = useProperties();
  const { data: property } = useProperty(f.property_id);
  const { data: types = [] } = useCatalogue('unit_type');
  const save = useSaveUnit(unit?.id);

  useEffect(() => {
    if (open) setF(toForm(unit, propertyId || (properties.length === 1 ? properties[0].id : '')));
  }, [open, unit, propertyId, properties]);

  const set = (k: keyof FormState, v: string) => setF((s) => ({ ...s, [k]: v }));
  const onType = (code: string) => {
    const t = types.find((x) => x.code === code);
    const beds = t?.attrs?.bedrooms;
    setF((s) => ({ ...s, unit_type: code, bedrooms: s.bedrooms || (typeof beds === 'number' ? String(beds) : s.bedrooms) }));
  };
  const valid = f.property_id && f.code.trim();

  const submit = () => {
    if (!valid) return;
    const body: UnitInput = {
      property_id: f.property_id, code: f.code.trim().toUpperCase(), block_id: f.block_id || undefined, unit_type: f.unit_type || undefined,
      use: f.use, bedrooms: optInt(f.bedrooms), bathrooms: optInt(f.bathrooms), size_sqm: optNum(f.size_sqm), floor: optInt(f.floor),
      parking_bays: optInt(f.parking_bays), occupancy_status: f.occupancy_status,
      ...(mod('sales') ? { sale_status: f.sale_status } : {}),
    };
    save.mutate(body, { onSuccess: (u) => { onSaved?.(u); onOpenChange(false); } });
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={unit ? `Edit unit ${unit.code}` : 'New unit'}
      footer={<>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={submit} disabled={!valid || save.isPending}>{save.isPending ? 'Saving...' : 'Save unit'}</Button>
      </>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Property" htmlFor="u-prop" required>
          <NativeSelect id="u-prop" value={f.property_id} onChange={(e) => set('property_id', e.target.value)} disabled={!!unit}>
            <option value="">Choose a property</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Block" htmlFor="u-block">
          <NativeSelect id="u-block" value={f.block_id} onChange={(e) => set('block_id', e.target.value)}>
            <option value="">No block</option>
            {(property?.edges?.blocks ?? []).map((b) => <option key={b.id} value={b.id}>{b.name || b.code}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Unit code" htmlFor="u-code" required hint="Also the paybill account number, e.g. B07">
          <Input id="u-code" value={f.code} onChange={(e) => set('code', e.target.value)} disabled={!!unit} className="uppercase" />
        </Field>
        <Field label="Unit type" htmlFor="u-type">
          <NativeSelect id="u-type" value={f.unit_type} onChange={(e) => onType(e.target.value)}>
            <option value="">Not set</option>
            {types.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Use" htmlFor="u-use">
          <NativeSelect id="u-use" value={f.use} onChange={(e) => set('use', e.target.value)}>
            {Object.entries(UNIT_USE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Occupancy" htmlFor="u-occ">
          <NativeSelect id="u-occ" value={f.occupancy_status} onChange={(e) => set('occupancy_status', e.target.value)}>
            {Object.entries(OCCUPANCY_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </NativeSelect>
        </Field>
        {mod('sales') && (
          <Field label="Sale status" htmlFor="u-sale">
            <NativeSelect id="u-sale" value={f.sale_status} onChange={(e) => set('sale_status', e.target.value)}>
              {Object.entries(SALE_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </NativeSelect>
          </Field>
        )}
        <div className="grid grid-cols-3 gap-3 sm:col-span-2">
          <Field label="Bedrooms" htmlFor="u-bed"><Input id="u-bed" inputMode="numeric" value={f.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} /></Field>
          <Field label="Bathrooms" htmlFor="u-bath"><Input id="u-bath" inputMode="numeric" value={f.bathrooms} onChange={(e) => set('bathrooms', e.target.value)} /></Field>
          <Field label="Parking" htmlFor="u-park"><Input id="u-park" inputMode="numeric" value={f.parking_bays} onChange={(e) => set('parking_bays', e.target.value)} /></Field>
        </div>
        <Field label="Size (m2)" htmlFor="u-size"><Input id="u-size" inputMode="decimal" value={f.size_sqm} onChange={(e) => set('size_sqm', e.target.value)} /></Field>
        <Field label="Floor" htmlFor="u-floor"><Input id="u-floor" inputMode="numeric" value={f.floor} onChange={(e) => set('floor', e.target.value)} /></Field>
      </div>
    </FormSheet>
  );
}
