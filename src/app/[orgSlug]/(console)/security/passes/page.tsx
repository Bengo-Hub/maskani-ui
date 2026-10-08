'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { useTenantBranding } from '@bengo-hub/shared-ui-lib/tenant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { KeysetTable } from '@/components/common/keyset-table';
import { PageHeader } from '@/components/common/page-header';
import { PassCodeCard } from '@/components/common/pass-code-card';
import { PropertyRequired, usePropertyOrSingle } from '@/components/common/property-required';
import { StatusBadge } from '@/components/common/status-badge';
import { SearchInput } from '@/components/common/search-input';
import { useAccess } from '@/hooks/use-access';
import { useUnits } from '@/hooks/use-register';
import { useCreatePass, usePasses } from '@/hooks/use-security';
import type { PassType, VisitorPass } from '@/lib/api/types';
import { normalisePhone } from '@/lib/auth/api';
import { label, PASS_TYPE } from '@/lib/labels';
import { fmtDateTime } from '@/lib/utils';

function localInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function PassesPage() {
  const propertyId = usePropertyOrSingle();
  const { can } = useAccess();
  const { tenant } = useTenantBranding();
  const [active, setActive] = useState(true);
  const list = usePasses(propertyId, active);
  const create = useCreatePass();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<VisitorPass | null>(null);
  const [unitQ, setUnitQ] = useState('');
  const units = useUnits({ property_id: propertyId, q: unitQ });
  const [f, setF] = useState({ unit_id: '', pass_type: 'guest_single' as PassType, visitor_name: '', visitor_phone: '', vehicle_plate: '', from: '', to: '' });

  const openForm = () => {
    const now = new Date();
    setF({ unit_id: '', pass_type: 'guest_single', visitor_name: '', visitor_phone: '', vehicle_plate: '', from: localInput(now), to: localInput(new Date(now.getTime() + 12 * 3600_000)) });
    setUnitQ('');
    setOpen(true);
  };
  const valid = f.visitor_name.trim() && f.from && f.to && new Date(f.to) > new Date(f.from);

  const columns = useMemo<DataTableColumn<VisitorPass>[]>(() => [
    { key: 'name', header: 'Visitor', primary: true, accessor: (p) => p.visitor_name, render: (p) => <div><p className="font-medium">{p.visitor_name}</p><p className="text-xs text-muted-foreground">{label(PASS_TYPE, p.pass_type)}</p></div> },
    { key: 'unit', header: 'Unit', accessor: (p) => p.unit_code ?? '' },
    { key: 'window', header: 'Valid', hideBelow: 'md', accessor: (p) => p.valid_from, render: (p) => `${fmtDateTime(p.valid_from)} to ${fmtDateTime(p.valid_to)}` },
    { key: 'plate', header: 'Car', hideBelow: 'lg', accessor: (p) => p.vehicle_plate ?? '' },
    { key: 'status', header: 'Status', mobileAction: true, accessor: (p) => p.status ?? '', render: (p) => <StatusBadge status={p.status} /> },
  ], []);

  if (!propertyId) return <div className="mx-auto max-w-7xl"><PageHeader title="Visitor passes" /><PropertyRequired what="Visitor passes" /></div>;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Visitor passes"
        subtitle="Residents create most passes in their portal; staff can create one for a resident without a smartphone"
        actions={<>
          <NativeSelect className="w-36" value={active ? 'active' : 'all'} onChange={(e) => setActive(e.target.value === 'active')} aria-label="Show">
            <option value="active">Active</option>
            <option value="all">All</option>
          </NativeSelect>
          {can('gate.manage') && <Button onClick={openForm}><Plus /> New pass</Button>}
        </>}
      />
      <KeysetTable
        columns={columns}
        rows={list.rows}
        rowKey={(p) => p.id}
        loading={list.isLoading}
        error={list.isError}
        onRetry={() => void list.refetch()}
        hasMore={list.hasMore}
        loadMore={() => void list.loadMore()}
        loadingMore={list.loadingMore}
        emptyText="No passes."
      />
      <FormSheet
        open={open}
        onOpenChange={setOpen}
        size="lg"
        title="New visitor pass"
        footer={<>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={!valid || create.isPending}
            onClick={() => create.mutate({
              property_id: propertyId, unit_id: f.unit_id || undefined, pass_type: f.pass_type, visitor_name: f.visitor_name.trim(),
              visitor_phone: f.visitor_phone.trim() ? normalisePhone(f.visitor_phone) : undefined, vehicle_plate: f.vehicle_plate.trim().toUpperCase() || undefined,
              valid_from: new Date(f.from).toISOString(), valid_to: new Date(f.to).toISOString(),
            }, { onSuccess: (p) => { setOpen(false); setCreated(p); } })}
          >
            {create.isPending ? 'Creating...' : 'Create pass'}
          </Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Host unit" className="sm:col-span-2">
            <div className="space-y-2">
              <SearchInput value={unitQ} onSearch={setUnitQ} placeholder="Unit code, then Enter" className="sm:w-full" />
              {unitQ && (
                <NativeSelect value={f.unit_id} onChange={(e) => setF({ ...f, unit_id: e.target.value })} aria-label="Unit">
                  <option value="">No unit (estate visitor)</option>
                  {units.rows.map((u) => <option key={u.id} value={u.id}>{u.code} {u.owner_name ? `, ${u.owner_name}` : ''}</option>)}
                </NativeSelect>
              )}
            </div>
          </Field>
          <Field label="Type" htmlFor="sp-type">
            <NativeSelect id="sp-type" value={f.pass_type} onChange={(e) => setF({ ...f, pass_type: e.target.value as PassType })}>
              {Object.entries(PASS_TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Visitor name" htmlFor="sp-name" required><Input id="sp-name" value={f.visitor_name} onChange={(e) => setF({ ...f, visitor_name: e.target.value })} /></Field>
          <Field label="Visitor phone" htmlFor="sp-phone"><Input id="sp-phone" type="tel" value={f.visitor_phone} onChange={(e) => setF({ ...f, visitor_phone: e.target.value })} /></Field>
          <Field label="Car plate" htmlFor="sp-plate"><Input id="sp-plate" value={f.vehicle_plate} onChange={(e) => setF({ ...f, vehicle_plate: e.target.value })} className="uppercase" /></Field>
          <Field label="From" htmlFor="sp-from"><Input id="sp-from" type="datetime-local" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
          <Field label="Until" htmlFor="sp-to"><Input id="sp-to" type="datetime-local" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
        </div>
      </FormSheet>
      <FormSheet open={!!created} onOpenChange={(o) => !o && setCreated(null)} size="sm" title="Pass ready">
        {created && <PassCodeCard pass={created} estateName={tenant?.orgName ?? 'the estate'} />}
      </FormSheet>
    </div>
  );
}
