'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextField } from '@/components/common/rich-text';
import { CatalogueCombobox } from '@/components/common/catalogue-combobox';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { useSaveProperty } from '@/hooks/use-register';
import { USE_CASES } from '@/hooks/use-settings';
import type { PropertyInput } from '@/lib/api/register';
import type { Property } from '@/lib/api/types';

const EMPTY: PropertyInput = { code: '', name: '', property_type: 'estate', use_case: 'estate_developer', town: '', county: '', area: '', address: '', description: '' };

export function PropertyForm({ open, onOpenChange, property, onSaved }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  property?: Property;
  onSaved?: (p: Property) => void;
}) {
  const [form, setForm] = useState<PropertyInput>(EMPTY);
  const save = useSaveProperty(property?.id);

  useEffect(() => {
    if (!open) return;
    setForm(property ? {
      code: property.code, name: property.name, property_type: property.property_type ?? 'estate', use_case: property.use_case ?? 'estate_developer',
      town: property.town ?? '', county: property.county ?? '', area: property.area ?? '', address: property.address ?? '', description: property.description ?? '',
    } : EMPTY);
  }, [open, property]);

  const set = <K extends keyof PropertyInput>(k: K, v: PropertyInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.code.trim() && form.name.trim();

  const submit = () => {
    if (!valid) return;
    save.mutate({ ...form, code: form.code.trim().toUpperCase(), name: form.name.trim() }, {
      onSuccess: (p) => { onSaved?.(p); onOpenChange(false); },
    });
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={property ? 'Edit property' : 'New property'}
      description="An estate, apartment block or building. Each property gets its own outlet in Codevertex."
      footer={<>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={submit} disabled={!valid || save.isPending}>{save.isPending ? 'Saving...' : 'Save property'}</Button>
      </>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="p-name" required>
          <Input id="p-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Shaba Village" />
        </Field>
        <Field label="Code" htmlFor="p-code" required hint="Short code used in references, e.g. SHABA">
          <Input id="p-code" value={form.code} onChange={(e) => set('code', e.target.value)} disabled={!!property} className="uppercase" />
        </Field>
        <Field label="Type" htmlFor="p-type">
          <CatalogueCombobox id="p-type" kind="property_type" value={form.property_type} onChange={(v) => set('property_type', v)} placeholder="Estate" />
        </Field>
        <Field label="How it is run" htmlFor="p-use">
          <NativeSelect id="p-use" value={form.use_case} onChange={(e) => set('use_case', e.target.value)}>
            {USE_CASES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Area" htmlFor="p-area">
          <Input id="p-area" value={form.area} onChange={(e) => set('area', e.target.value)} placeholder="Syokimau" />
        </Field>
        <Field label="Town" htmlFor="p-town">
          <Input id="p-town" value={form.town} onChange={(e) => set('town', e.target.value)} />
        </Field>
        <Field label="County" htmlFor="p-county">
          <Input id="p-county" value={form.county} onChange={(e) => set('county', e.target.value)} placeholder="Machakos" />
        </Field>
        <Field label="Address" htmlFor="p-address">
          <Input id="p-address" value={form.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="Description" htmlFor="p-desc" className="sm:col-span-2">
          <RichTextField id="p-desc" value={form.description ?? ''} onChange={(v) => set('description', v)} placeholder="Shown on the marketplace listing as plain text" />
        </Field>
      </div>
    </FormSheet>
  );
}
