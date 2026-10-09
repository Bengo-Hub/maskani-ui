'use client';

import { useEffect, useState } from 'react';
import { Blocks, Building2, DoorOpen, Droplets, Home, Megaphone, Receipt, Truck, Users, Wrench, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { NativeSelect } from '@/components/common/field';
import { useAccess } from '@/hooks/use-access';
import { USE_CASES, useModules, useSetModules } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';

export const MODULE_INFO: Record<string, { label: string; hint: string; icon: LucideIcon }> = {
  properties: { label: 'Properties and units', hint: 'Register, owners and residents', icon: Building2 },
  billing: { label: 'Billing and collections', hint: 'Charges, bills, paybill and M-Pesa', icon: Receipt },
  utilities: { label: 'Water meters', hint: 'Reading rounds and water balance', icon: Droplets },
  sales: { label: 'Unit sales', hint: 'Price lists, reservations, contracts and instalments', icon: Home },
  estate: { label: 'Estate services', hint: 'Owners association features', icon: Blocks },
  maintenance: { label: 'Repairs', hint: 'Work orders with response times', icon: Wrench },
  providers: { label: 'Vendors', hint: 'Security, cleaning and contractor records', icon: Truck },
  gate: { label: 'Gate and security', hint: 'Visitor passes, gate tablets and incidents', icon: DoorOpen },
  staff: { label: 'Estate staff', hint: 'Staff linked to ERP payroll', icon: Users },
  communication: { label: 'Notices', hint: 'Email and WhatsApp notices to residents', icon: Megaphone },
};

/** Switch modules on or off. The API checks dependencies and explains a refusal; the cards show them up front. */
export function ModuleSettings() {
  const { can } = useAccess();
  const manage = can('settings.manage');
  const { data, isLoading } = useModules();
  const set = useSetModules();
  const [enabled, setEnabled] = useState<string[]>([]);
  const [preset, setPreset] = useState('');
  useEffect(() => { if (data) setEnabled(data.enabled ?? []); }, [data]);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-2xl" />;

  const released = data?.released ? Object.keys(MODULE_INFO).filter((m) => data.released?.[m]) : Object.keys(MODULE_INFO);
  const deps = (data?.dependencies ?? {}) as Record<string, string[]>;
  const changed = JSON.stringify([...enabled].sort()) !== JSON.stringify([...(data?.enabled ?? [])].sort());
  const label = (m: string) => MODULE_INFO[m]?.label ?? m;

  return (
    <div className="space-y-4 pb-20">
      {manage && (
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <p className="text-sm font-semibold">Start from a preset</p>
            <p className="text-sm text-muted-foreground">Turns on the modules a typical estate of that kind uses. You can adjust them after.</p>
            <NativeSelect className="mt-2 sm:w-80" value={preset} onChange={(e) => setPreset(e.target.value)} aria-label="Preset">
              <option value="">Choose a preset</option>
              {USE_CASES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </NativeSelect>
          </div>
          <Button variant="outline" disabled={!preset || set.isPending} onClick={() => set.mutate({ preset })}>Apply preset</Button>
        </section>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {released.map((m) => {
          const info = MODULE_INFO[m];
          const Icon = info?.icon ?? Blocks;
          const on = enabled.includes(m);
          const needs = (deps[m] ?? []).filter((d) => d !== m);
          const missing = on ? needs.filter((d) => !enabled.includes(d)) : [];
          return (
            <li key={m} className={cn('flex gap-3 rounded-2xl border bg-card p-4 transition-colors', on && 'border-primary/30 bg-primary/5')}>
              <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', on ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{info?.label ?? m}</p>
                  <Switch
                    checked={on}
                    disabled={!manage}
                    aria-label={`${info?.label ?? m} on or off`}
                    onCheckedChange={(v) => setEnabled((s) => (v ? [...s, m] : s.filter((x) => x !== m)))}
                  />
                </div>
                <p className="text-sm text-muted-foreground">{info?.hint}</p>
                {needs.length > 0 && (
                  <p className={cn('mt-1.5 text-xs', missing.length ? 'font-medium text-destructive' : 'text-muted-foreground')}>
                    Needs {needs.map(label).join(' and ')}{missing.length ? ', which is off' : ''}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {manage && changed && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-sm">
          <p className="text-sm text-muted-foreground">Modules changed</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEnabled(data?.enabled ?? [])} disabled={set.isPending}>Discard</Button>
            <Button onClick={() => set.mutate({ modules: enabled })} disabled={set.isPending}>{set.isPending ? 'Saving...' : 'Save modules'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
