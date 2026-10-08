'use client';

import { useState } from 'react';
import { Check, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { SearchInput } from '@/components/common/search-input';
import { useLinkParty, useParties } from '@/hooks/use-register';
import type { Party, PartyRole } from '@/lib/api/types';
import { PARTY_ROLE } from '@/lib/labels';
import { apiDate, cn, todayInput } from '@/lib/utils';
import { PartyForm } from './party-form';

const BILL_TO = [
  { code: 'service_charge', label: 'Service charge' },
  { code: 'water', label: 'Water' },
  { code: 'garbage', label: 'Garbage' },
  { code: 'extra_parking', label: 'Parking' },
];

const today = () => todayInput();

export function partyName(p?: Party | null): string {
  if (!p) return '';
  return p.display_name || p.company_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.phone || 'Unnamed';
}

/** Find (or add) a person, then link them to the unit with a role, start date and bill-to charges. */
export function LinkPartySheet({ open, onOpenChange, unitId, unitCode }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  unitId: string;
  unitCode: string;
}) {
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Party | null>(null);
  const [role, setRole] = useState<PartyRole>('owner');
  const [start, setStart] = useState(today);
  const [billTo, setBillTo] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const results = useParties(q);
  const link = useLinkParty(unitId);
  const occupantRole = role === 'occupant';

  const reset = () => { setQ(''); setPicked(null); setRole('owner'); setStart(today()); setBillTo([]); };
  const submit = () => {
    if (!picked) return;
    link.mutate(
      { party_id: picked.id, role, start_date: apiDate(start), is_primary: role === 'owner', ...(occupantRole && billTo.length ? { bill_to: billTo } : {}) },
      { onSuccess: () => { reset(); onOpenChange(false); } },
    );
  };

  return (
    <>
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
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput value={q} onSearch={setQ} placeholder="Name or phone, then Enter" className="sm:flex-1" />
            <Button variant="outline" onClick={() => setAdding(true)}><UserPlus /> New person</Button>
          </div>
          {q && (
            <ul className="max-h-56 divide-y overflow-y-auto rounded-lg border">
              {results.isLoading && <li className="px-3 py-2 text-sm text-muted-foreground">Searching...</li>}
              {!results.isLoading && results.rows.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Nobody found. Add them as a new person.</li>}
              {results.rows.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setPicked(p)} className={cn('flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted', picked?.id === p.id && 'bg-primary/5')}>
                    <span className="min-w-0"><span className="block truncate font-medium">{partyName(p)}</span><span className="text-xs text-muted-foreground">{p.phone}</span></span>
                    {picked?.id === p.id && <Check className="h-4 w-4 text-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {picked && <p className="rounded-lg bg-muted px-3 py-2 text-sm">Linking <strong>{partyName(picked)}</strong></p>}
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
      <PartyForm open={adding} onOpenChange={setAdding} onSaved={(p) => { setPicked(p); setQ(p.phone ?? ''); }} />
    </>
  );
}
