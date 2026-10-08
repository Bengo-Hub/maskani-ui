'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect } from '@/components/common/field';
import { useAccess, useSlug } from '@/hooks/use-access';
import { settingsApi } from '@/lib/api/operations';
import { qk } from '@/lib/query-keys';

interface Settings {
  billing_day?: number; due_day?: number; reading_window_start?: number; reading_window_end?: number;
  quiet_hours_start?: string; quiet_hours_end?: string; allocation_order?: string; water_loss_alert_pct?: number;
  portal_support_phone?: string; portal_support_email?: string; terms_version?: string;
}

const FIELDS: (keyof Settings)[] = ['billing_day', 'due_day', 'reading_window_start', 'reading_window_end', 'quiet_hours_start', 'quiet_hours_end', 'allocation_order', 'water_loss_alert_pct', 'portal_support_phone', 'portal_support_email', 'terms_version'];
const NUMERIC = new Set<keyof Settings>(['billing_day', 'due_day', 'reading_window_start', 'reading_window_end', 'water_loss_alert_pct']);

export function GeneralSettings() {
  const slug = useSlug();
  const qc = useQueryClient();
  const { can } = useAccess();
  const manage = can('settings.manage');
  const { data } = useQuery({ queryKey: qk.settings(slug), queryFn: () => settingsApi.settings(slug) as Promise<Settings> });
  const [f, setF] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!data) return;
    setF(Object.fromEntries(FIELDS.map((k) => [k, data[k] != null ? String(data[k]) : ''])));
  }, [data]);

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {};
      for (const k of FIELDS) {
        const v = (f[k] ?? '').trim();
        if (v === '' || v === String(data?.[k] ?? '')) continue;
        body[k] = NUMERIC.has(k) ? Number(v) : v;
      }
      return settingsApi.updateSettings(slug, body);
    },
    onSuccess: () => { toast.success('Settings saved'); void qc.invalidateQueries({ queryKey: qk.settings(slug) }); },
  });

  const input = (k: keyof Settings, labelText: string, hint?: string, type = 'text') => (
    <Field label={labelText} htmlFor={`st-${k}`} hint={hint}>
      <Input id={`st-${k}`} type={type} inputMode={NUMERIC.has(k) ? 'decimal' : undefined} value={f[k] ?? ''} disabled={!manage} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </Field>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {input('billing_day', 'Billing day', 'Day of the month bills are raised (1 to 28)')}
        {input('due_day', 'Due day', 'Day of the month bills fall due (1 to 28)')}
        {input('reading_window_start', 'Readings open', 'Day of the month')}
        {input('reading_window_end', 'Readings close', 'Day of the month')}
        {input('quiet_hours_start', 'Quiet hours from', 'No routine messages after this time', 'time')}
        {input('quiet_hours_end', 'Quiet hours until', undefined, 'time')}
        <Field label="Payments settle" htmlFor="st-alloc">
          <NativeSelect id="st-alloc" value={f.allocation_order ?? 'oldest_first'} disabled={!manage} onChange={(e) => setF({ ...f, allocation_order: e.target.value })}>
            <option value="oldest_first">Oldest bill first</option>
            <option value="priority">By charge priority</option>
          </NativeSelect>
        </Field>
        {input('water_loss_alert_pct', 'Water loss alert (%)', 'Warn the manager above this loss')}
        {input('portal_support_phone', 'Support phone for residents')}
        {input('portal_support_email', 'Support email for residents', undefined, 'email')}
        {input('terms_version', 'Resident terms version', 'Change it to ask every resident to accept again')}
      </div>
      {manage && <div className="flex justify-end"><Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save settings'}</Button></div>}
    </div>
  );
}
