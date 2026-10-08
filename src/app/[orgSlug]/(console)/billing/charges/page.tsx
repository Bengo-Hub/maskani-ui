'use client';

import { Suspense, useMemo, useState } from 'react';
import { AlertTriangle, Landmark, Library, Pencil, Plus, Receipt, ScrollText, Tags } from 'lucide-react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { PageHeader } from '@/components/common/page-header';
import { SearchInput } from '@/components/common/search-input';
import { SectionLayout, type Section } from '@/components/common/section-nav';
import { StatTile } from '@/components/common/stat-tile';
import { ToneBadge } from '@/components/common/status-badge';
import { ChargeForm } from '@/components/billing/charge-form';
import { FundForm } from '@/components/billing/fund-form';
import { RateForm } from '@/components/billing/rate-form';
import { useAccess } from '@/hooks/use-access';
import { useChargeCatalogue, useChargeTypes, useEnableChargeType, useFunds, useUpdateChargeType } from '@/hooks/use-billing';
import { useProperties } from '@/hooks/use-register';
import { useUrlParam } from '@/hooks/use-url-param';
import type { ChargeRate, ChargeType, Fund } from '@/lib/api/types';
import { CHARGE_BASIS, CHARGE_FREQUENCY, CHARGE_GROUP, RATE_SCOPE, label } from '@/lib/labels';
import { fmtDate, kes, num, titleCase } from '@/lib/utils';

const TABS = ['charges', 'rates', 'funds'] as const;
type Tab = (typeof TABS)[number];

function rateText(r: ChargeRate, charge: ChargeType): string {
  if (r.tariff?.length) return r.tariff.map((b) => `${b.from}${b.to != null ? `-${b.to}` : '+'} m3 at ${kes(b.rate)}`).join(', ');
  if (charge.basis === 'metered') return `${kes(r.amount)} per m3${num(r.fixed_meter_charge) > 0 ? ` + ${kes(r.fixed_meter_charge)} fixed` : ''}`;
  if (charge.basis === 'percentage') return `${num(r.amount)}%`;
  if (charge.basis === 'per_sqm') return `${kes(r.amount)} per m2`;
  return kes(r.amount);
}

interface RateRow extends ChargeRate { charge: ChargeType }

export default function ChargesPage() {
  return <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-7xl" />}><Charges /></Suspense>;
}

/** What units are billed (charge types), at what price from when (rates), and into which account (funds). */
function Charges() {
  const { can } = useAccess();
  const manage = can('billing.manage');
  const { data: charges = [], isLoading } = useChargeTypes();
  const { data: funds = [] } = useFunds();
  const { data: properties = [] } = useProperties();
  const update = useUpdateChargeType();
  const [tab, setTab] = useUrlParam<Tab>('tab', 'charges', TABS);
  const [q, setQ] = useUrlParam('q', '');
  const [group, setGroup] = useUrlParam('group', '');
  const [fundCode, setFundCode] = useUrlParam('fund', '');
  const [state, setState] = useUrlParam('state', '');
  const [rateFor, setRateFor] = useState<ChargeType | null>(null);
  const [editing, setEditing] = useState<ChargeType | null>(null);
  const [creating, setCreating] = useState(false);
  const [catalogue, setCatalogue] = useState(false);
  const [fundEdit, setFundEdit] = useState<Fund | null>(null);

  const propName = useMemo(() => new Map(properties.map((p) => [p.id, p.name])), [properties]);
  const fundName = useMemo(() => new Map(funds.map((f) => [f.code ?? '', f.name])), [funds]);
  const scopeText = (r: ChargeRate) =>
    r.scope === 'unit_type' ? titleCase(r.unit_type) : r.scope === 'property' ? propName.get(r.property_id ?? '') ?? 'One property' : label(RATE_SCOPE, r.scope);

  const active = charges.filter((c) => c.active);
  const noRate = active.filter((c) => (c.rates ?? []).length === 0);
  const noPaybill = funds.filter((f) => !f.paybill_shortcode);

  const shownCharges = useMemo(() => {
    const t = q.trim().toLowerCase();
    return charges.filter((c) =>
      (!t || `${c.name} ${c.code}`.toLowerCase().includes(t)) && (!group || c.charge_group === group) &&
      (!fundCode || c.fund_code === fundCode) &&
      (!state || (state === 'on' ? c.active : state === 'off' ? !c.active : c.active && (c.rates ?? []).length === 0)));
  }, [charges, q, group, fundCode, state]);

  const rateRows = useMemo<RateRow[]>(() => {
    const t = q.trim().toLowerCase();
    return charges.flatMap((c) => (c.rates ?? []).map((r) => ({ ...r, charge: c })))
      .filter((r) => (!t || r.charge.name.toLowerCase().includes(t)) && (!fundCode || r.charge.fund_code === fundCode));
  }, [charges, q, fundCode]);

  const chargeCols = useMemo<DataTableColumn<ChargeType>[]>(() => [
    {
      key: 'name', header: 'Charge', primary: true, accessor: (c) => c.name,
      render: (c) => (
        <div className="min-w-0">
          <p className="font-medium">{c.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{c.code}</p>
        </div>
      ),
    },
    { key: 'group', header: 'Group', hideBelow: 'lg', accessor: (c) => label(CHARGE_GROUP, c.charge_group) },
    { key: 'basis', header: 'Worked out', hideBelow: 'md', accessor: (c) => `${label(CHARGE_BASIS, c.basis)}, ${label(CHARGE_FREQUENCY, c.frequency ?? '').toLowerCase()}` },
    { key: 'fund', header: 'Fund', hideBelow: 'lg', accessor: (c) => fundName.get(c.fund_code ?? '') ?? titleCase(c.fund_code) },
    {
      key: 'rate', header: 'Current price', accessor: (c) => (c.rates?.[0] ? rateText(c.rates[0], c) : ''),
      render: (c) => {
        const rates = c.rates ?? [];
        if (!rates.length) return c.active ? <span className="inline-flex items-center gap-1 text-sm text-warning"><AlertTriangle className="h-3.5 w-3.5" /> No rate, not billed</span> : <span className="text-muted-foreground">None</span>;
        return <span className="text-sm">{rateText(rates[0], c)}{rates.length > 1 && <span className="text-xs text-muted-foreground"> and {rates.length - 1} more</span>}</span>;
      },
    },
    {
      key: 'active', header: 'Billed', accessor: (c) => (c.active ? 'On' : 'Off'),
      render: (c) => manage
        ? <Switch checked={c.active} aria-label={`${c.name} billed`} onCheckedChange={(v) => update.mutate({ id: c.id, body: { active: v } })} />
        : <ToneBadge tone={c.active ? 'success' : 'neutral'}>{c.active ? 'On' : 'Off'}</ToneBadge>,
    },
    ...(manage ? [{
      key: 'actions', header: '', mobileAction: true, accessor: () => '',
      render: (c: ChargeType) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setRateFor(c)} disabled={!c.active}><Plus /> Rate</Button>
          <Button size="sm" variant="ghost" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}><Pencil /></Button>
        </div>
      ),
    }] : []),
  ], [manage, update, fundName]);

  const rateCols = useMemo<DataTableColumn<RateRow>[]>(() => [
    { key: 'charge', header: 'Charge', primary: true, accessor: (r) => r.charge.name },
    { key: 'scope', header: 'Applies to', accessor: (r) => scopeText(r) },
    { key: 'amount', header: 'Price', accessor: (r) => rateText(r, r.charge) },
    { key: 'from', header: 'From', hideBelow: 'md', accessor: (r) => r.effective_from, render: (r) => fmtDate(r.effective_from) },
    { key: 'notes', header: 'Notes', hideBelow: 'lg', accessor: (r) => r.notes ?? '' },
    ...(manage ? [{
      key: 'actions', header: '', mobileAction: true, accessor: () => '',
      render: (r: RateRow) => <Button size="sm" variant="outline" onClick={() => setRateFor(r.charge)} disabled={!r.charge.active}>Change price</Button>,
    }] : []),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [manage, propName]);

  const fundCols = useMemo<DataTableColumn<Fund>[]>(() => [
    { key: 'name', header: 'Fund', primary: true, accessor: (f) => f.name, render: (f) => <div><p className="font-medium">{f.name}</p><p className="font-mono text-xs text-muted-foreground">{f.code}</p></div> },
    {
      key: 'paybill', header: 'Paybill', accessor: (f) => f.paybill_shortcode ?? '',
      render: (f) => f.paybill_shortcode ? <span className="tabular">{f.paybill_shortcode}</span> : <span className="inline-flex items-center gap-1 text-sm text-warning"><AlertTriangle className="h-3.5 w-3.5" /> Not set</span>,
    },
    { key: 'prefix', header: 'Account numbers', hideBelow: 'md', accessor: (f) => `${f.account_prefix ?? ''}B07`, render: (f) => <span className="font-mono text-sm">{f.account_prefix ?? ''}B07</span> },
    { key: 'charges', header: 'Charges', hideBelow: 'md', accessor: (f) => active.filter((c) => c.fund_code === f.code).length },
    { key: 'cc', header: 'Cost centre', hideBelow: 'lg', accessor: (f) => f.cost_center_code ?? '' },
    ...(manage ? [{ key: 'actions', header: '', mobileAction: true, accessor: () => '', render: (f: Fund) => <Button size="sm" variant="outline" onClick={() => setFundEdit(f)}><Pencil /> Edit</Button> }] : []),
  ], [manage, active]);

  const sections: Section<Tab>[] = [
    { value: 'charges', label: 'Charge types', icon: Tags, count: charges.length },
    { value: 'rates', label: 'Rates', icon: ScrollText, count: rateRows.length },
    { value: 'funds', label: 'Funds', icon: Landmark, count: funds.length },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Charges and funds"
        subtitle="What each unit is billed, at what price from when, and which account the money goes to."
        actions={manage && tab === 'charges' ? <>
          <Button variant="outline" onClick={() => setCatalogue(true)}><Library /> From the catalogue</Button>
          <Button onClick={() => setCreating(true)}><Plus /> New charge</Button>
        </> : undefined}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Receipt} label="Charges billed" value={active.length} loading={isLoading} />
        <StatTile icon={AlertTriangle} label="Billed but no rate" value={noRate.length} tone={noRate.length ? 'warning' : 'default'} loading={isLoading} />
        <StatTile icon={ScrollText} label="Rates in force" value={rateRows.length} loading={isLoading} />
        <StatTile icon={Landmark} label="Funds without a paybill" value={noPaybill.length} tone={noPaybill.length ? 'warning' : 'default'} />
      </div>

      <SectionLayout sections={sections} value={tab} onChange={(v) => setTab(v)}>
        <div className="space-y-3">
          {tab !== 'funds' && (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <SearchInput value={q} onSearch={(v) => setQ(v)} placeholder="Search charges" className="sm:max-w-xs" />
              {tab === 'charges' && (
                <>
                  <NativeSelect className="sm:w-44" value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Group">
                    <option value="">Any group</option>
                    {Object.entries(CHARGE_GROUP).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </NativeSelect>
                  <NativeSelect className="sm:w-44" value={state} onChange={(e) => setState(e.target.value)} aria-label="Billing">
                    <option value="">On and off</option>
                    <option value="on">Billed</option>
                    <option value="off">Switched off</option>
                    <option value="norate">Billed, no rate</option>
                  </NativeSelect>
                </>
              )}
              <NativeSelect className="sm:w-44" value={fundCode} onChange={(e) => setFundCode(e.target.value)} aria-label="Fund">
                <option value="">Any fund</option>
                {funds.map((f) => <option key={f.id} value={f.code ?? ''}>{f.name}</option>)}
              </NativeSelect>
            </div>
          )}
          {tab === 'charges' && <DataTable columns={chargeCols} rows={shownCharges} rowKey={(c) => c.id} loading={isLoading} emptyText="No charges match." storageKey="maskani-charges" />}
          {tab === 'rates' && <DataTable columns={rateCols} rows={rateRows} rowKey={(r) => r.id} loading={isLoading} emptyText="No rates yet. Add one from a charge." storageKey="maskani-rates" />}
          {tab === 'funds' && <DataTable columns={fundCols} rows={funds} rowKey={(f) => f.id} emptyText="No funds yet." storageKey="maskani-funds" />}
        </div>
      </SectionLayout>

      <RateForm charge={rateFor} onClose={() => setRateFor(null)} />
      <FundForm fund={fundEdit} onClose={() => setFundEdit(null)} />
      <ChargeForm open={creating || !!editing} charge={editing} onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }} />
      <CatalogueSheet open={catalogue} onOpenChange={setCatalogue} fundName={fundName} />
    </div>
  );
}

function CatalogueSheet({ open, onOpenChange, fundName }: { open: boolean; onOpenChange: (o: boolean) => void; fundName: Map<string, string> }) {
  const { data = [], isLoading } = useChargeCatalogue(open);
  const enable = useEnableChargeType();
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} size="lg" title="Add from the catalogue" description="Standard charges with sensible settings. Add one, then give it a rate.">
      {isLoading ? <Skeleton className="h-40 w-full" /> : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Every standard charge is already added.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {data.map((c) => (
            <li key={c.code} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {label(CHARGE_GROUP, c.charge_group)}, {label(CHARGE_BASIS, c.basis).toLowerCase()}, {label(CHARGE_FREQUENCY, c.frequency).toLowerCase()}, into {fundName.get(c.fund_code) ?? titleCase(c.fund_code)}
                </p>
              </div>
              <Button size="sm" variant="outline" disabled={enable.isPending} onClick={() => enable.mutate(c.code)}><Plus /> Add</Button>
            </li>
          ))}
        </ul>
      )}
    </FormSheet>
  );
}
