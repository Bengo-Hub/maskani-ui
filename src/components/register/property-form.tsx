'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RichTextField } from '@/components/common/rich-text';
import { CatalogueCombobox } from '@/components/common/catalogue-combobox';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { MODULE_INFO } from '@/components/settings/module-settings';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useSaveProperty } from '@/hooks/use-register';
import { USE_CASES, useModules } from '@/hooks/use-settings';
import type { PropertyInput } from '@/lib/api/register';
import type { Property } from '@/lib/api/types';
import { titleCase } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

const EMPTY: PropertyInput = { code: '', name: '', property_type: 'estate', use_case: 'estate_developer', town: '', county: '', area: '', address: '', description: '' };

export function PropertyForm({ open, onOpenChange, property, onSaved }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  property?: Property;
  onSaved?: (p: Property) => void;
}) {
  const slug = useSlug();
  const { me, can } = useAccess();
  const [form, setForm] = useState<PropertyInput>(EMPTY);
  // The modules this property uses, within the tenant's: null until the admin changes them.
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const save = useSaveProperty(property?.id);
  // A property's use case and modules decide what its staff see, so changing them on an existing
  // property takes settings.manage (the API refuses it otherwise).
  const settingsAdmin = can('settings.manage');
  const lockUseCase = !!property && !settingsAdmin;
  const { data: moduleState } = useModules();
  const tenantModules = me?.modules ?? [];

  useEffect(() => {
    if (!open) return;
    setPicked(null);
    setForm(property ? {
      code: property.code, name: property.name, property_type: property.property_type ?? 'estate', use_case: property.use_case ?? 'estate_developer',
      town: property.town ?? '', county: property.county ?? '', area: property.area ?? '', address: property.address ?? '', description: property.description ?? '',
    } : EMPTY);
  }, [open, property]);

  const set = <K extends keyof PropertyInput>(k: K, v: PropertyInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.code.trim() && form.name.trim();
  const current = picked ?? new Set(property ? (me?.property_modules?.[property.id] ?? tenantModules) : tenantModules);

  const changeUseCase = (v: string) => {
    set('use_case', v);
    // A new use case starts from its preset's modules (within the tenant's); the admin can adjust.
    const preset = moduleState?.presets?.[v];
    if (property && settingsAdmin && preset) setPicked(new Set(preset.filter((m) => tenantModules.includes(m))));
  };
  const toggle = (m: string, on: boolean) => {
    const next = new Set(current);
    if (on) next.add(m); else next.delete(m);
    setPicked(next);
  };

  const submit = () => {
    if (!valid) return;
    const body: PropertyInput = { ...form, code: form.code.trim().toUpperCase(), name: form.name.trim() };
    if (property && body.use_case === (property.use_case ?? 'estate_developer')) delete body.use_case;
    if (property && picked) body.module_overrides = Object.fromEntries(tenantModules.map((m) => [m, picked.has(m)]));
    save.mutate(body, {
      onSuccess: (p) => {
        // Navigation follows each property's modules from /auth/me.
        if (body.use_case || body.module_overrides) void useAuthStore.getState().refreshMe(slug);
        onSaved?.(p);
        onOpenChange(false);
      },
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
        <Field label="How it is run" htmlFor="p-use" hint={lockUseCase ? 'An administrator with settings access can change this.' : 'Decides which modules staff see at this property.'}>
          <NativeSelect id="p-use" value={form.use_case} onChange={(e) => changeUseCase(e.target.value)} disabled={lockUseCase}>
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

        {property && settingsAdmin && tenantModules.length > 0 && (
          <fieldset className="space-y-3 rounded-xl border p-4 sm:col-span-2">
            <legend className="px-1 text-sm font-semibold">Modules at this property</legend>
            <p className="text-xs text-muted-foreground">
              Staff working on this property see only these. Modules switched off for the whole company are not listed.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {tenantModules.map((m) => {
                const info = MODULE_INFO[m];
                return (
                  <li key={m}>
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{info?.label ?? titleCase(m)}</span>
                        {info?.hint && <span className="block truncate text-xs text-muted-foreground">{info.hint}</span>}
                      </span>
                      <Switch checked={current.has(m)} onCheckedChange={(v) => toggle(m, v)} disabled={m === 'properties'} aria-label={info?.label ?? m} />
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}
      </div>
    </FormSheet>
  );
}
