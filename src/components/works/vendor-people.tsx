'use client';

import { useState } from 'react';
import { KeyRound, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { ToneBadge } from '@/components/common/status-badge';
import { useAddPersonnel, useSetGuardPin } from '@/hooks/use-works';
import type { VendorPersonnel } from '@/lib/api/types';
import { normalisePhone } from '@/lib/auth/api';

/** Agency staff with badges; guards need a 4 to 6 digit PIN to sign on at the gate tablet. */
export function VendorPeople({ vendorId, people, manage }: { vendorId: string; people: VendorPersonnel[]; manage: boolean }) {
  const add = useAddPersonnel(vendorId);
  const setPin = useSetGuardPin(vendorId);
  const [adding, setAdding] = useState(false);
  const [pinFor, setPinFor] = useState<VendorPersonnel | null>(null);
  const [f, setF] = useState({ full_name: '', role: 'guard', phone: '', badge_number: '' });
  const [pin, setPinValue] = useState('');

  return (
    <div className="space-y-3">
      {manage && <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => { setF({ full_name: '', role: 'guard', phone: '', badge_number: '' }); setAdding(true); }}><Plus /> Add person</Button></div>}
      {people.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No personnel recorded.</p> : (
        <ul className="divide-y rounded-lg border">
          {people.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{p.full_name} <span className="font-mono text-xs text-muted-foreground">{p.badge_number}</span></p>
                <p className="text-xs text-muted-foreground">{p.role}{p.phone ? ` · ${p.phone}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                {p.has_pin ? <ToneBadge tone="success">Gate PIN set</ToneBadge> : <ToneBadge>No gate PIN</ToneBadge>}
                {manage && <Button size="sm" variant="outline" onClick={() => { setPinValue(''); setPinFor(p); }}><KeyRound /> {p.has_pin ? 'Change PIN' : 'Set PIN'}</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <FormSheet
        open={adding}
        onOpenChange={setAdding}
        size="md"
        title="Add person"
        footer={<>
          <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          <Button
            disabled={!f.full_name.trim() || !f.badge_number.trim() || add.isPending}
            onClick={() => add.mutate({ full_name: f.full_name.trim(), role: f.role, phone: f.phone.trim() ? normalisePhone(f.phone) : undefined, badge_number: f.badge_number.trim().toUpperCase() }, { onSuccess: () => setAdding(false) })}
          >
            {add.isPending ? 'Saving...' : 'Add'}
          </Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="vp-name" required><Input id="vp-name" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></Field>
          <Field label="Badge number" htmlFor="vp-badge" required><Input id="vp-badge" value={f.badge_number} onChange={(e) => setF({ ...f, badge_number: e.target.value })} className="uppercase" /></Field>
          <Field label="Role" htmlFor="vp-role"><Input id="vp-role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} /></Field>
          <Field label="Phone" htmlFor="vp-phone"><Input id="vp-phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        </div>
      </FormSheet>
      <FormSheet
        open={!!pinFor}
        onOpenChange={(o) => !o && setPinFor(null)}
        size="sm"
        title={`Gate PIN for ${pinFor?.full_name ?? ''}`}
        description="Tell the guard the PIN in person. It is stored hashed and cannot be shown again."
        footer={<>
          <Button variant="outline" onClick={() => setPinFor(null)}>Cancel</Button>
          <Button disabled={!/^\d{4,6}$/.test(pin) || setPin.isPending} onClick={() => pinFor && setPin.mutate({ personnelId: pinFor.id, pin }, { onSuccess: () => setPinFor(null) })}>
            {setPin.isPending ? 'Saving...' : 'Save PIN'}
          </Button>
        </>}
      >
        <Field label="PIN (4 to 6 digits)" htmlFor="vp-pin">
          <Input id="vp-pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin} onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))} className="h-12 text-center font-mono text-xl tracking-[0.4em]" />
        </Field>
      </FormSheet>
    </div>
  );
}
