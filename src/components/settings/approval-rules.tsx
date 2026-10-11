'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { IconButton } from '@/components/common/icon-button';
import { APPROVAL_MODULE, RULE_MODULES, useApproverName } from '@/components/approvals/approval-progress';
import { useAccess } from '@/hooks/use-access';
import { useApprovalRules, useRoles, useSaveApprovalRule } from '@/hooks/use-settings';
import { apiErrorMessage } from '@/lib/api/errors';
import type { ApprovalModule, ApprovalRuleInput } from '@/lib/api/types';
import { kes, num } from '@/lib/utils';

const DEFAULT_NOTE: Partial<Record<ApprovalModule, string>> = {
  credit_note: 'one approval by someone who approves credits',
  adjustment: 'one approval by someone who approves credits',
  manual_payment: 'one verification by a property manager, caretaker or administrator',
  work_order_quote: 'one approval by someone who manages works',
};

const EMPTY: ApprovalRuleInput = { module: 'credit_note', name: '', min_amount: 0, max_amount: null, steps: [{ name: '', approver_role: '' }], is_active: true };

/**
 * Approval rules for every workflow on the central approvals engine: an amount band and the
 * ordered steps, each naming the role that approves it. Bands for one workflow never overlap.
 * Without a rule a workflow uses its default. The person who sent something never approves it,
 * and one person approves one step.
 */
export function ApprovalRules() {
  const { can } = useAccess();
  const manage = can('settings.manage');
  const { data: rules = [] } = useApprovalRules();
  const { data: roles = [] } = useRoles();
  const approverName = useApproverName();
  const { save, remove } = useSaveApprovalRule();
  const [editing, setEditing] = useState<{ id?: string; body: ApprovalRuleInput } | null>(null);
  const [error, setError] = useState('');
  const staffRoles = roles.filter((r) => !['owner', 'occupant', 'vendor', 'guard'].some((k) => r.code.includes(k)));

  const b = editing?.body;
  const set = (patch: Partial<ApprovalRuleInput>) => editing && setEditing({ ...editing, body: { ...editing.body, ...patch } });
  const setStep = (i: number, patch: Partial<ApprovalRuleInput['steps'][number]>) =>
    b && set({ steps: b.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const move = (i: number, to: number) => {
    if (!b) return;
    const steps = [...b.steps];
    const [x] = steps.splice(i, 1);
    steps.splice(to, 0, x);
    set({ steps });
  };
  const problem = !b ? '' : b.min_amount < 0 ? 'The band cannot start below zero.'
    : b.max_amount != null && b.max_amount < b.min_amount ? 'The top must be above the bottom.'
      : b.steps.length === 0 ? 'Add at least one step.'
        : b.steps.some((s) => !s.approver_role) ? 'Choose the role for every step.' : '';

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="h-4 w-4" aria-hidden /></span>
          <div>
            <h2 className="text-base font-semibold">Approval rules</h2>
            <p className="text-sm text-muted-foreground">Who approves what, by amount, for every workflow that needs sign-off.</p>
          </div>
        </div>
        {manage && <Button size="sm" variant="outline" onClick={() => { setError(''); setEditing({ body: EMPTY }); }}><Plus /> Add rule</Button>}
      </div>
      <ul className="space-y-3">
        {RULE_MODULES.map((m) => {
          const mine = rules.filter((r) => r.module === m);
          return (
            <li key={m} className="rounded-xl border">
              <p className="border-b px-4 py-2 text-sm font-medium">{APPROVAL_MODULE[m]}</p>
              {mine.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">No rules: {DEFAULT_NOTE[m]}.</p>
              ) : (
                <ul className="divide-y">
                  {mine.map((r) => (
                    <li key={r.id} className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm ${r.is_active ? '' : 'opacity-60'}`}>
                      <div>
                        <p className="font-medium">
                          {r.name || (r.max_amount != null ? `${kes(r.min_amount)} to ${kes(r.max_amount)}` : `From ${kes(r.min_amount)}`)}
                          {!r.is_active && ' (off)'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.name ? `${r.max_amount != null ? `${kes(r.min_amount)} to ${kes(r.max_amount)}` : `from ${kes(r.min_amount)}`}: ` : ''}
                          {(r.steps ?? []).map((s) => approverName(s.approver_role, s.permission)).join(', then ')}
                        </p>
                      </div>
                      {manage && (
                        <div className="flex gap-1">
                          <IconButton label="Edit this rule" onClick={() => {
                            setError('');
                            setEditing({ id: r.id, body: { module: r.module, name: r.name, min_amount: num(r.min_amount), max_amount: r.max_amount == null ? null : num(r.max_amount),
                              steps: (r.steps ?? []).map((s) => ({ name: s.name, approver_role: s.approver_role ?? '' })), is_active: r.is_active } });
                          }}><Pencil /></IconButton>
                          <IconButton label="Remove this rule" disabled={remove.isPending} onClick={() => remove.mutate(r.id)}><Trash2 /></IconButton>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <FormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        size="md"
        title={editing?.id ? 'Edit approval rule' : 'Add approval rule'}
        footer={<>
          <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          <Button disabled={!!problem || save.isPending}
            onClick={() => editing && save.mutate(editing, { onSuccess: () => setEditing(null), onError: (e) => setError(apiErrorMessage(e)) })}>
            {save.isPending ? 'Saving...' : 'Save rule'}
          </Button>
        </>}
      >
        {b && (
          <div className="space-y-4">
            <Field label="Workflow" htmlFor="ar-module">
              <NativeSelect id="ar-module" value={b.module} onChange={(e) => set({ module: e.target.value as ApprovalModule })}>
                {RULE_MODULES.map((m) => <option key={m} value={m}>{APPROVAL_MODULE[m]}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Name" htmlFor="ar-name" hint="Optional, for example Large credits">
              <Input id="ar-name" maxLength={120} value={b.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From (KES)" htmlFor="ar-min">
                <Input id="ar-min" inputMode="decimal" value={b.min_amount} onChange={(e) => set({ min_amount: Number(e.target.value) || 0 })} />
              </Field>
              <Field label="Up to (KES)" htmlFor="ar-max" hint="Empty for no top">
                <Input id="ar-max" inputMode="decimal" value={b.max_amount ?? ''} onChange={(e) => set({ max_amount: e.target.value === '' ? null : Number(e.target.value) })} />
              </Field>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Steps, in order</legend>
              {b.steps.map((s, i) => (
                <div key={i} className="grid grid-cols-[1.5rem_1fr_1fr_auto] items-center gap-2">
                  <span className="text-sm text-muted-foreground">{i + 1}.</span>
                  <NativeSelect value={s.approver_role} onChange={(e) => setStep(i, { approver_role: e.target.value })} aria-label={`Step ${i + 1} role`}>
                    <option value="">Choose a role</option>
                    {staffRoles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                  </NativeSelect>
                  <Input placeholder="Label (optional)" value={s.name} onChange={(e) => setStep(i, { name: e.target.value })} aria-label={`Step ${i + 1} label`} />
                  <div className="flex">
                    <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp /></IconButton>
                    <IconButton label="Move down" disabled={i === b.steps.length - 1} onClick={() => move(i, i + 1)}><ArrowDown /></IconButton>
                    <IconButton label="Remove step" disabled={b.steps.length === 1} onClick={() => set({ steps: b.steps.filter((_, j) => j !== i) })}><X /></IconButton>
                  </div>
                </div>
              ))}
              {b.steps.length < 5 && (
                <Button size="sm" variant="ghost" onClick={() => set({ steps: [...b.steps, { name: '', approver_role: '' }] })}><Plus /> Add step</Button>
              )}
              <p className="text-xs text-muted-foreground">Each step needs a different person. Administrators can act on any step.</p>
            </fieldset>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Rule is on</span>
              <Switch checked={b.is_active} onCheckedChange={(v) => set({ is_active: v })} />
            </label>
            {(problem || error) && <p className="text-sm text-destructive" role="alert">{problem || error}</p>}
          </div>
        )}
      </FormSheet>
    </section>
  );
}
