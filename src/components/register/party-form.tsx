'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { useSaveParty } from '@/hooks/use-register';
import type { PartyInput } from '@/lib/api/register';
import type { Party } from '@/lib/api/types';
import { normalisePhone } from '@/lib/auth/api';

const EMPTY: PartyInput = { kind: 'person', first_name: '', last_name: '', company_name: '', phone: '', email: '', national_id: '', kra_pin: '', is_diaspora: false, preferred_channel: 'whatsapp' };

/** Create or edit a person or company. ID number and KRA PIN are encrypted by the API and shown masked. */
export function PartyForm({ open, onOpenChange, party, onSaved }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  party?: Party;
  onSaved?: (p: Party) => void;
}) {
  const [f, setF] = useState<PartyInput>(EMPTY);
  const save = useSaveParty(party?.id);

  useEffect(() => {
    if (!open) return;
    setF(party ? {
      kind: party.kind, first_name: party.first_name ?? '', last_name: party.last_name ?? '', company_name: party.company_name ?? '',
      phone: party.phone ?? '', email: party.email ?? '', national_id: '', kra_pin: '', is_diaspora: !!party.is_diaspora,
      preferred_channel: party.preferred_channel ?? 'whatsapp',
    } : EMPTY);
  }, [open, party]);

  const set = <K extends keyof PartyInput>(k: K, v: PartyInput[K]) => setF((s) => ({ ...s, [k]: v }));
  const named = f.kind === 'company' ? !!f.company_name?.trim() : !!(f.first_name?.trim() || f.last_name?.trim());
  const valid = named && !!f.phone?.trim();

  const submit = () => {
    if (!valid) return;
    const body: PartyInput = {
      kind: f.kind,
      phone: normalisePhone(f.phone ?? ''),
      email: f.email?.trim() || undefined,
      is_diaspora: f.is_diaspora,
      preferred_channel: f.preferred_channel,
      ...(f.kind === 'company' ? { company_name: f.company_name?.trim() } : { first_name: f.first_name?.trim(), last_name: f.last_name?.trim() }),
      // Blank sensitive fields are left out so an edit never wipes a stored value.
      ...(f.national_id?.trim() ? { national_id: f.national_id.trim(), id_type: f.kind === 'company' ? 'company_reg' : 'national_id' } : {}),
      ...(f.kra_pin?.trim() ? { kra_pin: f.kra_pin.trim().toUpperCase() } : {}),
    };
    save.mutate(body, { onSuccess: (p) => { onSaved?.(p); onOpenChange(false); } });
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={party ? 'Edit details' : 'Add a person'}
      description="The phone number is how they sign in to the portal and receive bills on WhatsApp."
      footer={<>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={submit} disabled={!valid || save.isPending}>{save.isPending ? 'Saving...' : 'Save'}</Button>
      </>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="pt-kind" className="sm:col-span-2">
          <NativeSelect id="pt-kind" value={f.kind} onChange={(e) => set('kind', e.target.value as PartyInput['kind'])} disabled={!!party}>
            <option value="person">Person</option>
            <option value="company">Company</option>
          </NativeSelect>
        </Field>
        {f.kind === 'company' ? (
          <Field label="Company name" htmlFor="pt-co" required className="sm:col-span-2">
            <Input id="pt-co" value={f.company_name} onChange={(e) => set('company_name', e.target.value)} />
          </Field>
        ) : (
          <>
            <Field label="First name" htmlFor="pt-first" required><Input id="pt-first" value={f.first_name} onChange={(e) => set('first_name', e.target.value)} autoComplete="given-name" /></Field>
            <Field label="Last name" htmlFor="pt-last"><Input id="pt-last" value={f.last_name} onChange={(e) => set('last_name', e.target.value)} autoComplete="family-name" /></Field>
          </>
        )}
        <Field label="Phone" htmlFor="pt-phone" required hint="07..., or with country code for numbers abroad">
          <Input id="pt-phone" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" />
        </Field>
        <Field label="Email" htmlFor="pt-email" hint="Bills are also emailed when set">
          <Input id="pt-email" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
        </Field>
        <Field label={f.kind === 'company' ? 'Registration number' : 'National ID or passport'} htmlFor="pt-id" hint={party?.national_id_masked ? `On file: ${party.national_id_masked}. Leave blank to keep it.` : undefined}>
          <Input id="pt-id" value={f.national_id} onChange={(e) => set('national_id', e.target.value)} autoComplete="off" />
        </Field>
        <Field label="KRA PIN" htmlFor="pt-kra" hint={party?.kra_pin_masked ? `On file: ${party.kra_pin_masked}` : undefined}>
          <Input id="pt-kra" value={f.kra_pin} onChange={(e) => set('kra_pin', e.target.value)} autoComplete="off" className="uppercase" />
        </Field>
        <Field label="Preferred channel" htmlFor="pt-ch">
          <NativeSelect id="pt-ch" value={f.preferred_channel} onChange={(e) => set('preferred_channel', e.target.value)}>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </NativeSelect>
        </Field>
        <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm">
          Lives outside Kenya
          <Switch checked={!!f.is_diaspora} onCheckedChange={(v) => set('is_diaspora', v)} />
        </label>
      </div>
    </FormSheet>
  );
}
