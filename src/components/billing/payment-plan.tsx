'use client';

import { useState } from 'react';
import { CalendarClock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Field, TextArea } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ToneBadge, type Tone } from '@/components/common/status-badge';
import { useAccess } from '@/hooks/use-access';
import { usePaymentPlan } from '@/hooks/use-billing';
import { apiErrorMessage } from '@/lib/api/errors';
import type { Money, PaymentPlan } from '@/lib/api/types';
import { fmtDate, kes, num, todayInput } from '@/lib/utils';

const STATUS: Record<PaymentPlan['status'], [string, Tone]> = {
  active: ['Being kept', 'success'], completed: ['Completed', 'primary'], broken: ['Broken', 'danger'], cancelled: ['Cancelled', 'neutral'],
};

/** Adds whole months to a YYYY-MM-DD date, keeping the day (clamped to the month's last day). */
function addMonths(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
  const t = new Date(Date.UTC(y, m - 1 + n, Math.min(d, last)));
  return t.toISOString().slice(0, 10);
}

/** Splits a total into n monthly amounts in whole shillings, the remainder on the last. */
function split(total: number, n: number): number[] {
  const each = Math.floor(total / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? Math.round((total - each * (n - 1)) * 100) / 100 : each));
}

/**
 * An agreed payment plan for an account's arrears. While it is kept the demand letter and
 * escalation wait and the account leaves the call list; an instalment more than 3 days late breaks
 * it and finance hears. Issue the "Payment plan agreement" letter from the documents panel.
 */
export function PaymentPlanPanel({ accountId, balance, plan }: { accountId: string; balance?: Money; plan?: PaymentPlan }) {
  const { can } = useAccess();
  const manage = can('billing.collect');
  const { save, cancel } = usePaymentPlan(accountId);
  const owed = num(balance);
  const [open, setOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rows, setRows] = useState<{ due: string; amount: string }[]>([]);
  const [count, setCount] = useState(3);
  const [first, setFirst] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const build = (n: number, start: string) => {
    const amounts = split(owed, n);
    setRows(amounts.map((a, i) => ({ due: addMonths(start, i), amount: String(a) })));
  };
  const start = () => {
    const f = todayInput();
    setCount(3); setFirst(f); setNote(''); setError('');
    build(3, f);
    setOpen(true);
  };

  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const problem = rows.some((r) => !(Number(r.amount) > 0)) ? 'Each instalment needs an amount.'
    : rows.some((r) => r.due < todayInput()) ? 'Dates must be today or later.'
      : total > owed + 0.001 ? `The plan adds up to ${kes(total)}, more than the ${kes(owed)} owed.` : '';

  const active = plan?.status === 'active';
  const paid = num(plan?.paid), planTotal = num(plan?.total);

  return (
    <div className="border-b px-5 py-3">
      {plan ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <CalendarClock className="h-4 w-4 text-primary" aria-hidden /> Payment plan from {fmtDate(plan.start)}
              <ToneBadge tone={STATUS[plan.status][1]}>{STATUS[plan.status][0]}</ToneBadge>
            </p>
            {manage && (
              <div className="flex gap-2">
                {active && <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(true)}><X /> Cancel plan</Button>}
                {!active && owed > 0 && <Button size="sm" variant="outline" onClick={start}>Agree a new plan</Button>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Progress value={planTotal > 0 ? Math.min(100, (paid / planTotal) * 100) : 0} className="h-2 flex-1" aria-label="Paid against the plan" />
            <span className="tabular">{kes(paid)} of {kes(planTotal)}</span>
          </div>
          <ul className="flex flex-wrap gap-2 text-xs">
            {plan.instalments.map((it) => (
              <li key={it.due} className="rounded-lg bg-muted px-2 py-1 tabular">{fmtDate(it.due)}: {kes(it.amount)}</li>
            ))}
          </ul>
          {plan.note && <p className="text-xs text-muted-foreground">{plan.note}</p>}
        </div>
      ) : manage && owed > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">Agree a payment plan to hold the demand letter and escalation while it is kept.</p>
          <Button size="sm" variant="outline" onClick={start}><CalendarClock /> Agree a payment plan</Button>
        </div>
      ) : null}

      <FormSheet
        open={open}
        onOpenChange={(o) => !o && setOpen(false)}
        size="md"
        title="Agree a payment plan"
        description={`For the ${kes(owed)} owed. Monthly by default; adjust any date or amount.`}
        footer={<>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!!problem || rows.length === 0 || save.isPending}
            onClick={() => save.mutate({ instalments: rows.map((r) => ({ due: r.due, amount: Number(r.amount) })), note: note.trim() || undefined },
              { onSuccess: () => setOpen(false), onError: (e) => setError(apiErrorMessage(e)) })}>
            {save.isPending ? 'Saving...' : 'Save plan'}
          </Button>
        </>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Instalments" htmlFor="pp-count">
              <Input id="pp-count" type="number" min={1} max={24} value={count}
                onChange={(e) => { const n = Math.max(1, Math.min(24, Number(e.target.value) || 1)); setCount(n); build(n, first); }} />
            </Field>
            <Field label="First payment" htmlFor="pp-first">
              <Input id="pp-first" type="date" min={todayInput()} value={first} onChange={(e) => { setFirst(e.target.value); build(count, e.target.value); }} />
            </Field>
          </div>
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <li key={i} className="grid grid-cols-[2rem_1fr_1fr] items-center gap-2">
                <span className="text-sm text-muted-foreground">{i + 1}.</span>
                <Input type="date" aria-label={`Instalment ${i + 1} date`} value={r.due} min={todayInput()}
                  onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, due: e.target.value } : y)))} />
                <Input inputMode="decimal" aria-label={`Instalment ${i + 1} amount`} value={r.amount} className="tabular"
                  onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, amount: e.target.value } : y)))} />
              </li>
            ))}
          </ul>
          <p className="text-sm">Total <strong className="tabular">{kes(total)}</strong> of {kes(owed)} owed.</p>
          <Field label="Note" htmlFor="pp-note" hint="What was agreed and with whom" error={problem || error || undefined}>
            <TextArea id="pp-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      </FormSheet>
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        variant="warning"
        title="Cancel this payment plan?"
        description="The collections ladder carries on from where the debt is."
        confirmLabel="Cancel plan"
        loading={cancel.isPending}
        onConfirm={() => cancel.mutate(undefined, { onSuccess: () => setConfirmCancel(false) })}
      />
    </div>
  );
}
