'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { TreasuryPaymentModal } from '@bengo-hub/shared-ui-lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import type { PayIntent, PayRequest } from '@/lib/api/types';
import { TREASURY_UI_URL } from '@/lib/config';
import { kes, num } from '@/lib/utils';

/**
 * Pays a unit account through treasury. maskani creates one `account_payment` intent (the same
 * allocator as paybill, oldest bill first) and the shared TreasuryPaymentModal shows only the
 * gateways this estate has configured. The balance refreshes when the payment event arrives.
 */
export function PayAccount({
  tenantSlug, accountId, accountRef, balance, createIntent, invalidate, email, label = 'Pay now', size = 'default',
}: {
  tenantSlug: string;
  accountId: string;
  accountRef: string;
  balance: string | number;
  createIntent: (accountId: string, body: PayRequest) => Promise<PayIntent>;
  invalidate: readonly (readonly unknown[])[];
  email?: string;
  label?: string;
  size?: 'default' | 'lg';
}) {
  const qc = useQueryClient();
  const owing = Math.max(0, num(balance));
  const [askOpen, setAskOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [intent, setIntent] = useState<{ id: string; amount: number } | null>(null);
  // One idempotency key per Pay attempt, so a double tap never creates two intents.
  const keyRef = useRef('');

  const start = async () => {
    const value = amount.trim() === '' ? owing : Number(amount);
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

  const close = () => {
    setIntent(null);
    keyRef.current = '';
    for (const k of invalidate) void qc.invalidateQueries({ queryKey: k });
  };

  return (
    <>
      <Button size={size} className={size === 'lg' ? 'h-12 text-base' : undefined} onClick={() => { setAmount(owing > 0 ? String(owing) : ''); setAskOpen(true); }}>
        <Smartphone /> {label}
      </Button>
      <FormSheet
        open={askOpen}
        onOpenChange={setAskOpen}
        size="sm"
        title={`Pay account ${accountRef}`}
        description={owing > 0 ? `Balance due ${kes(owing)}. You can pay part of it.` : 'This account has no balance due. A payment is kept as credit.'}
        footer={<>
          <Button variant="outline" onClick={() => setAskOpen(false)}>Cancel</Button>
          <Button onClick={start} disabled={busy}>{busy ? 'Starting...' : 'Continue to payment'}</Button>
        </>}
      >
        <Field label="Amount (KES)" htmlFor="pay-amount">
          <Input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 text-lg tabular" />
        </Field>
      </FormSheet>
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
