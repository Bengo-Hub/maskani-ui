'use client';

import { useEffect, useState } from 'react';
import { Percent, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Field } from '@/components/common/field';
import { useAccess } from '@/hooks/use-access';
import { useFunds } from '@/hooks/use-billing';
import { useEstateSettings, useUpdateEstateSettings } from '@/hooks/use-settings';
import { kes } from '@/lib/utils';

interface LateCharge { enabled: boolean; percent: string; fixed: string; cap: string; grace_days: number; day: number; funds: string[] }

/** Must match maskani-api settings.DefaultLateCharge. */
const DEFAULT: LateCharge = { enabled: false, percent: '2', fixed: '0', cap: '0', grace_days: 30, day: 1, funds: ['estate'] };

/**
 * The late payment charge: off unless the estate's rules provide for it. Once a month each owing
 * account is charged a percent of what is past due (plus or instead of a fixed amount), at most
 * the cap. Earlier late charges never count, so it never compounds.
 */
export function LateChargeSettings() {
  const { can } = useAccess();
  const manage = can('settings.manage');
  const { data } = useEstateSettings<{ metadata?: { late_charge?: Partial<LateCharge> } }>();
  const { data: funds = [] } = useFunds();
  const update = useUpdateEstateSettings();
  const saved: LateCharge = { ...DEFAULT, ...(data?.metadata?.late_charge ?? {}) };
  const [f, setF] = useState<LateCharge>(saved);
  const savedJSON = JSON.stringify(saved);
  useEffect(() => { setF(JSON.parse(savedJSON) as LateCharge); }, [savedJSON]);

  const pct = Number(f.percent), fixed = Number(f.fixed), cap = Number(f.cap);
  const problem = !(pct >= 0 && pct <= 10) ? 'The percent must be from 0 to 10 a month.'
    : !(fixed >= 0) || !(cap >= 0) ? 'Amounts cannot be negative.'
      : f.enabled && pct === 0 && fixed === 0 ? 'Set a percent or a fixed amount.'
        : f.grace_days < 0 || f.grace_days > 180 ? 'Grace days must be from 0 to 180.'
          : f.day < 1 || f.day > 28 ? 'The day must be from 1 to 28.'
            : f.enabled && f.funds.length === 0 ? 'Choose at least one fund.' : '';
  const dirty = JSON.stringify(f) !== savedJSON;
  const example = Math.min(cap > 0 ? cap : Infinity, Math.round((10000 * pct) / 100 + fixed));

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Percent className="h-4 w-4" aria-hidden /></span>
          <div>
            <h2 className="text-base font-semibold">Late payment charge</h2>
            <p className="text-sm text-muted-foreground">Only where the estate&apos;s rules provide for it. Charged once a month on what is past due; never on earlier charges.</p>
          </div>
        </div>
        <Switch checked={f.enabled} disabled={!manage} onCheckedChange={(v) => setF({ ...f, enabled: v })} aria-label="Charge late payment" />
      </div>
      {f.enabled && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Percent of the overdue amount" htmlFor="lc-pct" hint="Per month, 0 to 10">
            <Input id="lc-pct" inputMode="decimal" value={f.percent} disabled={!manage} onChange={(e) => setF({ ...f, percent: e.target.value })} />
          </Field>
          <Field label="Fixed amount (KES)" htmlFor="lc-fixed" hint="Added to the percent; 0 for none">
            <Input id="lc-fixed" inputMode="decimal" value={f.fixed} disabled={!manage} onChange={(e) => setF({ ...f, fixed: e.target.value })} />
          </Field>
          <Field label="Most per month (KES)" htmlFor="lc-cap" hint="0 for no cap">
            <Input id="lc-cap" inputMode="decimal" value={f.cap} disabled={!manage} onChange={(e) => setF({ ...f, cap: e.target.value })} />
          </Field>
          <Field label="Grace days after the due date" htmlFor="lc-grace">
            <Input id="lc-grace" type="number" min={0} max={180} value={f.grace_days} disabled={!manage} onChange={(e) => setF({ ...f, grace_days: Number(e.target.value) })} />
          </Field>
          <Field label="Charge from day of the month" htmlFor="lc-day">
            <Input id="lc-day" type="number" min={1} max={28} value={f.day} disabled={!manage} onChange={(e) => setF({ ...f, day: Number(e.target.value) })} />
          </Field>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Funds</legend>
            {(funds.length ? funds : [{ id: 'estate', code: 'estate', name: 'Estate' }]).map((fd) => (
              <label key={fd.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-primary" disabled={!manage} checked={f.funds.includes(fd.code ?? '')}
                  onChange={(e) => setF({ ...f, funds: e.target.checked ? [...f.funds, fd.code ?? ''] : f.funds.filter((c) => c !== fd.code) })} />
                {fd.name}
              </label>
            ))}
          </fieldset>
        </div>
      )}
      {f.enabled && !problem && <p className="mt-3 text-sm text-muted-foreground">Example: {kes(10000)} past due is charged {kes(example)} that month.</p>}
      {problem && <p className="mt-2 text-sm text-destructive" role="alert">{problem}</p>}
      {manage && (
        <div className="mt-4 flex justify-end">
          <Button size="sm" disabled={!dirty || !!problem || update.isPending}
            onClick={() => update.mutate({ late_charge: { ...f, percent: String(pct), fixed: String(fixed), cap: String(cap) } })}>
            <Save /> {update.isPending ? 'Saving...' : 'Save late charge'}
          </Button>
        </div>
      )}
    </section>
  );
}
