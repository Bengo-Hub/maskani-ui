'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { useLinkParty } from '@/hooks/use-register';
import type { Party, PartyRole } from '@/lib/api/types';
import { PARTY_ROLE } from '@/lib/labels';
import { apiDate, todayInput } from '@/lib/utils';
import { PartyPicker } from './party-picker';

export { partyName } from './party-picker';

const BILL_TO = [
  { code: 'service_charge', label: 'Service charge' },
  { code: 'water', label: 'Water' },
  { code: 'garbage', label: 'Garbage' },
  { code: 'extra_parking', label: 'Parking' },
];

/** Find (or add) a person, then link them to the unit with a role, start date and bill-to charges. */
export function LinkPartySheet({ open, onOpenChange, unitId, unitCode }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  unitId: string;
  unitCode: string;
}) {
  const [picked, setPicked] = useState<Party | null>(null);
  const [role, setRole] = useState<PartyRole>('owner');
  const [start, setStart] = useState(todayInput);
  const [billTo, setBillTo] = useState<string[]>([]);
  const link = useLinkParty(unitId);
  const occupantRole = role === 'occupant';

  const reset = () => { setPicked(null); setRole('owner'); setStart(todayInput()); setBillTo([]); };
  const submit = () => {
    if (!picked) return;
    link.mutate(
      { party_id: picked.id, role, start_date: apiDate(start), is_primary: role === 'owner', ...(occupantRole && billTo.length ? { bill_to: billTo } : {}) },
      { onSuccess: () => { reset(); onOpenChange(false); } },
    );
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}
      size="lg"
      title={`Link a person to ${unitCode}`}
      footer={<>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={submit} disabled={!picked || link.isPending}>{link.isPending ? 'Linking...' : 'Link to unit'}</Button>
      </>}
    >
      <div className="space-y-4">
        <PartyPicker value={picked} onChange={setPicked} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Role" htmlFor="lp-role">
            <NativeSelect id="lp-role" value={role} onChange={(e) => setRole(e.target.value as PartyRole)}>
              {Object.entries(PARTY_ROLE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </NativeSelect>
          </Field>
          <Field label="From" htmlFor="lp-start">
            <Input id="lp-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
        </div>
        {occupantRole && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Bills the occupant pays</legend>
            <p className="text-xs text-muted-foreground">Everything else stays with the owner.</p>
            <div className="grid grid-cols-2 gap-2">
              {BILL_TO.map((b) => (
                <label key={b.code} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                  <Checkbox
                    checked={billTo.includes(b.code)}
                    onCheckedChange={(v) => setBillTo((s) => (v ? [...s, b.code] : s.filter((x) => x !== b.code)))}
                  />
                  {b.label}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>
    </FormSheet>
  );
}
