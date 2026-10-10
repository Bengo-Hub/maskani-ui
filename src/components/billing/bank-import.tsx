'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { ToneBadge, type Tone } from '@/components/common/status-badge';
import { useSlug } from '@/hooks/use-access';
import { useFunds, useImportBankLines } from '@/hooks/use-billing';
import { apiErrorMessage } from '@/lib/api/errors';
import type { BankLineResult } from '@/lib/api/types';
import { readBankCsv, type BankCsvResult } from '@/lib/bank-csv';
import { fmtDate, kes, num } from '@/lib/utils';

const STATUS: Record<BankLineResult['status'], [string, Tone]> = {
  queued: ['Sent for review', 'success'], duplicate: ['Already queued', 'neutral'], unmatched: ['No account found', 'warning'], invalid: ['Not read', 'danger'],
};

/**
 * Bank statement import for estates whose paybill pays into a bank account (no confirmations reach
 * us). The CSV is read here; the API matches each credit to an account by the unit reference in
 * the narrative, else by the owner's phone, and queues it in To verify. Unmatched lines are listed
 * so someone can record them on the right account by hand.
 */
export function BankImport({ open, onClose, propertyId }: { open: boolean; onClose: () => void; propertyId?: string }) {
  const slug = useSlug();
  const { data: funds = [] } = useFunds();
  const run = useImportBankLines();
  const [fund, setFund] = useState('estate');
  const [file, setFile] = useState('');
  const [read, setRead] = useState<BankCsvResult | null>(null);
  const [error, setError] = useState('');
  const [results, setResults] = useState<BankLineResult[] | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const reset = () => { setFile(''); setRead(null); setError(''); setResults(null); run.reset(); if (input.current) input.current.value = ''; };
  const close = () => { reset(); onClose(); };

  const onFile = async (f: File | undefined) => {
    setResults(null);
    setError('');
    setRead(null);
    if (!f) return;
    setFile(f.name);
    try {
      const r = readBankCsv(await f.text());
      if (r.lines.length === 0) setError('No credits were found in this file.');
      else if (r.lines.length > 2000) setError('Split the statement: up to 2,000 credits per import.');
      else setRead(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The file could not be read.');
    }
  };

  const submit = () => read && run.mutate(
    { fund, property_id: propertyId || undefined, lines: read.lines },
    { onSuccess: (r) => setResults(r), onError: (e) => setError(apiErrorMessage(e)) },
  );

  const counts = useMemo(() => {
    const c = { queued: 0, duplicate: 0, unmatched: 0, invalid: 0 };
    for (const r of results ?? []) c[r.status]++;
    return c;
  }, [results]);

  const columns = useMemo<DataTableColumn<BankLineResult>[]>(() => [
    { key: 'date', header: 'Date', accessor: (r) => r.line.date, render: (r) => fmtDate(r.line.date) },
    {
      key: 'line', header: 'Narrative', primary: true, accessor: (r) => r.line.description,
      render: (r) => <div className="min-w-0"><p className="truncate text-sm">{r.line.description || r.line.payer || 'No narrative'}</p><p className="font-mono text-xs text-muted-foreground">{r.line.reference}</p></div>,
    },
    { key: 'amt', header: 'Amount', align: 'right', accessor: (r) => num(r.line.amount), render: (r) => <span className="font-semibold tabular">{kes(r.line.amount)}</span> },
    {
      key: 'acct', header: 'Account', accessor: (r) => r.account_ref ?? '',
      render: (r) => r.account_id
        ? <div><Link href={`/${slug}/billing/accounts/${r.account_id}`} className="font-mono font-semibold text-primary hover:underline">{r.account_ref}</Link>
          <p className="text-xs text-muted-foreground">by {r.matched_by === 'phone' ? 'phone' : 'reference'}</p></div>
        : <span className="text-muted-foreground">None</span>,
    },
    {
      key: 'status', header: 'Result', mobileAction: true, accessor: (r) => r.status,
      render: (r) => <div><ToneBadge tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</ToneBadge>
        {r.error && <p className="text-xs text-destructive">{r.error}</p>}</div>,
    },
  ], [slug]);

  const total = read ? read.lines.reduce((s, l) => s + Number(l.amount), 0) : 0;

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => !o && close()}
      size={results ? 'xl' : 'md'}
      title="Import a bank statement"
      description="For a paybill that pays into the estate's bank account. Credits are matched to accounts and sent to To verify; nothing is booked until someone verifies it."
      footer={results ? <>
        <Button variant="outline" onClick={reset}>Import another</Button>
        <Button onClick={close}>Done</Button>
      </> : <>
        <Button variant="outline" onClick={close}>Cancel</Button>
        <Button disabled={!read || run.isPending} onClick={submit}><Upload /> {run.isPending ? 'Matching...' : `Match ${read?.lines.length ?? 0} credits`}</Button>
      </>}
    >
      {results ? (
        <div className="space-y-3">
          <p className="text-sm">
            <strong>{counts.queued}</strong> sent for review, {counts.duplicate} already queued, <strong>{counts.unmatched}</strong> with no account
            {counts.invalid > 0 && <>, {counts.invalid} not read</>}.
            {counts.unmatched > 0 && ' Record the unmatched ones from the account page with Record payment.'}
          </p>
          <DataTable columns={columns} rows={results} rowKey={(r) => `${r.line.reference}-${r.line.date}-${r.line.amount}`} emptyText="No lines." exportFileName="bank-import" />
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Fund" htmlFor="bi-fund" hint="The fund whose paybill pays into this bank account">
            <NativeSelect id="bi-fund" value={fund} onChange={(e) => setFund(e.target.value)}>
              {funds.length === 0 && <option value="estate">Estate</option>}
              {funds.map((f) => <option key={f.id} value={f.code ?? ''}>{f.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Statement CSV" htmlFor="bi-file" hint="Export the statement from internet banking as CSV. Only credits are read." error={error || undefined}>
            <label htmlFor="bi-file" className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-5 text-center text-sm hover:bg-muted/40">
              <FileSpreadsheet className="h-6 w-6 text-muted-foreground" aria-hidden />
              <span className="font-medium">{file || 'Choose a CSV file'}</span>
              <input ref={input} id="bi-file" type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} />
            </label>
          </Field>
          {read && (
            <div className="rounded-xl bg-muted/50 px-3 py-2.5 text-sm">
              <p><strong>{read.lines.length}</strong> credits, {kes(total)} in all{read.skipped > 0 && `, ${read.skipped} rows without a date skipped`}.</p>
              <p className="text-xs text-muted-foreground">
                Read from: {read.columns.date} (date), {read.columns.amount} (amount)
                {read.columns.reference && `, ${read.columns.reference} (reference)`}{read.columns.description && `, ${read.columns.description} (narrative)`}.
              </p>
            </div>
          )}
        </div>
      )}
    </FormSheet>
  );
}
