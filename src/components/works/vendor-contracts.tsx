'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, Pencil, Plus, XCircle } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CatalogueCombobox } from '@/components/common/catalogue-combobox';
import { Field, NativeSelect, TextArea } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { StatusBadge } from '@/components/common/status-badge';
import { useProperties } from '@/hooks/use-register';
import { useSaveContract, useTerminateContract } from '@/hooks/use-vendor-ops';
import type { FeeBasis, VendorContract, VendorContractInput } from '@/lib/api/types';
import { apiDate, fmtDate, kes, titleCase } from '@/lib/utils';
import { VisitPlans } from './visit-plans';

const FEE_BASIS: Record<FeeBasis, string> = {
  fixed_monthly: 'Fixed per month', per_visit: 'Per visit', per_post: 'Per guard post', rate_card: 'Rate card',
};

const day = (v?: string | null) => (v ? v.slice(0, 10) : '');

const blank = {
  property_id: '', contract_number: '', service_category: '', scope: '', fee_basis: 'fixed_monthly' as FeeBasis, fee_amount: '',
  starts_on: '', ends_on: '', renewal_notice_days: '30', auto_renew: false, budget_line_code: '',
  response_hours: '', resolution_hours: '', visits_per_month: '', missed_visit_credit: '',
};

const formOf = (c: VendorContract) => ({
  property_id: c.property_id, contract_number: c.contract_number ?? '', service_category: c.service_category, scope: c.scope ?? '',
  fee_basis: c.fee_basis, fee_amount: String(c.fee_amount ?? ''), starts_on: day(c.starts_on), ends_on: day(c.ends_on),
  renewal_notice_days: String(c.renewal_notice_days ?? 30), auto_renew: !!c.auto_renew, budget_line_code: c.budget_line_code ?? '',
  response_hours: c.sla?.response_hours ? String(c.sla.response_hours) : '', resolution_hours: c.sla?.resolution_hours ? String(c.sla.resolution_hours) : '',
  visits_per_month: c.sla?.visits_per_month ? String(c.sla.visits_per_month) : '',
  missed_visit_credit: String(c.service_credits?.find((s) => s.breach === 'missed_visit')?.percent ?? ''),
});

const n = (v: string) => (v.trim() === '' ? undefined : Number(v));

/**
 * A vendor's service contracts at the caller's properties: fee and how it is charged, the SLA,
 * the service credit for a missed visit, dates and renewal. Each live contract carries its visit
 * plans. Only a live contract can be changed; terminating one keeps the reason.
 */
export function VendorContracts({ vendorId, contracts, manage }: { vendorId: string; contracts: VendorContract[]; manage: boolean }) {
  const { data: properties = [] } = useProperties();
  const save = useSaveContract(vendorId);
  const terminate = useTerminateContract(vendorId);
  const [editing, setEditing] = useState<VendorContract | 'new' | null>(null);
  const [f, setF] = useState(blank);
  const [ending, setEnding] = useState<VendorContract | null>(null);
  const [reason, setReason] = useState('');
  const [plansFor, setPlansFor] = useState<VendorContract | null>(null);
  const propertyName = useMemo(() => new Map(properties.map((p) => [p.id, p.name])), [properties]);

  const open = (c: VendorContract | 'new') => { setF(c === 'new' ? blank : formOf(c)); setEditing(c); };
  const live = (c: VendorContract) => c.status === 'active' || c.status === 'draft';

  const columns: DataTableColumn<VendorContract>[] = [
    {
      key: 'service', header: 'Service', primary: true, accessor: (c) => c.service_category,
      render: (c) => (
        <div className="min-w-0">
          <p className="font-medium">{titleCase(c.service_category)}{c.contract_number ? ` · ${c.contract_number}` : ''}</p>
          <p className="text-xs text-muted-foreground">{propertyName.get(c.property_id) ?? 'Property'}</p>
        </div>
      ),
    },
    { key: 'fee', header: 'Fee', accessor: (c) => c.fee_amount, render: (c) => <span className="tabular-nums">{kes(c.fee_amount)} <span className="text-xs text-muted-foreground">{FEE_BASIS[c.fee_basis]}</span></span> },
    { key: 'period', header: 'Period', hideBelow: 'md', accessor: (c) => c.starts_on, render: (c) => `${fmtDate(c.starts_on)} to ${c.ends_on ? fmtDate(c.ends_on) : 'open ended'}` },
    { key: 'status', header: 'Status', accessor: (c) => c.status, render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'actions', header: '', mobileAction: true, exportable: false,
      render: (c) => (
        <div className="flex justify-end gap-1">
          {live(c) && <Button size="sm" variant="ghost" onClick={() => setPlansFor(c)} title="Visit plans"><CalendarClock /></Button>}
          {manage && live(c) && <Button size="sm" variant="ghost" onClick={() => open(c)} title="Edit"><Pencil /></Button>}
          {manage && live(c) && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setReason(''); setEnding(c); }} title="Terminate"><XCircle /></Button>}
        </div>
      ),
    },
  ];

  const valid = !!f.property_id && !!f.service_category && f.fee_amount !== '' && Number(f.fee_amount) >= 0 && !!f.starts_on && (!f.auto_renew || !!f.ends_on);
  const submit = () => {
    const body: VendorContractInput = {
      property_id: f.property_id, contract_number: f.contract_number.trim() || undefined, service_category: f.service_category,
      scope: f.scope.trim() || undefined, fee_basis: f.fee_basis, fee_amount: Number(f.fee_amount), starts_on: apiDate(f.starts_on),
      ends_on: f.ends_on ? apiDate(f.ends_on) : undefined, renewal_notice_days: n(f.renewal_notice_days), auto_renew: f.auto_renew,
      budget_line_code: f.budget_line_code.trim() || undefined,
      sla: { response_hours: n(f.response_hours), resolution_hours: n(f.resolution_hours), visits_per_month: n(f.visits_per_month) },
      service_credits: f.missed_visit_credit ? [{ breach: 'missed_visit', percent: Number(f.missed_visit_credit) }] : [],
    };
    save.mutate({ id: editing && editing !== 'new' ? editing.id : undefined, body }, { onSuccess: () => setEditing(null) });
  };

  return (
    <div className="space-y-3">
      {manage && <div className="flex justify-end"><Button size="sm" variant="outline" onClick={() => open('new')}><Plus /> Add contract</Button></div>}
      <DataTable columns={columns} rows={contracts} rowKey={(c) => c.id} emptyText="No service contracts yet." maxBodyHeight={false} />

      <FormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        size="lg"
        title={editing === 'new' ? 'New service contract' : 'Edit service contract'}
        footer={<>
          <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={submit} disabled={!valid || save.isPending}>{save.isPending ? 'Saving...' : 'Save'}</Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Property" htmlFor="vc-prop" required>
            <NativeSelect id="vc-prop" value={f.property_id} onChange={(e) => setF({ ...f, property_id: e.target.value })} disabled={editing !== 'new'}>
              <option value="">Choose the property</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Service" htmlFor="vc-cat" required>
            <CatalogueCombobox id="vc-cat" kind="wo_category" value={f.service_category} onChange={(v) => setF({ ...f, service_category: v })} placeholder="Cleaning, security, landscaping..." />
          </Field>
          <Field label="Contract number" htmlFor="vc-num"><Input id="vc-num" value={f.contract_number} onChange={(e) => setF({ ...f, contract_number: e.target.value })} /></Field>
          <Field label="Fee is charged" htmlFor="vc-basis">
            <NativeSelect id="vc-basis" value={f.fee_basis} onChange={(e) => setF({ ...f, fee_basis: e.target.value as FeeBasis })}>
              {Object.entries(FEE_BASIS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Fee (KES)" htmlFor="vc-fee" required><Input id="vc-fee" inputMode="decimal" value={f.fee_amount} onChange={(e) => setF({ ...f, fee_amount: e.target.value })} /></Field>
          <Field label="Budget line" htmlFor="vc-budget" hint="The service charge budget line this contract is paid from."><Input id="vc-budget" value={f.budget_line_code} onChange={(e) => setF({ ...f, budget_line_code: e.target.value })} /></Field>
          <Field label="Starts" htmlFor="vc-start" required><Input id="vc-start" type="date" value={f.starts_on} onChange={(e) => setF({ ...f, starts_on: e.target.value })} /></Field>
          <Field label="Ends" htmlFor="vc-end" hint="Leave empty for an open-ended contract."><Input id="vc-end" type="date" value={f.ends_on} onChange={(e) => setF({ ...f, ends_on: e.target.value })} /></Field>
          <Field label="Renewal notice (days)" htmlFor="vc-notice"><Input id="vc-notice" inputMode="numeric" value={f.renewal_notice_days} onChange={(e) => setF({ ...f, renewal_notice_days: e.target.value })} /></Field>
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" className="h-4 w-4" checked={f.auto_renew} onChange={(e) => setF({ ...f, auto_renew: e.target.checked })} /> Renews automatically (needs an end date)
          </label>
          <Field label="Respond within (hours)" htmlFor="vc-resp"><Input id="vc-resp" inputMode="numeric" value={f.response_hours} onChange={(e) => setF({ ...f, response_hours: e.target.value })} /></Field>
          <Field label="Fix within (hours)" htmlFor="vc-res"><Input id="vc-res" inputMode="numeric" value={f.resolution_hours} onChange={(e) => setF({ ...f, resolution_hours: e.target.value })} /></Field>
          <Field label="Visits per month" htmlFor="vc-vpm"><Input id="vc-vpm" inputMode="numeric" value={f.visits_per_month} onChange={(e) => setF({ ...f, visits_per_month: e.target.value })} /></Field>
          <Field label="Credit per missed visit (%)" htmlFor="vc-credit" hint="Taken off the fee for each visit not done."><Input id="vc-credit" inputMode="decimal" value={f.missed_visit_credit} onChange={(e) => setF({ ...f, missed_visit_credit: e.target.value })} /></Field>
          <Field label="Scope of work" htmlFor="vc-scope" className="sm:col-span-2"><TextArea id="vc-scope" rows={3} value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })} /></Field>
        </div>
      </FormSheet>

      <FormSheet
        open={!!ending}
        onOpenChange={(o) => !o && setEnding(null)}
        size="sm"
        title="Terminate the contract"
        description="No more visits are planned under it. The reason is kept with the contract."
        footer={<>
          <Button variant="outline" onClick={() => setEnding(null)}>Back</Button>
          <Button variant="destructive" disabled={!reason.trim() || terminate.isPending}
            onClick={() => ending && terminate.mutate({ id: ending.id, reason: reason.trim() }, { onSuccess: () => setEnding(null) })}>
            {terminate.isPending ? 'Terminating...' : 'Terminate'}
          </Button>
        </>}
      >
        <Field label="Reason" htmlFor="vc-why" required><TextArea id="vc-why" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </FormSheet>

      {plansFor && <VisitPlans contract={plansFor} manage={manage} onClose={() => setPlansFor(null)} />}
    </div>
  );
}
