'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, ShieldCheck } from 'lucide-react';
import { useTenantBranding } from '@bengo-hub/shared-ui-lib/tenant';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { PushPrompt } from '@/components/portal/push-prompt';
import { useSlug } from '@/hooks/use-access';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { PageHeader } from '@/components/common/page-header';
import { PassCodeCard } from '@/components/common/pass-code-card';
import { StatusBadge } from '@/components/common/status-badge';
import { useCancelPortalPass, useCreatePortalPass, usePortalPasses, usePortalUnits } from '@/hooks/use-portal';
import type { PassType, VisitorPass } from '@/lib/api/types';
import { normalisePhone } from '@/lib/auth/api';
import { label, PASS_TYPE } from '@/lib/labels';
import { fmtDateTime } from '@/lib/utils';

/** datetime-local value in local time. */
function localInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const HOURS: Record<string, number> = { guest_single: 12, delivery: 2, guest_recurring: 24 * 30, domestic_staff: 24 * 90 };

export default function PortalVisitorsPage() {
  const slug = useSlug();
  const { tenant } = useTenantBranding();
  const { data: passes = [], isLoading } = usePortalPasses();
  const { data: units = [] } = usePortalUnits();
  const create = useCreatePortalPass();
  const cancel = useCancelPortalPass();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<VisitorPass | null>(null);
  const [cancelling, setCancelling] = useState<VisitorPass | null>(null);
  const owner = units.some((u) => u.link.role === 'owner' || u.link.role === 'joint_owner');
  const types = useMemo(() => (['guest_single', 'delivery', 'guest_recurring', ...(owner ? ['domestic_staff'] : [])] as PassType[]), [owner]);

  const [f, setF] = useState({ unit_id: '', pass_type: 'guest_single' as PassType, visitor_name: '', visitor_phone: '', vehicle_plate: '', from: '', to: '' });
  const openForm = () => {
    const now = new Date();
    setF({ unit_id: units[0]?.unit.id ?? '', pass_type: 'guest_single', visitor_name: '', visitor_phone: '', vehicle_plate: '', from: localInput(now), to: localInput(new Date(now.getTime() + 12 * 3600_000)) });
    setOpen(true);
  };
  // "Add a visitor" on the home opens the form here (?new=1), once, after the units load.
  const wantsNew = useSearchParams().get('new') === '1';
  const openRef = useRef(openForm);
  openRef.current = openForm;
  const autoOpened = useRef(false);
  useEffect(() => {
    if (wantsNew && !autoOpened.current && units.length > 0) {
      autoOpened.current = true;
      openRef.current();
    }
  }, [wantsNew, units.length]);
  const setType = (t: PassType) => {
    const start = f.from ? new Date(f.from) : new Date();
    setF({ ...f, pass_type: t, to: localInput(new Date(start.getTime() + (HOURS[t] ?? 12) * 3600_000)) });
  };
  const valid = f.unit_id && f.visitor_name.trim() && f.from && f.to && new Date(f.to) > new Date(f.from);

  const submit = () => {
    if (!valid) return;
    create.mutate({
      unit_id: f.unit_id, pass_type: f.pass_type, visitor_name: f.visitor_name.trim(),
      visitor_phone: f.visitor_phone.trim() ? normalisePhone(f.visitor_phone) : undefined,
      vehicle_plate: f.vehicle_plate.trim().toUpperCase() || undefined,
      valid_from: new Date(f.from).toISOString(), valid_to: new Date(f.to).toISOString(),
    }, { onSuccess: (p) => { setOpen(false); setCreated(p); } });
  };

  const active = passes.filter((p) => p.status === 'active' && new Date(p.valid_to) > new Date());
  const past = passes.filter((p) => !active.includes(p)).slice(0, 10);

  return (
    <div>
      <PageHeader title="Visitors" subtitle="Give each visitor a code for the gate" actions={<Button onClick={openForm} disabled={units.length === 0}><Plus /> New pass</Button>} />
      <PushPrompt slug={slug} className="mb-4" />
      {isLoading && <Skeleton className="h-40" />}
      {!isLoading && passes.length === 0 && <EmptyState icon={ShieldCheck} title="No passes yet" description="Create a pass and share the code with your visitor before they arrive." />}
      <div className="space-y-2">
        {active.map((p) => (
          <Card key={p.id} className="flex-row items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{p.visitor_name}</p>
              <p className="text-xs text-muted-foreground">{label(PASS_TYPE, p.pass_type)} · until {fmtDateTime(p.valid_to)}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setCancelling(p)}>Cancel</Button>
          </Card>
        ))}
      </div>
      {past.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-muted-foreground">Earlier passes</summary>
          <ul className="mt-2 divide-y rounded-lg border bg-card">
            {past.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="truncate">{p.visitor_name} <span className="text-xs text-muted-foreground">{fmtDateTime(p.valid_from)}</span></span>
                <StatusBadge status={new Date(p.valid_to) < new Date() && p.status === 'active' ? 'expired' : p.status} />
              </li>
            ))}
          </ul>
        </details>
      )}

      <FormSheet
        open={open}
        onOpenChange={setOpen}
        size="md"
        title="New visitor pass"
        footer={<>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!valid || create.isPending}>{create.isPending ? 'Creating...' : 'Create pass'}</Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {units.length > 1 && (
            <Field label="Unit" htmlFor="v-unit" className="sm:col-span-2">
              <NativeSelect id="v-unit" value={f.unit_id} onChange={(e) => setF({ ...f, unit_id: e.target.value })}>
                {units.map((u) => <option key={u.unit.id} value={u.unit.id}>{u.unit.code}</option>)}
              </NativeSelect>
            </Field>
          )}
          <Field label="Type" htmlFor="v-type" className="sm:col-span-2">
            <NativeSelect id="v-type" value={f.pass_type} onChange={(e) => setType(e.target.value as PassType)}>
              {types.map((t) => <option key={t} value={t}>{label(PASS_TYPE, t)}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Visitor name" htmlFor="v-name" required><Input id="v-name" value={f.visitor_name} onChange={(e) => setF({ ...f, visitor_name: e.target.value })} /></Field>
          <Field label="Visitor phone" htmlFor="v-phone" hint="To send them the code"><Input id="v-phone" type="tel" inputMode="tel" value={f.visitor_phone} onChange={(e) => setF({ ...f, visitor_phone: e.target.value })} /></Field>
          <Field label="Car plate" htmlFor="v-plate"><Input id="v-plate" value={f.vehicle_plate} onChange={(e) => setF({ ...f, vehicle_plate: e.target.value })} className="uppercase" /></Field>
          <div className="hidden sm:block" />
          <Field label="From" htmlFor="v-from"><Input id="v-from" type="datetime-local" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
          <Field label="Until" htmlFor="v-to"><Input id="v-to" type="datetime-local" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
        </div>
      </FormSheet>

      <FormSheet open={!!created} onOpenChange={(o) => !o && setCreated(null)} size="sm" title="Pass ready">
        {created && <PassCodeCard pass={created} estateName={tenant?.orgName ?? 'the estate'} />}
      </FormSheet>

      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(o) => !o && setCancelling(null)}
        variant="warning"
        title={`Cancel ${cancelling?.visitor_name ?? 'this'}'s pass?`}
        description="The code stops working at the gate straight away."
        confirmLabel="Cancel pass"
        cancelLabel="Keep it"
        loading={cancel.isPending}
        onConfirm={() => cancelling && cancel.mutate(cancelling.id, { onSuccess: () => setCancelling(null) })}
      />
    </div>
  );
}
