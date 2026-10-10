'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Landmark, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import {
  BANK, CASH, CHEQUE, MPESA_MANUAL, SettlementModal, TreasuryPaymentModal, type SettlementSubmitInput,
} from '@bengo-hub/shared-ui-lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import type { ManualPayment, ManualPaymentInput, PayIntent, PayRequest } from '@/lib/api/types';
import { TREASURY_UI_URL } from '@/lib/config';
import { kes, num } from '@/lib/utils';

/** The most one M-Pesa prompt can take; above it the payer gives a bank or cheque reference. */
export const MPESA_PROMPT_LIMIT = 250_000;

/** Shared settlement method values to the API's manual payment methods. */
const METHOD_OF: Record<string, ManualPaymentInput['method']> = {
  cash: 'cash', mpesa_manual: 'mpesa', bank: 'bank_transfer', bank_transfer: 'bank_transfer', cheque: 'cheque',
};

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Pays a unit account. Online, maskani creates one `account_payment` intent (the paybill
 * allocator, oldest bill first) and the shared TreasuryPaymentModal shows this estate's gateways.
 * Above what one M-Pesa prompt can take, the payer gives a bank transfer or cheque reference
 * instead, which waits for a property manager or caretaker to verify before it counts. Staff also
 * get Record payment (cash, M-Pesa code, bank, cheque) on the shared SettlementModal, reviewed the
 * same way. The balance refreshes when the payment is booked.
 */
export function PayAccount({
  tenantSlug, accountId, accountRef, balance, createIntent, submitManual, staff = false, invalidate, email,
  label = 'Pay now', size = 'default',
}: {
  tenantSlug: string;
  accountId: string;
  accountRef: string;
  balance: string | number;
  createIntent: (accountId: string, body: PayRequest) => Promise<PayIntent>;
  /** Records a reference for review: staff any method, residents bank or cheque. */
  submitManual?: (accountId: string, body: ManualPaymentInput) => Promise<ManualPayment>;
  staff?: boolean;
  invalidate: readonly (readonly unknown[])[];
  email?: string;
  label?: string;
  size?: 'default' | 'lg';
}) {
  const qc = useQueryClient();
  const owing = Math.max(0, num(balance));
  const [askOpen, setAskOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [intent, setIntent] = useState<{ id: string; amount: number } | null>(null);
  const [manual, setManual] = useState({ method: 'bank_transfer' as ManualPaymentInput['method'], reference: '', paidOn: today() });
  // One idempotency key per Pay attempt, so a double tap never creates two intents.
  const keyRef = useRef('');

  const value = amount.trim() === '' ? owing : Number(amount);
  const tooBigForMpesa = Number.isFinite(value) && value > MPESA_PROMPT_LIMIT;

  const refresh = () => { for (const k of invalidate) void qc.invalidateQueries({ queryKey: k }); };

  const start = async () => {
    if (!Number.isFinite(value) || value <= 0) { toast.error('Enter an amount above zero.'); return; }
    setBusy(true);
    try {
      if (!keyRef.current) keyRef.current = crypto.randomUUID();
      // "pending": treasury creates the intent without starting a gateway, and the pay page in the
      // modal starts the payer's chosen rail. Any other method would push an M-Pesa prompt to the
      // phone on file before the payer has chosen anything.
      const res = await createIntent(accountId, { amount: value, payment_method: 'pending', idempotency_key: keyRef.current, email });
      setAskOpen(false);
      setIntent({ id: res.intent_id, amount: num(res.amount) || value });
    } catch {
      /* the mutation layer already showed the error */
    } finally {
      setBusy(false);
    }
  };

  const sendForReview = async () => {
    if (!submitManual) return;
    if (!manual.reference.trim()) { toast.error('Enter the bank or cheque reference.'); return; }
    setBusy(true);
    try {
      await submitManual(accountId, { amount: value, method: manual.method, reference: manual.reference.trim(), paid_on: manual.paidOn });
      toast.success('Sent for review. It counts once the estate office verifies it.');
      setAskOpen(false);
      refresh();
    } catch {
      /* shown by the mutation layer */
    } finally {
      setBusy(false);
    }
  };

  const record = async (input: SettlementSubmitInput) => {
    if (!submitManual) return;
    const method = METHOD_OF[input.method ?? ''] ?? 'cash';
    await submitManual(accountId, {
      amount: input.amount, method, reference: (input.reference ?? '').trim() || `CASH-${Date.now()}`,
      paid_on: input.effectiveAt ? input.effectiveAt.slice(0, 10) : today(),
    });
    toast.success('Recorded for review. It counts once someone else verifies it.');
    setRecordOpen(false);
    refresh();
  };

  const close = () => {
    setIntent(null);
    keyRef.current = '';
    refresh();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size={size} className={size === 'lg' ? 'h-12 text-base' : undefined}
          onClick={() => { setAmount(owing > 0 ? String(owing) : ''); setManual({ method: 'bank_transfer', reference: '', paidOn: today() }); setAskOpen(true); }}>
          <Smartphone /> {label}
        </Button>
        {staff && submitManual && (
          <Button size={size} variant="outline" onClick={() => setRecordOpen(true)}><ClipboardCheck /> Record payment</Button>
        )}
      </div>
      <FormSheet
        open={askOpen}
        onOpenChange={setAskOpen}
        size="sm"
        title={`Pay account ${accountRef}`}
        description={owing > 0 ? `Balance due ${kes(owing)}. You can pay part of it.` : 'This account has no balance due. A payment is kept as credit.'}
        footer={<>
          <Button variant="outline" onClick={() => setAskOpen(false)}>Cancel</Button>
          {tooBigForMpesa
            ? <Button onClick={sendForReview} disabled={busy || !submitManual}>{busy ? 'Sending...' : 'Send for review'}</Button>
            : <Button onClick={start} disabled={busy}>{busy ? 'Starting...' : 'Continue to payment'}</Button>}
        </>}
      >
        <div className="space-y-4">
          <Field label="Amount (KES)" htmlFor="pay-amount">
            <Input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 text-lg tabular" />
          </Field>
          {tooBigForMpesa && (
            <div className="space-y-4 rounded-xl border bg-muted/40 p-4">
              <p className="flex items-start gap-2 text-sm">
                <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                M-Pesa takes up to {kes(MPESA_PROMPT_LIMIT)} at a time. Pay by bank transfer or cheque, then give its reference here.
                The estate office checks it before it counts; or pay up to {kes(MPESA_PROMPT_LIMIT)} now by M-Pesa.
              </p>
              <Field label="Paid by" htmlFor="pay-method">
                <NativeSelect id="pay-method" value={manual.method} onChange={(e) => setManual({ ...manual, method: e.target.value as ManualPaymentInput['method'] })}>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cheque">Cheque</option>
                </NativeSelect>
              </Field>
              <Field label={manual.method === 'cheque' ? 'Cheque number' : 'Bank reference'} htmlFor="pay-ref" required>
                <Input id="pay-ref" value={manual.reference} onChange={(e) => setManual({ ...manual, reference: e.target.value })} className="uppercase" />
              </Field>
              <Field label="Date paid" htmlFor="pay-date">
                <Input id="pay-date" type="date" max={today()} value={manual.paidOn} onChange={(e) => setManual({ ...manual, paidOn: e.target.value })} />
              </Field>
            </div>
          )}
        </div>
      </FormSheet>
      {staff && submitManual && (
        <SettlementModal
          open={recordOpen}
          mode="receive"
          title={`Record a payment to ${accountRef}`}
          subjectName={`Account ${accountRef}`}
          amountLabel="Balance due"
          amountValue={owing}
          currency="KES"
          defaultAmount={owing > 0 ? owing : undefined}
          methods={[CASH, MPESA_MANUAL, BANK, CHEQUE]}
          onSubmit={record}
          onClose={() => setRecordOpen(false)}
        />
      )}
      {intent && (
        <TreasuryPaymentModal
          open
          onOpenChange={(o) => { if (!o) close(); }}
          paymentIntentId={intent.id}
          tenantSlug={tenantSlug}
          amount={intent.amount}
          currency="KES"
          description={`Account ${accountRef}`}
          customerEmail={email}
          referenceId={accountId}
          referenceType="account_payment"
          treasuryUiUrl={TREASURY_UI_URL}
          onPaymentConfirmed={() => { toast.success('Payment received. The balance updates in a moment.'); close(); }}
          onPaymentFailed={(e) => toast.error(typeof e === 'string' ? e : 'The payment did not go through.')}
        />
      )}
    </>
  );
}
