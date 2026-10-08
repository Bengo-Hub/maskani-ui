'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { NativeSelect } from '@/components/common/field';
import { useAccess } from '@/hooks/use-access';
import { USE_CASES, useModules, useSetModules } from '@/hooks/use-settings';

const MODULE_LABEL: Record<string, { label: string; hint: string }> = {
  properties: { label: 'Properties and units', hint: 'Register, owners and residents' },
  billing: { label: 'Billing and collections', hint: 'Charges, bills, paybill and M-Pesa' },
  utilities: { label: 'Water meters', hint: 'Reading rounds and water balance' },
  sales: { label: 'Unit sales', hint: 'Price lists, reservations, contracts and instalments' },
  estate: { label: 'Estate services', hint: 'Owners association features' },
  maintenance: { label: 'Repairs', hint: 'Work orders with response times' },
  providers: { label: 'Vendors', hint: 'Security, cleaning and contractor records' },
  gate: { label: 'Gate and security', hint: 'Visitor passes, gate tablets and incidents' },
  staff: { label: 'Estate staff', hint: 'Staff linked to ERP payroll' },
  communication: { label: 'Notices', hint: 'WhatsApp and email notices' },
};

/** Switch modules on or off; dependencies are checked by the API and explained in its error. */
export function ModuleSettings() {
  const { can } = useAccess();
  const manage = can('settings.manage');
  const { data } = useModules();
  const set = useSetModules();
  const [enabled, setEnabled] = useState<string[]>([]);
  const [preset, setPreset] = useState('');
  useEffect(() => { if (data) setEnabled(data.enabled ?? []); }, [data]);

  const released = data?.released
    ? Object.keys(MODULE_LABEL).filter((m) => data.released?.[m])
    : Object.keys(MODULE_LABEL);
  const changed = JSON.stringify([...enabled].sort()) !== JSON.stringify([...(data?.enabled ?? [])].sort());

  return (
    <div className="space-y-5">
      {manage && (
        <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
          <span className="text-sm">Start from a preset:</span>
          <NativeSelect className="sm:w-72" value={preset} onChange={(e) => setPreset(e.target.value)} aria-label="Preset">
            <option value="">Choose a preset</option>
            {USE_CASES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </NativeSelect>
          <Button variant="outline" disabled={!preset || set.isPending} onClick={() => set.mutate({ preset })}>Apply preset</Button>
        </div>
      )}
      <ul className="divide-y rounded-lg border">
        {released.map((m) => (
          <li key={m} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium">{MODULE_LABEL[m]?.label ?? m}</p>
              <p className="text-xs text-muted-foreground">{MODULE_LABEL[m]?.hint}</p>
            </div>
            <Switch
              checked={enabled.includes(m)}
              disabled={!manage}
              onCheckedChange={(v) => setEnabled((s) => (v ? [...s, m] : s.filter((x) => x !== m)))}
            />
          </li>
        ))}
      </ul>
      {manage && changed && <div className="flex justify-end"><Button onClick={() => set.mutate({ modules: enabled })} disabled={set.isPending}>{set.isPending ? 'Saving...' : 'Save modules'}</Button></div>}
    </div>
  );
}
