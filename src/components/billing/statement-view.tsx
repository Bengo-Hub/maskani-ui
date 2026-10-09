'use client';

import { useMemo } from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { StatusBadge } from '@/components/common/status-badge';
import type { Statement } from '@/lib/api/types';
import { fmtDate, kes, num } from '@/lib/utils';

interface Row { key: string; date: string; label: string; detail?: string; debit: number; credit: number; status?: string; after: number }

/** Entries per list the API asks treasury for (accounts.Refresh). A full list may be cut off. */
const LEDGER_LIMIT = 50;

const time = (d: string) => new Date(d).getTime();

/**
 * Statement for one unit account, read live from treasury: bills and payments merged by date with
 * a running balance. Used by the console and the owner portal so both show the same figures.
 *
 * The balance after each entry is worked backwards from today's position (balance due less credit),
 * so it is right for the window shown. Treasury sends the latest 50 bills and 50 payments; when a
 * list is full, entries older than its oldest one are dropped, since bills or payments before that
 * point are missing and their balances would be wrong.
 */
export function StatementView({ statement }: { statement: Statement }) {
  const ledger = statement.ledger;
  const { rows, trimmed } = useMemo(() => {
    if (!ledger) return { rows: [] as Row[], trimmed: false };
    const invoices = ledger.invoices ?? [];
    const payments = ledger.payments ?? [];
    let cutoff = -Infinity;
    if (invoices.length >= LEDGER_LIMIT) cutoff = Math.max(cutoff, Math.min(...invoices.map((i) => time(i.invoice_date))));
    if (payments.length >= LEDGER_LIMIT) cutoff = Math.max(cutoff, Math.min(...payments.map((p) => time(p.paid_at))));

    const merged = [
      ...invoices.map((i) => ({
        key: `i-${i.id}`, date: i.invoice_date, label: i.description || `Bill ${i.invoice_number}`, detail: i.invoice_number,
        debit: num(i.total_amount), credit: 0, status: i.payment_status,
      })),
      ...payments.map((p) => ({
        key: `p-${p.id}`, date: p.paid_at, label: `Payment${p.method ? `, ${p.method.replace(/_/g, ' ')}` : ''}`, detail: p.reference,
        debit: 0, credit: num(p.amount),
      })),
    ].sort((a, b) => time(b.date) - time(a.date));

    const kept = merged.filter((r) => time(r.date) >= cutoff);
    let after = num(ledger.balance) - num(ledger.credit ?? 0);
    const out: Row[] = kept.map((r) => {
      const row = { ...r, after };
      after = after - r.debit + r.credit;
      return row;
    });
    // A full list means older history exists beyond what is shown.
    return { rows: out, trimmed: cutoff > -Infinity };
  }, [ledger]);

  if (!ledger) {
    return <EmptyState icon={FileText} title="Statement unavailable" description="The accounts service is not answering. Try again in a minute." />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Balance due</p><p className={num(ledger.balance) > 0 ? 'font-display text-xl font-semibold text-destructive tabular' : 'font-display text-xl font-semibold tabular'}>{kes(ledger.balance)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Billed</p><p className="font-display text-xl font-semibold tabular">{kes(ledger.total_billed)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Paid</p><p className="font-display text-xl font-semibold tabular">{kes(ledger.total_paid)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Credit</p><p className="font-display text-xl font-semibold tabular">{kes(ledger.credit ?? 0)}</p></Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Bills and payments</CardTitle>
          {trimmed && <CardDescription>Latest entries only. Older ones are left out so every balance shown is exact.</CardDescription>}
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No bills or payments yet.</p>
          ) : (
            <ul className="divide-y">
              {rows.map((r) => (
                <li key={r.key} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.label}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span>{fmtDate(r.date)}{r.detail ? ` · ${r.detail}` : ''}</span>
                      {r.status && <StatusBadge status={r.status} />}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={r.credit > 0 ? 'font-medium text-success tabular' : 'font-medium tabular'}>
                      {r.credit > 0 ? `Paid ${kes(r.credit)}` : kes(r.debit)}
                    </p>
                    <p className="text-xs text-muted-foreground tabular">
                      {r.after < 0 ? `${kes(-r.after)} in credit` : `Balance ${kes(r.after)}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
