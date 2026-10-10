'use client';

import { useState } from 'react';
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { IconButton } from '@/components/common/icon-button';
import { useAccess } from '@/hooks/use-access';
import { useApprovalRules, useRoles, useSaveApprovalRule } from '@/hooks/use-settings';
import { apiErrorMessage } from '@/lib/api/errors';
import type { ApprovalRule, ApprovalRuleInput } from '@/lib/api/types';
import { kes, num } from '@/lib/utils';

const ACTION: Record<ApprovalRule['action'], string> = { credit_note: 'Credit notes', adjustment: 'Waivers' };
const EMPTY: ApprovalRuleInput = { action: 'credit_note', min_amount: 0, max_amount: null, levels: 1, approver_roles: [], active: true };

/**
 * Who approves a credit note or waiver, by amount. Bands for one kind never overlap. With no rule
 * for an amount, one approval by anyone who may approve credits is enough; the requester never
 * approves their own.
 */
export function ApprovalRules() {
  const { can } = useAccess();
  const manage = can('settings.manage');
  const { data: rules = [] } = useApprovalRules();
  const { data: roles = [] } = useRoles();
  const { save, remove } = useSaveApprovalRule();
  const [editing, setEditing] = useState<{ id?: string; body: ApprovalRuleInput } | null>(null);
  const [error, setError] = useState('');
  const roleName = (code: string) => roles.find((r) => r.code === code)?.name ?? code;
  const staffRoles = roles.filter((r) => !r.code.includes('owner') && !r.code.includes('occupant') && !r.code.includes('vendor') && !r.code.includes('guard'));

  const b = editing?.body;
  const problem = !b ? '' : b.min_amount < 0 ? 'The band cannot start below zero.'
    : b.max_amount != null && b.max_amount < b.min_amount ? 'The top must be above the bottom.' : '';

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="h-4 w-4" aria-hidden /></span>
          <div>
            <h2 className="text-base font-semibold">Credit approvals</h2>
            <p className="text-sm text-muted-foreground">How many approvals a credit note or waiver needs, by amount, and whose. Without a rule, one approval.</p>
          </div>
        </div>
        {manage && <Button size="sm" variant="outline" onClick={() => { setError(''); setEditing({ body: EMPTY }); }}><Plus /> Add rule</Button>}
      </div>
      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rules yet: every credit takes one approval by someone who may approve credits.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {rules.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div className={r.active ? '' : 'opacity-60'}>
                <p className="font-medium">
                  {ACTION[r.action]} {r.max_amount != null ? `${kes(r.min_amount)} to ${kes(r.max_amount)}` : `from ${kes(r.min_amount)}`}
                  {!r.active && ' (off)'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.levels === 1 ? 'One approval' : `${r.levels} approvals by different people`}
                  {r.approver_roles?.length ? `, by ${r.approver_roles.map(roleName).join(' or ')}` : ''}
                </p>
              </div>
              {manage && (
                <div className="flex gap-1">
                  <IconButton label="Edit this rule" onClick={() => {
                    setError('');
                    setEditing({ id: r.id, body: { action: r.action, min_amount: num(r.min_amount), max_amount: r.max_amount == null ? null : num(r.max_amount), levels: r.levels, approver_roles: r.approver_roles ?? [], active: r.active } });
                  }}><Pencil /></IconButton>
                  <IconButton label="Remove this rule" disabled={remove.isPending} onClick={() => remove.mutate(r.id)}><Trash2 /></IconButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

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
            <Field label="Applies to" htmlFor="ar-action">
              <NativeSelect id="ar-action" value={b.action} onChange={(e) => setEditing({ ...editing!, body: { ...b, action: e.target.value as ApprovalRule['action'] } })}>
                <option value="credit_note">Credit notes</option>
                <option value="adjustment">Waivers</option>
              </NativeSelect>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From (KES)" htmlFor="ar-min">
                <Input id="ar-min" inputMode="decimal" value={b.min_amount} onChange={(e) => setEditing({ ...editing!, body: { ...b, min_amount: Number(e.target.value) || 0 } })} />
              </Field>
              <Field label="Up to (KES)" htmlFor="ar-max" hint="Empty for no top">
                <Input id="ar-max" inputMode="decimal" value={b.max_amount ?? ''}
                  onChange={(e) => setEditing({ ...editing!, body: { ...b, max_amount: e.target.value === '' ? null : Number(e.target.value) } })} />
              </Field>
            </div>
            <Field label="Approvals needed" htmlFor="ar-levels" hint="Each by a different person">
              <NativeSelect id="ar-levels" value={String(b.levels)} onChange={(e) => setEditing({ ...editing!, body: { ...b, levels: Number(e.target.value) } })}>
                <option value="1">One</option>
                <option value="2">Two</option>
                <option value="3">Three</option>
              </NativeSelect>
            </Field>
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Who may approve</legend>
              <p className="text-xs text-muted-foreground">None ticked: anyone who may approve credits.</p>
              {staffRoles.map((r) => (
                <label key={r.code} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={b.approver_roles.includes(r.code)}
                    onChange={(e) => setEditing({ ...editing!, body: { ...b, approver_roles: e.target.checked ? [...b.approver_roles, r.code] : b.approver_roles.filter((c) => c !== r.code) } })} />
                  {r.name}
                </label>
              ))}
            </fieldset>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Rule is on</span>
              <Switch checked={b.active} onCheckedChange={(v) => setEditing({ ...editing!, body: { ...b, active: v } })} />
            </label>
            {(problem || error) && <p className="text-sm text-destructive" role="alert">{problem || error}</p>}
          </div>
        )}
      </FormSheet>
    </section>
  );
}
