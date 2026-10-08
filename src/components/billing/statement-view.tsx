'use client';

import { useMemo } from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { StatusBadge } from '@/components/common/status-badge';
import type { Statement } from '@/lib/api/types';
import { fmtDate, kes, num } from '@/lib/utils';

interface Row { key: string; date: string; label: string; detail?: string; debit: number; credit: number; status?: string }

/**
 * Statement for one unit account, read live from treasury: bills and payments merged by date with
 * a running balance. Used by the console and the owner portal so both show the same figures.
 */
export function StatementView({ statement }: { statement: Statement }) {
  const ledger = statement.ledger;
  const rows = useMemo<Row[]>(() => {
    if (!ledger) return [];
    const bills: Row[] = (ledger.invoices ?? []).map((i) => ({
      key: `i-${i.id}`, date: i.invoice_date, label: i.description || `Bill ${i.invoice_number}`, detail: i.invoice_number,
      debit: num(i.total_amount), credit: 0, status: i.payment_status,
    }));
    const pays: Row[] = (ledger.payments ?? []).map((p) => ({
      key: `p-${p.id}`, date: p.paid_at, label: `Payment${p.method ? `, ${p.method.replace(/_/g, ' ')}` : ''}`, detail: p.reference,
      debit: 0, credit: num(p.amount),
    }));
    return [...bills, ...pays].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
        <CardHeader><CardTitle>Bills and payments</CardTitle></CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No bills or payments yet.</p>
          ) : (
            <ul className="divide-y">
              {rows.map((r) => (
                <li key={r.key} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(r.date)}{r.detail ? ` · ${r.detail}` : ''}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {r.status && <StatusBadge status={r.status} />}
                    <span className={r.credit > 0 ? 'font-medium text-success tabular' : 'font-medium tabular'}>
                      {r.credit > 0 ? `- ${kes(r.credit)}` : kes(r.debit)}
                    </span>
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
