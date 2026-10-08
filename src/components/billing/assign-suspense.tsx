'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormSheet } from '@/components/common/form-sheet';
import { SearchInput } from '@/components/common/search-input';
import { useAssignSuspense } from '@/hooks/use-billing';
import { useUnit, useUnits } from '@/hooks/use-register';
import type { SuspenseRow } from '@/lib/api/types';
import { cn, fmtDateTime, kes } from '@/lib/utils';

/** Assigns an unmatched paybill payment: find the unit by code, then pick its account. */
export function AssignSuspense({ row, onClose }: { row: SuspenseRow | null; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [unitId, setUnitId] = useState('');
  const [accountId, setAccountId] = useState('');
  const units = useUnits({ q });
  const { data: unit } = useUnit(unitId);
  const assign = useAssignSuspense();

  const reset = () => { setQ(''); setUnitId(''); setAccountId(''); };
  const close = () => { reset(); onClose(); };

  return (
    <FormSheet
      open={!!row}
      onOpenChange={(o) => !o && close()}
      size="md"
      title="Assign payment"
      description={row ? `${kes(row.amount)} from ${row.payer_name || row.msisdn || 'unknown payer'}, ${fmtDateTime(row.trans_time)}. Account typed: "${row.bill_ref_number || 'blank'}".` : undefined}
      footer={<>
        <Button variant="outline" onClick={close}>Cancel</Button>
        <Button
          disabled={!row || !accountId || assign.isPending}
          onClick={() => row && assign.mutate({ transId: row.trans_id, accountId }, { onSuccess: close })}
        >
          {assign.isPending ? 'Assigning...' : 'Assign payment'}
        </Button>
      </>}
    >
      <div className="space-y-4">
        <SearchInput value={q} onSearch={(v) => { setQ(v); setUnitId(''); setAccountId(''); }} placeholder="Unit code, then Enter" className="sm:w-full" />
        {q && !unitId && (
          <ul className="max-h-56 divide-y overflow-y-auto rounded-lg border">
            {units.rows.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{units.isLoading ? 'Searching...' : 'No unit with that code.'}</li>}
            {units.rows.map((u) => (
              <li key={u.id}>
                <button type="button" onClick={() => setUnitId(u.id)} className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-muted">
                  <span className="font-medium">{u.code}</span><span className="text-muted-foreground">{u.owner_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {unit && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Accounts for {unit.code}</p>
            {(unit.accounts ?? []).length === 0 && <p className="text-sm text-muted-foreground">This unit has no accounts yet.</p>}
            {(unit.accounts ?? []).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAccountId(a.id)}
                className={cn('flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm', accountId === a.id ? 'border-primary bg-primary/5' : 'hover:bg-muted')}
              >
                <span><span className="font-mono font-medium">{a.account_ref}</span> <span className="text-muted-foreground">{a.edges?.fund?.name}</span></span>
                <span className="flex items-center gap-2 tabular">{kes(a.balance)} {accountId === a.id && <Check className="h-4 w-4 text-primary" />}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </FormSheet>
  );
}
