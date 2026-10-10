'use client';

import { useEffect, useState } from 'react';
import { BellRing, Plus, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/common/field';
import { IconButton } from '@/components/common/icon-button';
import { useAccess } from '@/hooks/use-access';
import { useEstateSettings, useUpdateEstateSettings } from '@/hooks/use-settings';

interface Step { day: number; action: 'reminder' | 'call_list' | 'demand_letter' | 'escalate' }

const ACTIONS: { value: Step['action']; label: string; hint: string }[] = [
  { value: 'reminder', label: 'Reminder', hint: 'WhatsApp and email to the owner with the paybill and account' },
  { value: 'call_list', label: 'Call list', hint: 'The account appears on Collections, Call list' },
  { value: 'demand_letter', label: 'Demand letter', hint: 'A demand letter is issued and sent to the owner' },
  { value: 'escalate', label: 'Escalate', hint: 'Finance and the property manager are told' },
];

/** Must match maskani-api settings.DefaultArrearsSteps. */
const DEFAULT_STEPS: Step[] = [
  { day: 1, action: 'reminder' }, { day: 7, action: 'reminder' }, { day: 14, action: 'reminder' },
  { day: 30, action: 'call_list' }, { day: 45, action: 'demand_letter' }, { day: 60, action: 'escalate' },
];

/**
 * The collections ladder: what happens how many days after an owner's oldest unpaid bill fell due.
 * Each step runs once per debt, at most one a day, in working hours; a promise to pay holds back
 * the letter and escalation. Saving an empty ladder goes back to the default.
 */
export function ArrearsLadder() {
  const { can } = useAccess();
  const manage = can('settings.manage');
  const { data } = useEstateSettings<{ arrears_steps?: Step[] }>();
  const update = useUpdateEstateSettings();
  const saved = data?.arrears_steps?.length ? data.arrears_steps : DEFAULT_STEPS;
  const [steps, setSteps] = useState<Step[]>(saved);
  useEffect(() => { setSteps(data?.arrears_steps?.length ? data.arrears_steps : DEFAULT_STEPS); }, [data]);

  const sorted = [...steps].sort((a, b) => a.day - b.day);
  const days = steps.map((s) => s.day);
  const problem = steps.some((s) => !Number.isInteger(s.day) || s.day < 1 || s.day > 365) ? 'Days must be from 1 to 365.'
    : new Set(days).size !== days.length ? 'Two steps share a day.'
      : steps.length > 12 ? 'At most 12 steps.' : '';
  const dirty = JSON.stringify(sorted) !== JSON.stringify([...saved].sort((a, b) => a.day - b.day));
  const set = (i: number, patch: Partial<Step>) => setSteps((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BellRing className="h-4 w-4" aria-hidden /></span>
        <div>
          <h2 className="text-base font-semibold">Collections ladder</h2>
          <p className="text-sm text-muted-foreground">
            What happens how many days after an owner&apos;s oldest unpaid bill fell due. Each step runs once per debt, in working hours.
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Day</span>
            <Input type="number" inputMode="numeric" min={1} max={365} value={s.day} disabled={!manage} className="h-9 w-20"
              onChange={(e) => set(i, { day: Number(e.target.value) })} aria-label={`Step ${i + 1} day`} />
            <NativeSelect value={s.action} disabled={!manage} className="h-9 w-44" onChange={(e) => set(i, { action: e.target.value as Step['action'] })}
              aria-label={`Step ${i + 1} action`}>
              {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </NativeSelect>
            <span className="hidden flex-1 text-xs text-muted-foreground md:block">{ACTIONS.find((a) => a.value === s.action)?.hint}</span>
            {manage && <IconButton label="Remove this step" onClick={() => setSteps((x) => x.filter((_, j) => j !== i))}>×</IconButton>}
          </li>
        ))}
      </ul>
      {problem && <p className="mt-2 text-sm text-destructive" role="alert">{problem}</p>}
      {manage && (
        <div className="mt-4 flex flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={steps.length >= 12}
              onClick={() => setSteps((x) => [...x, { day: Math.min(365, (Math.max(0, ...x.map((y) => y.day)) || 0) + 7), action: 'reminder' }])}>
              <Plus /> Add step
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSteps(DEFAULT_STEPS)}><RotateCcw /> Default ladder</Button>
          </div>
          <Button size="sm" disabled={!dirty || !!problem || update.isPending} onClick={() => update.mutate({ arrears_steps: sorted })}>
            <Save /> {update.isPending ? 'Saving...' : 'Save ladder'}
          </Button>
        </div>
      )}
    </section>
  );
}
