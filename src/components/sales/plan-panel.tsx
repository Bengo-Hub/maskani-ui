'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarClock, KeyRound, Send } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect, TextArea } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { StatusBadge } from '@/components/common/status-badge';
import { InstalmentSchedule } from '@/components/sales/instalment-schedule';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useContractPlans, usePlanAcceptance, useRestructure } from '@/hooks/use-sales';
import { apiErrorMessage } from '@/lib/api/errors';
import type { PlanVersion, RestructureInput, SaleContract } from '@/lib/api/types';
import { fmtDate, fmtDateTime, kes, num, todayInput } from '@/lib/utils';

const EMPTY: RestructureInput = { reason: '', option: 'instalments', frequency: 'monthly', term_months: 12, first_due: '' };

/** What a plan version is waiting on, in words. */
function waitingOn(p: PlanVersion): string {
  if (p.status !== 'proposed') return '';
  return p.approved_at ? 'Approved. Waiting for the buyer to accept.' : 'Waiting for approval.';
}

/**
 * Payment plan versions of one sale. Staff propose a new plan for what is not yet billed (it goes to
 * the approvals inbox), and once approved the buyer accepts it in the portal or reads back a code at
 * the office. Billed lines from earlier versions stay on the plan.
 */
export function PlanPanel({ contract }: { contract: SaleContract }) {
  const slug = useSlug();
  const { can } = useAccess();
  const manage = can('sales.manage');
  const { data: plans = [] } = useContractPlans(contract.id);
  const restructure = useRestructure(contract.id);
  const { send, accept } = usePlanAcceptance(contract.id);
  const [form, setForm] = useState<RestructureInput | null>(null);
  const [error, setError] = useState('');
  const [codeFor, setCodeFor] = useState<PlanVersion | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const proposed = plans.find((p) => p.status === 'proposed');
  const history = plans.filter((p) => p.status !== 'active');
  // What a new plan would cover: the active plan's lines not yet billed (the API sums the same lines).
  const unbilled = (contract.instalments ?? []).filter((i) => i.status === 'scheduled').reduce((t, i) => t + num(i.amount), 0);
  const canPropose = manage && !proposed && unbilled > 0 && (contract.status === 'active' || contract.status === 'in_default');
  const termOk = (n?: number) => !!n && n >= 1 && n <= 240;

  const submit = () => {
    if (!form) return;
    setError('');
    const body: RestructureInput = form.option === 'outright'
      ? { reason: form.reason.trim(), option: 'outright', first_due: form.first_due }
      : { ...form, reason: form.reason.trim(), term_months: Number(form.term_months) || 0 };
    restructure.mutate(body, { onSuccess: () => setForm(null), onError: (e) => setError(apiErrorMessage(e)) });
  };

  const takeCode = () => {
    if (!codeFor) return;
    setCodeError('');
    accept.mutate({ planId: codeFor.id, code }, {
      onSuccess: () => { setCodeFor(null); setCode(''); },
      onError: (e) => setCodeError(apiErrorMessage(e)),
    });
  };

  if (!canPropose && plans.length <= 1) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Payment plan changes</CardTitle>
        {canPropose && (
          <Button size="sm" variant="outline" onClick={() => { setError(''); setForm({ ...EMPTY, first_due: todayInput() }); }}>
            <CalendarClock /> Propose a new plan
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {proposed && (
          <div className="space-y-3 rounded-lg border border-warning/40 bg-warning/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Version {proposed.version}: {kes(proposed.total)} over {proposed.instalments.length} payment{proposed.instalments.length === 1 ? '' : 's'}</p>
              <StatusBadge status={proposed.approved_at ? 'approved' : 'proposed'} label={proposed.approved_at ? 'Approved' : 'Waiting for approval'} />
            </div>
            {proposed.reason && <p className="text-sm text-muted-foreground">{proposed.reason}</p>}
            <p className="text-xs text-muted-foreground">
              {waitingOn(proposed)} Proposed by {proposed.metadata?.proposed_by_name || 'staff'} on {fmtDate(proposed.created_at)}.
            </p>
            <InstalmentSchedule instalments={proposed.instalments} />
            <div className="flex flex-wrap gap-2">
              {!proposed.approved_at && <Link href={`/${slug}/approvals?tab=pending&module=restructure`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Open in approvals</Link>}
              {proposed.approved_at && manage && <>
                <Button size="sm" variant="outline" disabled={send.isPending} onClick={() => send.mutate(proposed.id)}><Send /> {send.isPending ? 'Sending...' : 'Send the buyer a code'}</Button>
                <Button size="sm" onClick={() => { setCodeError(''); setCode(''); setCodeFor(proposed); }}><KeyRound /> Enter the buyer&apos;s code</Button>
              </>}
            </div>
          </div>
        )}
        {history.filter((p) => p.status !== 'proposed').length > 0 && (
          <ul className="divide-y text-sm">
            {history.filter((p) => p.status !== 'proposed').map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>Version {p.version}, {kes(p.total)} {p.reason ? <span className="text-muted-foreground">({p.reason})</span> : null}</span>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        )}
        {!proposed && plans.length > 1 && (() => {
          const now = plans.find((p) => p.status === 'active');
          return now?.buyer_accepted_at
            ? <p className="text-xs text-muted-foreground">Version {now.version} in force since {fmtDateTime(now.buyer_accepted_at)}, accepted {now.metadata?.accepted_via === 'code' ? 'with a code at the office' : 'in the portal'}.</p>
            : null;
        })()}
        {!proposed && plans.length <= 1 && <p className="text-sm text-muted-foreground">No changes so far. A new plan covers only what is not yet billed.</p>}
      </CardContent>

      <FormSheet
        open={!!form}
        onOpenChange={(o) => !o && setForm(null)}
        size="md"
        title="Propose a new payment plan"
        description="Covers what is not yet billed. It needs approval, then the buyer accepts it. Bills already sent stay as they are."
        footer={<>
          <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
          <Button onClick={submit} disabled={!form?.reason.trim() || !form?.first_due || (form.option === 'instalments' && !termOk(form.term_months)) || restructure.isPending}>{restructure.isPending ? 'Sending...' : 'Send for approval'}</Button>
        </>}
      >
        {form && (
          <div className="space-y-4">
            <Field label="Reason" htmlFor="rs-reason" required hint="The buyer sees this with the new plan.">
              <TextArea id="rs-reason" maxLength={1000} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="New plan" htmlFor="rs-option">
                <NativeSelect id="rs-option" value={form.option} onChange={(e) => setForm({ ...form, option: e.target.value as RestructureInput['option'] })}>
                  <option value="instalments">Instalments</option>
                  <option value="outright">One balance payment</option>
                </NativeSelect>
              </Field>
              <Field label={form.option === 'outright' ? 'Pay by' : 'First payment'} htmlFor="rs-first" required>
                <Input id="rs-first" type="date" min={todayInput()} value={form.first_due} onChange={(e) => setForm({ ...form, first_due: e.target.value })} />
              </Field>
              {form.option === 'instalments' && <>
                <Field label="How often" htmlFor="rs-freq">
                  <NativeSelect id="rs-freq" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as 'monthly' | 'quarterly' })}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </NativeSelect>
                </Field>
                <Field label="Over (months)" htmlFor="rs-term" hint="1 to 240">
                  <Input id="rs-term" inputMode="numeric" value={form.term_months ?? ''} onChange={(e) => setForm({ ...form, term_months: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
                </Field>
              </>}
            </div>
            <p className="rounded-lg bg-muted px-3 py-2 text-sm">Not yet billed on the current plan: <span className="font-semibold tabular">{kes(unbilled)}</span></p>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </div>
        )}
      </FormSheet>

      <FormSheet
        open={!!codeFor}
        onOpenChange={(o) => !o && setCodeFor(null)}
        size="sm"
        title="Buyer accepts at the office"
        description="Send the buyer a code first. They read the 6 digits back here; a code lasts 5 minutes."
        footer={<>
          <Button variant="outline" onClick={() => setCodeFor(null)}>Cancel</Button>
          <Button onClick={takeCode} disabled={code.length !== 6 || accept.isPending}>{accept.isPending ? 'Checking...' : 'Accept the plan'}</Button>
        </>}
      >
        <Field label="Code" htmlFor="rs-code" error={codeError}>
          <Input id="rs-code" inputMode="numeric" autoComplete="one-time-code" value={code} maxLength={6} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && takeCode()} />
        </Field>
      </FormSheet>
    </Card>
  );
}
