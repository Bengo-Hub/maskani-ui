'use client';

import { useEffect, useMemo, useState } from 'react';
import { ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect, TextArea } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { useRequestAdjustment } from '@/hooks/use-billing';
import { apiErrorMessage } from '@/lib/api/errors';
import type { LedgerInvoice } from '@/lib/api/types';
import { fmtDate, kes, num } from '@/lib/utils';

const owedOn = (i: LedgerInvoice) => num(i.total_amount) - num(i.amount_paid) - num(i.amount_credited ?? 0);

/**
 * Asks to credit part of one unpaid bill: a credit note for a billing mistake, or a waiver of a
 * charge the estate forgives. Nothing changes on the account until it is approved under the
 * approval rule for the amount; money already paid cannot be credited.
 */
export function CreditBill({ accountId, invoices }: { accountId: string; invoices: LedgerInvoice[] }) {
  const [open, setOpen] = useState(false);
  const open_ = useMemo(() => invoices.filter((i) => owedOn(i) > 0), [invoices]);
  const save = useRequestAdjustment(accountId);
  const [f, setF] = useState({ invoice: '', kind: 'credit_note' as 'credit_note' | 'waiver', amount: '', reason: '' });
  const [error, setError] = useState('');

  const bill = open_.find((i) => i.id === f.invoice);
  const owed = bill ? owedOn(bill) : 0;
  useEffect(() => { if (bill) setF((v) => ({ ...v, amount: String(owedOn(bill)) })); }, [bill]);

  const amount = Number(f.amount);
  const amountError = f.amount && (!(amount > 0) || amount > owed) ? `Up to ${kes(owed)}, the unpaid part of the bill` : '';
  const valid = !!bill && amount > 0 && amount <= owed && f.reason.trim().length > 0;

  const close = () => { setOpen(false); setError(''); setF({ invoice: '', kind: 'credit_note', amount: '', reason: '' }); };
  const submit = () => save.mutate({ kind: f.kind, invoice_id: f.invoice, amount, reason: f.reason.trim() },
    { onSuccess: close, onError: (e) => setError(apiErrorMessage(e)) });

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} disabled={open_.length === 0}
        title={open_.length === 0 ? 'No bill on this account has an unpaid amount to credit' : undefined}>
        <ReceiptText /> Credit a bill
      </Button>
      <FormSheet
        open={open}
        onOpenChange={(o) => !o && close()}
        size="md"
        title="Credit a bill"
        description="Goes for approval first. Only the unpaid part of a bill can be credited."
        footer={<>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button disabled={!valid || save.isPending} onClick={submit}>{save.isPending ? 'Sending...' : 'Send for approval'}</Button>
        </>}
      >
        <div className="space-y-4">
          <Field label="Bill" htmlFor="cb-bill" required>
            <NativeSelect id="cb-bill" value={f.invoice} onChange={(e) => setF({ ...f, invoice: e.target.value })}>
              <option value="">Choose the bill</option>
              {open_.map((i) => (
                <option key={i.id} value={i.id}>{`${i.invoice_number}, ${fmtDate(i.invoice_date)}${i.description ? `, ${i.description}` : ''} (${kes(owedOn(i))} unpaid)`}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Type" htmlFor="cb-kind">
            <NativeSelect id="cb-kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as typeof f.kind })}>
              <option value="credit_note">Credit note (the bill was wrong)</option>
              <option value="waiver">Waiver (the estate forgives the charge)</option>
            </NativeSelect>
          </Field>
          <Field label="Amount (KES)" htmlFor="cb-amount" required error={amountError || undefined}>
            <Input id="cb-amount" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className="tabular" />
          </Field>
          <Field label="Reason" htmlFor="cb-reason" required hint="The approver and the account history see this." error={error || undefined}>
            <TextArea id="cb-reason" rows={3} maxLength={500} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}
              placeholder="Water billed on an estimate; the actual reading was 12 m3 lower" />
          </Field>
        </div>
      </FormSheet>
    </>
  );
}
