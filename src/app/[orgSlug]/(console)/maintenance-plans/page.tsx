'use client';

import { useMemo, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CatalogueCombobox } from '@/components/common/catalogue-combobox';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { PageHeader } from '@/components/common/page-header';
import { PropertyRequired, usePropertyOrSingle } from '@/components/common/property-required';
import { ToneBadge } from '@/components/common/status-badge';
import { useAccess } from '@/hooks/use-access';
import { useMaintenancePlans, useSaveMaintenancePlan } from '@/hooks/use-vendor-ops';
import { useVendors } from '@/hooks/use-works';
import type { MaintenanceFrequency, MaintenanceSchedule } from '@/lib/api/types';
import { apiDate, daysUntil, fmtDate, titleCase } from '@/lib/utils';

const FREQUENCY: Record<MaintenanceFrequency, string> = {
  weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', half_yearly: 'Every six months', annual: 'Yearly',
};

const blank = { title: '', category: '', frequency: 'quarterly' as MaintenanceFrequency, next_due_at: '', default_vendor_id: '', asset_ref: '', active: true };

/**
 * Preventive maintenance plans for the property: pumps, lifts, generators, fire equipment. A
 * work order is raised for each plan a week before it falls due, assigned to its default vendor,
 * and the plan moves on one period.
 */
export default function MaintenancePlansPage() {
  const { can } = useAccess();
  const manage = can('works.manage');
  const propertyId = usePropertyOrSingle();
  const plans = useMaintenancePlans(propertyId);
  const save = useSaveMaintenancePlan();
  const vendors = useVendors();
  const vendorName = useMemo(() => new Map(vendors.rows.map((v) => [v.id, v.name])), [vendors.rows]);
  const [editing, setEditing] = useState<MaintenanceSchedule | 'new' | null>(null);
  const [f, setF] = useState(blank);

  const open = (m: MaintenanceSchedule | 'new') => {
    setF(m === 'new' ? blank : {
      title: m.title, category: m.category, frequency: m.frequency, next_due_at: m.next_due_at.slice(0, 10),
      default_vendor_id: m.default_vendor_id ?? '', asset_ref: m.asset_ref ?? '', active: m.active,
    });
    setEditing(m);
  };

  const columns: DataTableColumn<MaintenanceSchedule>[] = [
    {
      key: 'title', header: 'Plan', primary: true, accessor: (m) => m.title,
      render: (m) => (
        <div className="min-w-0">
          <p className="font-medium">{m.title} {!m.active && <ToneBadge tone="neutral">Paused</ToneBadge>}</p>
          <p className="text-xs text-muted-foreground">{titleCase(m.category)}{m.asset_ref ? ` · ${m.asset_ref}` : ''}</p>
        </div>
      ),
    },
    { key: 'freq', header: 'How often', accessor: (m) => m.frequency, render: (m) => FREQUENCY[m.frequency] },
    {
      key: 'due', header: 'Next due', accessor: (m) => m.next_due_at,
      render: (m) => {
        const left = daysUntil(m.next_due_at);
        return <span className="flex items-center gap-2">{fmtDate(m.next_due_at)}{m.active && left !== null && left <= 7 && <ToneBadge tone={left < 0 ? 'danger' : 'warning'}>{left < 0 ? 'Overdue' : 'Due this week'}</ToneBadge>}</span>;
      },
    },
    { key: 'vendor', header: 'Vendor', hideBelow: 'md', accessor: (m) => (m.default_vendor_id ? vendorName.get(m.default_vendor_id) ?? '' : ''), render: (m) => (m.default_vendor_id ? vendorName.get(m.default_vendor_id) ?? 'Vendor' : 'Assign when raised') },
    { key: 'actions', header: '', mobileAction: true, exportable: false, render: (m) => manage ? <Button size="sm" variant="ghost" onClick={() => open(m)} title="Edit"><Pencil /></Button> : null },
  ];

  const valid = !!f.title.trim() && !!f.category && !!f.next_due_at;
  const submit = () => save.mutate({
    id: editing && editing !== 'new' ? editing.id : undefined,
    body: {
      property_id: propertyId, title: f.title.trim(), category: f.category, frequency: f.frequency, next_due_at: apiDate(f.next_due_at),
      default_vendor_id: f.default_vendor_id || null, asset_ref: f.asset_ref.trim() || undefined, active: f.active,
    },
  }, { onSuccess: () => setEditing(null) });

  if (!propertyId) return <div className="mx-auto max-w-7xl"><PageHeader title="Preventive maintenance" /><PropertyRequired what="Maintenance plans" /></div>;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Preventive maintenance"
        subtitle="A work order is raised a week before each plan falls due"
        actions={manage ? <Button onClick={() => open('new')}><Plus /> New plan</Button> : undefined}
      />
      <DataTable
        columns={columns}
        rows={plans.data?.data ?? []}
        rowKey={(m) => m.id}
        loading={plans.isLoading}
        emptyText="No maintenance plans yet. Add the equipment that needs regular servicing."
        exportFileName="maintenance-plans"
      />
      <FormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        size="md"
        title={editing === 'new' ? 'New maintenance plan' : 'Edit maintenance plan'}
        footer={<>
          <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={submit} disabled={!valid || save.isPending}>{save.isPending ? 'Saving...' : 'Save'}</Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="What is serviced" htmlFor="mp-title" required className="sm:col-span-2"><Input id="mp-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Service the borehole pump" /></Field>
          <Field label="Kind of work" htmlFor="mp-cat" required>
            <CatalogueCombobox id="mp-cat" kind="wo_category" value={f.category} onChange={(v) => setF({ ...f, category: v })} placeholder="Choose" />
          </Field>
          <Field label="How often" htmlFor="mp-freq">
            <NativeSelect id="mp-freq" value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value as MaintenanceFrequency })}>
              {Object.entries(FREQUENCY).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Next due" htmlFor="mp-due" required><Input id="mp-due" type="date" value={f.next_due_at} onChange={(e) => setF({ ...f, next_due_at: e.target.value })} /></Field>
          <Field label="Vendor" htmlFor="mp-vendor" hint="The work order is assigned to this vendor.">
            <NativeSelect id="mp-vendor" value={f.default_vendor_id} onChange={(e) => setF({ ...f, default_vendor_id: e.target.value })}>
              <option value="">Assign when raised</option>
              {vendors.rows.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Asset reference" htmlFor="mp-asset" className="sm:col-span-2" hint="Serial or tag number, when the asset has one."><Input id="mp-asset" value={f.asset_ref} onChange={(e) => setF({ ...f, asset_ref: e.target.value })} /></Field>
          {editing !== 'new' && (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" className="h-4 w-4" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Active (pause to stop raising work orders)
            </label>
          )}
        </div>
      </FormSheet>
    </div>
  );
}
