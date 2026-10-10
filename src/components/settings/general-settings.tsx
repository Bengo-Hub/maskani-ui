'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, Droplets, MessageSquare, Smartphone, Wallet, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Field, NativeSelect } from '@/components/common/field';
import { useAccess } from '@/hooks/use-access';
import { useEstateSettings, useUpdateEstateSettings } from '@/hooks/use-settings';
import { ArrearsLadder } from './arrears-ladder';
import { LateChargeSettings } from './late-charge';
import { ApprovalRules } from './approval-rules';

interface Settings {
  billing_day?: number; due_day?: number; reading_window_start?: number; reading_window_end?: number;
  quiet_hours_start?: string; quiet_hours_end?: string; allocation_order?: string; water_loss_alert_pct?: number;
  portal_support_phone?: string; portal_support_email?: string; terms_version?: string;
}

const FIELDS: (keyof Settings)[] = ['billing_day', 'due_day', 'reading_window_start', 'reading_window_end', 'quiet_hours_start', 'quiet_hours_end', 'allocation_order', 'water_loss_alert_pct', 'portal_support_phone', 'portal_support_email', 'terms_version'];
const NUMERIC = new Set<keyof Settings>(['billing_day', 'due_day', 'reading_window_start', 'reading_window_end', 'water_loss_alert_pct']);
const DAYS = new Set<keyof Settings>(['billing_day', 'due_day', 'reading_window_start', 'reading_window_end']);

function Group({ icon: Icon, title, hint, children }: { icon: LucideIcon; title: string; hint: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" aria-hidden /></span>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** The estate's working rules. Only changed fields are sent; a bar appears while there are changes. */
export function GeneralSettings() {
  const { can } = useAccess();
  const manage = can('settings.manage');
  const { data, isLoading } = useEstateSettings<Settings>();
  const update = useUpdateEstateSettings();
  const initial = useMemo(() => Object.fromEntries(FIELDS.map((k) => [k, data?.[k] != null ? String(data[k]) : ''])) as Record<string, string>, [data]);
  const [f, setF] = useState<Record<string, string>>({});
  useEffect(() => { if (data) setF(initial); }, [data, initial]);

  const changed = FIELDS.filter((k) => (f[k] ?? '').trim() !== (initial[k] ?? '').trim() && (f[k] ?? '').trim() !== '');
  const invalid = FIELDS.find((k) => {
    if (!DAYS.has(k) || !(f[k] ?? '').trim()) return false;
    const n = Number(f[k]);
    return !Number.isInteger(n) || n < 1 || n > 28;
  });

  const save = {
    isPending: update.isPending,
    mutate: () => {
      const body: Record<string, unknown> = {};
      for (const k of changed) body[k] = NUMERIC.has(k) ? Number(f[k]) : f[k].trim();
      update.mutate(body);
    },
  };

  if (isLoading) return <Skeleton className="h-96 w-full rounded-2xl" />;

  const input = (k: keyof Settings, labelText: string, hint?: string, type = 'text') => (
    <Field label={labelText} htmlFor={`st-${k}`} hint={hint} error={invalid === k ? 'Use a day from 1 to 28' : undefined}>
      <Input id={`st-${k}`} type={type} inputMode={NUMERIC.has(k) ? 'numeric' : undefined} value={f[k] ?? ''} disabled={!manage} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </Field>
  );

  return (
    <div className="space-y-4 pb-20">
      <Group icon={CalendarDays} title="Billing calendar" hint="When bills go out and when they fall due">
        {input('billing_day', 'Billing day', 'Day of the month bills are raised (1 to 28)')}
        {input('due_day', 'Due day', 'Day of the month bills fall due (1 to 28)')}
      </Group>
      <Group icon={Droplets} title="Meter readings" hint="The window caretakers read meters in, and when to flag water loss">
        {input('reading_window_start', 'Readings open', 'Day of the month')}
        {input('reading_window_end', 'Readings close', 'Day of the month')}
        {input('water_loss_alert_pct', 'Water loss alert (%)', 'Warn the manager when the bulk meter and unit meters differ by more')}
      </Group>
      <Group icon={Wallet} title="Payments" hint="How a payment is spread over what a unit owes">
        <Field label="Payments settle" htmlFor="st-alloc" hint="Oldest first clears arrears before new bills">
          <NativeSelect id="st-alloc" value={f.allocation_order || 'oldest_first'} disabled={!manage} onChange={(e) => setF({ ...f, allocation_order: e.target.value })}>
            <option value="oldest_first">Oldest bill first</option>
            <option value="priority">By charge priority</option>
          </NativeSelect>
        </Field>
      </Group>
      <ArrearsLadder />
      <LateChargeSettings />
      <ApprovalRules />
      <Group icon={MessageSquare} title="Messages" hint="Routine reminders wait until quiet hours end; urgent alerts always go">
        {input('quiet_hours_start', 'Quiet hours from', undefined, 'time')}
        {input('quiet_hours_end', 'Quiet hours until', undefined, 'time')}
      </Group>
      <Group icon={Smartphone} title="Resident portal" hint="What owners and residents see when they need help">
        {input('portal_support_phone', 'Support phone')}
        {input('portal_support_email', 'Support email', undefined, 'email')}
        {input('terms_version', 'Resident terms version', 'Change it to ask every resident to accept the terms again')}
      </Group>

      {manage && changed.length > 0 && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-sm">
          <p className="text-sm text-muted-foreground">{changed.length} unsaved {changed.length === 1 ? 'change' : 'changes'}</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setF(initial)} disabled={save.isPending}>Discard</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !!invalid}>{save.isPending ? 'Saving...' : 'Save changes'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
