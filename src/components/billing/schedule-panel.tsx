'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AlarmClock, CalendarClock, CheckCircle2, Droplets, Hourglass, PlayCircle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Field, NativeSelect } from '@/components/common/field';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useBillingSchedule, useBillingScheduleMutations, useFunds } from '@/hooks/use-billing';
import type { BillingSchedule, ScheduleStage } from '@/lib/api/types';
import { cn, fmtDate, periodLabel } from '@/lib/utils';

const STAGE: Record<ScheduleStage, { label: string; tone: string; icon: typeof CalendarClock }> = {
  off: { label: 'Automatic billing is off', tone: 'text-muted-foreground', icon: CalendarClock },
  scheduled: { label: 'Scheduled', tone: 'text-primary', icon: CalendarClock },
  collecting_readings: { label: 'Collecting meter readings', tone: 'text-warning-foreground', icon: Droplets },
  waiting_for_readings: { label: 'Waiting for meter readings', tone: 'text-warning-foreground', icon: Hourglass },
  ready_to_run: { label: 'Ready to run', tone: 'text-primary', icon: PlayCircle },
  due: { label: 'Starting within the hour', tone: 'text-primary', icon: AlarmClock },
  issued: { label: 'Bills issued', tone: 'text-success', icon: CheckCircle2 },
};

function stageText(s: BillingSchedule): string {
  const month = periodLabel(s.period);
  const day = fmtDate(s.billing_date);
  switch (s.stage) {
    case 'off': return `Switch it on and the ${month} bills run on ${day}, the estate's billing day.`;
    case 'scheduled': return `The ${month} bills ${s.mode === 'auto' ? 'run on their own' : 'are flagged to finance'} on ${day}.${s.metered ? ' Meter readings are all in.' : ''}`;
    case 'collecting_readings': return `The ${month} bills are due on ${day}. The caretaker and manager are reminded each day about the meters below.`;
    case 'waiting_for_readings': return `The ${month} bills were due on ${day} and wait for the meters below. They run as soon as the readings are in, or now without them.`;
    case 'ready_to_run': return `The ${month} bills are ready. Finance has been told; start the run when you are ready.`;
    case 'due': return `The ${month} bills start on their own within the hour.`;
    case 'issued': return `The ${month} bills have been issued.`;
  }
}

/**
 * A property's automatic billing: when it runs, what happens to meters without a reading, and
 * where this month's run stands. Changing it needs billing.manage; running without the missing
 * readings needs billing.run.
 */
export function SchedulePanel({ propertyId }: { propertyId: string }) {
  const slug = useSlug();
  const { can } = useAccess();
  const { data: s, isLoading } = useBillingSchedule(propertyId);
  const { data: funds = [] } = useFunds();
  const m = useBillingScheduleMutations(propertyId);
  const [confirm, setConfirm] = useState(false);
  const manage = can('billing.manage');

  if (isLoading) return <Skeleton className="mb-5 h-40 rounded-2xl" />;
  if (!s) return null;
  const st = STAGE[s.stage];
  const canSkip = can('billing.run') && (s.stage === 'waiting_for_readings' || s.stage === 'collecting_readings' || s.stage === 'ready_to_run');

  return (
    <section className="mb-5 space-y-4 rounded-2xl border bg-card p-5" aria-labelledby="sched-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 id="sched-title" className="flex items-center gap-2 font-semibold">
            <st.icon className={cn('h-5 w-5', st.tone)} /> Automatic billing
            <span className={cn('text-sm font-medium', st.tone)}>· {st.label}</span>
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">{stageText(s)}</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <Switch checked={s.enabled} disabled={!manage || m.save.isPending} onCheckedChange={(v) => m.save.mutate({ enabled: v })} aria-label="Automatic billing" />
          {s.enabled ? 'On' : 'Off'}
        </label>
      </div>

      {s.enabled && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="On the billing day" htmlFor="sched-mode">
            <NativeSelect id="sched-mode" value={s.mode} disabled={!manage} onChange={(e) => m.save.mutate({ mode: e.target.value as BillingSchedule['mode'] })}>
              <option value="auto">Run the bills</option>
              <option value="remind">Remind finance only</option>
            </NativeSelect>
          </Field>
          <Field label="Meters without a reading" htmlFor="sched-missing">
            <NativeSelect id="sched-missing" value={s.missing_readings} disabled={!manage} onChange={(e) => m.save.mutate({ missing_readings: e.target.value as BillingSchedule['missing_readings'] })}>
              <option value="wait">Wait and remind until recorded</option>
              <option value="skip">Bill without them</option>
            </NativeSelect>
          </Field>
          <Field label="Start reminding" htmlFor="sched-days">
            <NativeSelect id="sched-days" value={String(s.remind_days_before)} disabled={!manage} onChange={(e) => m.save.mutate({ remind_days_before: Number(e.target.value) })}>
              {[1, 2, 3, 5, 7, 10, 14].map((d) => <option key={d} value={d}>{d} {d === 1 ? 'day' : 'days'} before</option>)}
            </NativeSelect>
          </Field>
          <Field label="Fund" htmlFor="sched-fund">
            <NativeSelect id="sched-fund" value={s.fund} disabled={!manage} onChange={(e) => m.save.mutate({ fund: e.target.value })}>
              {funds.map((f) => <option key={f.id} value={f.code}>{f.name}</option>)}
              {!funds.some((f) => f.code === s.fund) && <option value={s.fund}>{s.fund}</option>}
            </NativeSelect>
          </Field>
        </div>
      )}

      {s.metered && s.missing_count > 0 && s.stage !== 'issued' && (
        <div className="space-y-2 rounded-xl bg-warning/10 p-4">
          <p className="text-sm font-medium">
            {s.missing_count} {s.missing_count === 1 ? 'meter has' : 'meters have'} no reading for {periodLabel(s.period)}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {s.missing.slice(0, 24).map((r) => (
              <li key={r.meter_id} className="rounded-full bg-background px-2.5 py-0.5 text-xs tabular" title={`Meter ${r.serial}`}>{r.unit_code || r.serial}</li>
            ))}
            {s.missing_count > 24 && <li className="px-1 text-xs text-muted-foreground">and {s.missing_count - 24} more</li>}
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href={`/${slug}/utilities/readings?period=${s.period}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}><Droplets /> Record readings</Link>
            {canSkip && <Button size="sm" onClick={() => setConfirm(true)}><PlayCircle /> Run now without them</Button>}
          </div>
        </div>
      )}
      {s.stage === 'ready_to_run' && can('billing.run') && s.missing_count === 0 && (
        <Button size="sm" onClick={() => m.approve.mutate(s.period)} disabled={m.approve.isPending}><PlayCircle /> Run the {periodLabel(s.period)} bills</Button>
      )}
      {s.run_id && (
        <Link href={`/${slug}/billing/runs/${s.run_id}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>Open the {periodLabel(s.period)} run</Link>
      )}

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Run the ${periodLabel(s.period)} bills now?`}
        description={`${s.missing_count} ${s.missing_count === 1 ? 'unit gets' : 'units get'} no water line this month; their use since the last reading is billed with next month's reading. Everything else is billed as usual.`}
        confirmLabel="Run without them"
        variant="warning"
        loading={m.approve.isPending}
        onConfirm={() => m.approve.mutate(s.period, { onSuccess: () => setConfirm(false) })}
      />
    </section>
  );
}
