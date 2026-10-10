import type { PayInstruction } from '@/lib/api/types';

/**
 * How to pay an account at its fund's paybill, as the API works it out from the fund: the account
 * number to type, and for a bank paybill that takes only the bank account, the unit reference to quote.
 */
export function PayInstructionNote({ pay, prefix = 'Pay by M-Pesa' }: { pay?: PayInstruction | null; prefix?: string }) {
  if (!pay?.paybill || !pay.pay_account) return null;
  return (
    <div className="rounded-xl bg-primary/6 px-3 py-2.5 text-sm">
      <p>
        {prefix}: Paybill <strong className="tabular">{pay.paybill}</strong>, account <strong className="font-mono">{pay.pay_account}</strong>
        {pay.pay_reference && <>, reference <strong className="font-mono">{pay.pay_reference}</strong></>}
      </p>
      {pay.bank_matched && (
        <p className="mt-1 text-xs text-muted-foreground">This paybill pays into the estate&apos;s bank account, so the payment shows here once the bank statement is matched.</p>
      )}
    </div>
  );
}
