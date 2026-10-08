'use client';

import { useMemo, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/common/page-header';
import { ToneBadge } from '@/components/common/status-badge';
import { FundForm } from '@/components/billing/fund-form';
import { RateForm } from '@/components/billing/rate-form';
import { useAccess } from '@/hooks/use-access';
import { useChargeTypes, useFunds, useUpdateChargeType } from '@/hooks/use-billing';
import { useProperties } from '@/hooks/use-register';
import type { ChargeRate, ChargeType, Fund } from '@/lib/api/types';
import { fmtDate, kes, num, titleCase } from '@/lib/utils';

const BASIS: Record<string, string> = {
  fixed: 'Fixed per unit', per_unit_type: 'By unit type', per_sqm: 'Per m2', entitlement: 'By entitlement',
  metered: 'Metered', percentage: 'Percentage', one_off: 'One off',
};

function rateText(r: ChargeRate, charge: ChargeType): string {
  if (r.tariff?.length) return r.tariff.map((b) => `${b.from}${b.to != null ? `-${b.to}` : '+'} m3 at ${kes(b.rate)}`).join(', ');
  if (charge.basis === 'metered') return `${kes(r.amount)} per m3${num(r.fixed_meter_charge) > 0 ? ` + ${kes(r.fixed_meter_charge)} fixed` : ''}`;
  if (charge.basis === 'percentage') return `${num(r.amount)}%`;
  if (charge.basis === 'per_sqm') return `${kes(r.amount)} per m2`;
  return kes(r.amount);
}

export default function ChargesPage() {
  const { can } = useAccess();
  const manage = can('billing.manage');
  const { data: charges = [], isLoading } = useChargeTypes();
  const { data: funds = [] } = useFunds();
  const { data: properties = [] } = useProperties();
  const update = useUpdateChargeType();
  const [rateFor, setRateFor] = useState<ChargeType | null>(null);
  const [fundEdit, setFundEdit] = useState<Fund | null>(null);
  const propName = useMemo(() => new Map(properties.map((p) => [p.id, p.name])), [properties]);
  const scopeText = (r: ChargeRate) =>
    r.scope === 'unit_type' ? titleCase(r.unit_type) : r.scope === 'property' ? propName.get(r.property_id ?? '') ?? 'One property' : r.scope === 'unit' ? 'One unit' : 'All units';

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Charges and funds" subtitle="What each unit is billed every month, and where the money goes" />

      <Card className="mb-5">
        <CardHeader><CardTitle>Funds</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {funds.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
                <div className="min-w-0">
                  <p className="font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.paybill_shortcode ? `Paybill ${f.paybill_shortcode}` : 'No paybill yet'} · account numbers like {f.account_prefix ?? ''}B07
                  </p>
                </div>
                {manage && <Button size="sm" variant="ghost" onClick={() => setFundEdit(f)}><Pencil /> Edit</Button>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {isLoading ? <Skeleton className="h-64" /> : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {charges.map((c) => (
            <Card key={c.id} className={c.active ? undefined : 'opacity-70'}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle>{c.name}</CardTitle>
                  <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    <ToneBadge>{BASIS[c.basis] ?? c.basis}</ToneBadge>
                    <ToneBadge>{titleCase(c.frequency)}</ToneBadge>
                    <ToneBadge tone="primary">{titleCase(c.fund_code)} fund</ToneBadge>
                  </p>
                </div>
                {manage && (
                  <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {c.active ? 'On' : 'Off'}
                    <Switch checked={c.active} onCheckedChange={(v) => update.mutate({ id: c.id, body: { active: v } })} />
                  </label>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {(c.rates ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rate set, so this charge is not billed.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {(c.rates ?? []).map((r) => (
                      <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-muted-foreground">{scopeText(r)}</span>
                        <span className="font-medium tabular">{rateText(r, c)} <span className="text-xs font-normal text-muted-foreground">from {fmtDate(r.effective_from)}</span></span>
                      </li>
                    ))}
                  </ul>
                )}
                {manage && c.active && <Button size="sm" variant="outline" onClick={() => setRateFor(c)}><Plus /> New rate</Button>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <RateForm charge={rateFor} onClose={() => setRateFor(null)} />
      <FundForm fund={fundEdit} onClose={() => setFundEdit(null)} />
    </div>
  );
}
