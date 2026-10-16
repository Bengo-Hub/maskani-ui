'use client';

import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect, TextArea } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { ToneBadge } from '@/components/common/status-badge';
import { useSaveVisitPlan, useVisitPlans } from '@/hooks/use-vendor-ops';
import type { ServiceSchedule, VendorContract, VisitFrequency } from '@/lib/api/types';
import { cn, titleCase } from '@/lib/utils';

const FREQUENCY: Record<VisitFrequency, string> = {
  daily: 'Every day', weekly: 'On set weekdays', monthly: 'On set days each month', quarterly: 'Quarterly (Jan, Apr, Jul, Oct)', half_yearly: 'Half yearly (Jan, Jul)',
};
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const blank = { name: '', frequency: 'weekly' as VisitFrequency, days: [] as number[], monthDays: '', time_window: '', zone: '', checklist: '', active: true };

const formOf = (s: ServiceSchedule) => ({
  name: s.name, frequency: s.frequency, days: s.frequency === 'weekly' ? s.days ?? [] : [],
  monthDays: s.frequency === 'weekly' || s.frequency === 'daily' ? '' : (s.days ?? []).join(', '),
  time_window: s.time_window ?? '', zone: s.zone ?? '', checklist: (s.checklist ?? []).map((c) => c.item).join('\n'), active: s.active,
});

const describe = (s: ServiceSchedule) => {
  if (s.frequency === 'daily') return 'Every day';
  if (s.frequency === 'weekly') return (s.days ?? []).map((d) => WEEKDAYS[d]).join(', ') || 'No days set';
  return `${titleCase(s.frequency)} on day ${(s.days ?? []).join(', ')}`;
};

/**
 * The visit plans under one contract: when the vendor comes (a week of visits is planned ahead
 * each day) and the checklist they work through. A visit not recorded by its day becomes missed,
 * which is the evidence for service credits.
 */
export function VisitPlans({ contract, manage, onClose }: { contract: VendorContract; manage: boolean; onClose: () => void }) {
  const plans = useVisitPlans(contract.id);
  const save = useSaveVisitPlan(contract.id);
  const [editing, setEditing] = useState<ServiceSchedule | 'new' | null>(null);
  const [f, setF] = useState(blank);

  const open = (s: ServiceSchedule | 'new') => { setF(s === 'new' ? blank : formOf(s)); setEditing(s); };
  const days = f.frequency === 'weekly' ? f.days
    : f.frequency === 'daily' ? [] : f.monthDays.split(/[,\s]+/).filter(Boolean).map(Number).filter((d) => d >= 1 && d <= 28);
  const valid = !!f.name.trim() && (f.frequency === 'daily' || days.length > 0);
  const submit = () => save.mutate({
    id: editing && editing !== 'new' ? editing.id : undefined,
    body: {
      name: f.name.trim(), frequency: f.frequency, days, time_window: f.time_window.trim() || undefined, zone: f.zone.trim() || undefined,
      checklist: f.checklist.split('\n').map((l) => l.trim()).filter(Boolean).map((item) => ({ item })), active: f.active,
    },
  }, { onSuccess: () => setEditing(null) });

  return (
    <>
      <FormSheet
        open
        onOpenChange={(o) => !o && onClose()}
        size="md"
        title={`Visit plans: ${titleCase(contract.service_category)}`}
        description="Visits are planned a week ahead. One not recorded by its day is marked missed."
        footer={<Button variant="outline" onClick={onClose}>Close</Button>}
      >
        <div className="space-y-3">
          {manage && <Button size="sm" variant="outline" onClick={() => open('new')}><Plus /> Add visit plan</Button>}
          {plans.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {plans.data?.data.length === 0 && <p className="text-sm text-muted-foreground">No visit plans yet.</p>}
          <ul className="divide-y rounded-xl border">
            {(plans.data?.data ?? []).map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="font-medium">{s.name} {!s.active && <ToneBadge tone="neutral">Paused</ToneBadge>}</p>
                  <p className="text-xs text-muted-foreground">{[describe(s), s.time_window, s.zone].filter(Boolean).join(' · ')}</p>
                  {!!s.checklist?.length && <p className="text-xs text-muted-foreground">{s.checklist.length} checklist items</p>}
                </div>
                {manage && <Button size="sm" variant="ghost" onClick={() => open(s)} title="Edit"><Pencil /></Button>}
              </li>
            ))}
          </ul>
        </div>
      </FormSheet>

      <FormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        size="md"
        title={editing === 'new' ? 'New visit plan' : 'Edit visit plan'}
        footer={<>
          <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={submit} disabled={!valid || save.isPending}>{save.isPending ? 'Saving...' : 'Save'}</Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="vp-name" required className="sm:col-span-2"><Input id="vp-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Common areas cleaning" /></Field>
          <Field label="How often" htmlFor="vp-freq" className="sm:col-span-2">
            <NativeSelect id="vp-freq" value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value as VisitFrequency })}>
              {Object.entries(FREQUENCY).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </NativeSelect>
          </Field>
          {f.frequency === 'weekly' && (
            <div className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Weekdays</span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Weekdays">
                {WEEKDAYS.map((w, i) => {
                  const on = f.days.includes(i);
                  return (
                    <button key={w} type="button" aria-pressed={on}
                      onClick={() => setF({ ...f, days: on ? f.days.filter((d) => d !== i) : [...f.days, i].sort((a, b) => a - b) })}
                      className={cn('h-10 min-w-12 rounded-lg border px-3 text-sm', on ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                      {w}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {f.frequency !== 'weekly' && f.frequency !== 'daily' && (
            <Field label="Days of the month" htmlFor="vp-mdays" required className="sm:col-span-2" hint="1 to 28, separated by commas.">
              <Input id="vp-mdays" value={f.monthDays} onChange={(e) => setF({ ...f, monthDays: e.target.value })} placeholder="1, 15" />
            </Field>
          )}
          <Field label="Time window" htmlFor="vp-time"><Input id="vp-time" value={f.time_window} onChange={(e) => setF({ ...f, time_window: e.target.value })} placeholder="07:00 to 10:00" /></Field>
          <Field label="Zone" htmlFor="vp-zone"><Input id="vp-zone" value={f.zone} onChange={(e) => setF({ ...f, zone: e.target.value })} placeholder="Block A to C" /></Field>
          <Field label="Checklist" htmlFor="vp-check" className="sm:col-span-2" hint="One item per line.">
            <TextArea id="vp-check" rows={4} value={f.checklist} onChange={(e) => setF({ ...f, checklist: e.target.value })} placeholder={'Stairs mopped\nBins emptied'} />
          </Field>
          {editing !== 'new' && (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" className="h-4 w-4" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Active (pause to stop planning visits)
            </label>
          )}
        </div>
      </FormSheet>
    </>
  );
}
