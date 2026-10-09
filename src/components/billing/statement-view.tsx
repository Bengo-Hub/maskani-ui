'use client';

import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { StatusBadge } from '@/components/common/status-badge';
import type { Statement } from '@/lib/api/types';
import { fmtDate, kes, num } from '@/lib/utils';

/**
 * Statement for one unit account, read live from treasury: bills and payments newest first, each
 * with the balance after it as the API works it out. Used by the console and the owner portal so
 * both show the same figures. `actions` holds the download buttons.
 */
export function StatementView({ statement, actions }: { statement: Statement; actions?: ReactNode }) {
  const ledger = statement.ledger;
  if (!ledger) {
    return <EmptyState icon={FileText} title="Statement unavailable" description="The accounts service is not answering. Try again in a minute." />;
  }
  const entries = statement.entries ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Balance due</p><p className={num(ledger.balance) > 0 ? 'font-display text-xl font-semibold text-destructive tabular' : 'font-display text-xl font-semibold tabular'}>{kes(ledger.balance)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Billed</p><p className="font-display text-xl font-semibold tabular">{kes(ledger.total_billed)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Paid</p><p className="font-display text-xl font-semibold tabular">{kes(ledger.total_paid)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Credit</p><p className="font-display text-xl font-semibold tabular">{kes(ledger.credit ?? 0)}</p></Card>
      </div>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Bills and payments</CardTitle>
            {statement.trimmed && <CardDescription>Latest entries only. The PDF and Excel versions go further back.</CardDescription>}
          </div>
          {actions}
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No bills or payments yet.</p>
          ) : (
            <ul className="divide-y">
              {entries.map((e, i) => {
                const paid = num(e.credit) > 0;
                const after = num(e.balance_after);
                return (
                  <li key={`${e.kind}-${e.reference ?? ''}-${e.date}-${i}`} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{e.label}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span>{fmtDate(e.date)}{e.reference ? ` · ${e.reference}` : ''}</span>
                        {e.status && <StatusBadge status={e.status} />}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={paid ? 'font-medium text-success tabular' : 'font-medium tabular'}>
                        {paid ? `Paid ${kes(e.credit)}` : kes(e.debit)}
                      </p>
                      <p className="text-xs text-muted-foreground tabular">
                        {after < 0 ? `${kes(-after)} in credit` : `Balance ${kes(after)}`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
