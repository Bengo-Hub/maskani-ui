'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Ban, Eye, Plus } from 'lucide-react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { useTenantBranding } from '@bengo-hub/shared-ui-lib/tenant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { IconButton } from '@/components/common/icon-button';
import { KeysetTable } from '@/components/common/keyset-table';
import { PageHeader } from '@/components/common/page-header';
import { PassCodeCard } from '@/components/common/pass-code-card';
import { PropertyRequired, usePropertyOrSingle } from '@/components/common/property-required';
import { StatusBadge } from '@/components/common/status-badge';
import { UnitPicker } from '@/components/register/unit-picker';
import { useAccess } from '@/hooks/use-access';
import { useCancelPass, useCreatePass, usePass, usePasses } from '@/hooks/use-security';
import type { PassType, VisitorPass } from '@/lib/api/types';
import { normalisePhone } from '@/lib/auth/api';
import { label, PASS_TYPE } from '@/lib/labels';
import { fmtDateTime } from '@/lib/utils';

function localInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const unitText = (p: VisitorPass) => [p.unit_code, p.block].filter(Boolean).join(', ');

export default function PassesPage() {
  const propertyId = usePropertyOrSingle();
  const { can } = useAccess();
  const manage = can('gate.manage');
  const { tenant } = useTenantBranding();
  const [active, setActive] = useState(true);
  const list = usePasses(propertyId, active);
  const create = useCreatePass();
  const cancel = useCancelPass();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<VisitorPass | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<VisitorPass | null>(null);
  const [f, setF] = useState({ unit_id: '', pass_type: 'guest_single' as PassType, visitor_name: '', visitor_phone: '', vehicle_plate: '', from: '', to: '' });

  const openForm = () => {
    const now = new Date();
    setF({ unit_id: '', pass_type: 'guest_single', visitor_name: '', visitor_phone: '', vehicle_plate: '', from: localInput(now), to: localInput(new Date(now.getTime() + 12 * 3600_000)) });
    setOpen(true);
  };
  const valid = f.visitor_name.trim() && f.from && f.to && new Date(f.to) > new Date(f.from);

  const columns = useMemo<DataTableColumn<VisitorPass>[]>(() => [
    { key: 'name', header: 'Visitor', primary: true, accessor: (p) => p.visitor_name, render: (p) => <div><p className="font-medium">{p.visitor_name}</p><p className="text-xs text-muted-foreground">{label(PASS_TYPE, p.pass_type)}</p></div> },
    { key: 'unit', header: 'Unit', accessor: (p) => p.unit_code ?? '', render: (p) => p.unit_code || <span className="text-muted-foreground">Estate</span> },
    { key: 'block', header: 'Block', hideBelow: 'md', accessor: (p) => p.block ?? '' },
    { key: 'window', header: 'Valid', hideBelow: 'md', accessor: (p) => p.valid_from, render: (p) => `${fmtDateTime(p.valid_from)} to ${fmtDateTime(p.valid_to)}` },
    { key: 'entries', header: 'Entries', align: 'right', hideBelow: 'lg', accessor: (p) => p.entries_used ?? 0, render: (p) => <span className="tabular">{p.entries_used ?? 0}{p.max_entries ? ` of ${p.max_entries}` : ''}</span> },
    { key: 'plate', header: 'Car', hideBelow: 'lg', accessor: (p) => p.vehicle_plate ?? '' },
    { key: 'status', header: 'Status', accessor: (p) => p.status ?? '', render: (p) => <StatusBadge status={p.status} /> },
    {
      key: 'actions', header: '', mobileAction: true, exportable: false, accessor: () => '',
      render: (p) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <IconButton label="View pass" onClick={() => setViewing(p.id)}><Eye /></IconButton>
          {manage && p.status === 'active' && <IconButton label="Cancel pass" onClick={() => setCancelling(p)}><Ban /></IconButton>}
        </div>
      ),
    },
  ], [manage]);

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
          {manage && <Button onClick={openForm}><Plus /> New pass</Button>}
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
        onRowClick={(p) => setViewing(p.id)}
        storageKey="maskani-passes"
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
          <Field label="Host unit" htmlFor="sp-unit" hint="The guard sees the unit and block when the code is entered. Leave empty for an estate visitor.">
            <UnitPicker id="sp-unit" propertyId={propertyId} value={f.unit_id} onChange={(unit_id) => setF({ ...f, unit_id })} placeholder="Estate visitor (no unit)" />
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
      <PassSheet
        id={viewing}
        onClose={() => setViewing(null)}
        onCancel={manage ? (p) => { setViewing(null); setCancelling(p); } : undefined}
      />
      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(o) => !o && setCancelling(null)}
        variant="warning"
        title={`Cancel ${cancelling?.visitor_name ?? 'this'}'s pass?`}
        description="The code stops working at the gate straight away. The pass stays in the list as cancelled."
        confirmLabel="Cancel pass"
        cancelLabel="Keep it"
        loading={cancel.isPending}
        onConfirm={() => cancelling && cancel.mutate(cancelling.id, { onSettled: () => setCancelling(null) })}
      />
    </div>
  );
}

/** One pass read fresh from `GET /visitor-passes/{id}`. The code itself is never shown again. */
function PassSheet({ id, onClose, onCancel }: { id: string | null; onClose: () => void; onCancel?: (p: VisitorPass) => void }) {
  const { data: p, isLoading } = usePass(id);
  const rows: [string, ReactNode][] = p ? [
    ['Type', label(PASS_TYPE, p.pass_type)],
    ['Unit', unitText(p) || 'Estate visitor'],
    ['Phone', p.visitor_phone || 'Not given'],
    ['Car', p.vehicle_plate || 'None'],
    ['Valid from', fmtDateTime(p.valid_from)],
    ['Valid until', fmtDateTime(p.valid_to)],
    ['Entries', `${p.entries_used ?? 0}${p.max_entries ? ` of ${p.max_entries}` : ''}`],
    ['Code ends in', p.code_hint || 'Not shown'],
    ['Created', fmtDateTime(p.created_at)],
  ] : [];

  return (
    <FormSheet
      open={!!id}
      onOpenChange={(o) => !o && onClose()}
      size="md"
      title={p ? p.visitor_name : 'Visitor pass'}
      description={p ? undefined : 'Loading...'}
      footer={<>
        {p && onCancel && p.status === 'active' && <Button variant="outline" onClick={() => onCancel(p)}><Ban /> Cancel pass</Button>}
        <Button onClick={onClose}>Close</Button>
      </>}
    >
      {isLoading || !p ? <Skeleton className="h-48" /> : (
        <div className="space-y-4">
          <StatusBadge status={p.status} />
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {rows.map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd>{v}</dd></div>)}
          </dl>
          {p.notes && <p className="rounded-lg bg-muted px-3 py-2 text-sm">{p.notes}</p>}
        </div>
      )}
    </FormSheet>
  );
}
