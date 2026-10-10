'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Phone, PhoneCall } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { useSlug } from '@/hooks/use-access';
import { useAddCollectionNote, useCallList, useLadder } from '@/hooks/use-billing';
import { PaymentPlanPanel } from '@/components/billing/payment-plan';
import type { CallRow, CollectionNote } from '@/lib/api/types';
import { fmtDate, kes, num } from '@/lib/utils';

export const OUTCOMES: { value: CollectionNote['outcome']; label: string }[] = [
  { value: 'reached', label: 'Spoke to them' },
  { value: 'promised', label: 'Promised to pay' },
  { value: 'no_answer', label: 'No answer' },
  { value: 'disputed', label: 'Disputes the amount' },
  { value: 'wrong_number', label: 'Wrong number' },
  { value: 'paid', label: 'Says they have paid' },

];
const outcomeLabel = (o?: string) => (o === 'plan' ? 'Payment plan' : OUTCOMES.find((x) => x.value === o)?.label ?? o ?? '');

/**
 * The collections call list: accounts the ladder flagged (day 30 by default) that still owe,
 * largest first. Recording a call keeps the history on the account; a promise to pay holds the
 * demand letter and escalation until its date and takes the account off the list.
 */
export function CallList({ propertyId }: { propertyId: string }) {
  const slug = useSlug();
  const { data = [], isLoading, isError, refetch } = useCallList(propertyId);
  const [calling, setCalling] = useState<CallRow | null>(null);

  const columns = useMemo<DataTableColumn<CallRow>[]>(() => [
    {
      key: 'ref', header: 'Account', primary: true, accessor: (r) => r.account_ref,
      render: (r) => (
        <div><Link href={`/${slug}/billing/accounts/${r.account_id}`} className="font-mono font-semibold text-primary hover:underline">{r.account_ref}</Link>
          <p className="text-xs text-muted-foreground">{r.unit_code}</p></div>
      ),
    },
    {
      key: 'who', header: 'Owner', accessor: (r) => r.customer_name,
      render: (r) => (
        <div><p>{r.customer_name || 'No name'}</p>
          {r.customer_phone && <a href={`tel:+${r.customer_phone.replace(/^\+/, '')}`} className="flex items-center gap-1 text-xs text-primary"><Phone className="h-3 w-3" /> {r.customer_phone}</a>}</div>
      ),
    },
    { key: 'since', header: 'Owing since', hideBelow: 'md', accessor: (r) => r.oldest_due, render: (r) => fmtDate(r.oldest_due) },
    {
      key: 'last', header: 'Last call', hideBelow: 'lg', accessor: (r) => r.last_note?.at ?? '',
      render: (r) => r.last_note
        ? <div className="text-sm"><p>{outcomeLabel(r.last_note.outcome)}</p><p className="text-xs text-muted-foreground">{fmtDate(r.last_note.at)}{r.last_note.by ? `, ${r.last_note.by}` : ''}</p></div>
        : <span className="text-muted-foreground">Not called yet</span>,
    },
    { key: 'balance', header: 'Owing', align: 'right', accessor: (r) => num(r.balance), render: (r) => <span className="font-semibold text-destructive tabular">{kes(r.balance)}</span> },
    { key: 'call', header: '', mobileAction: true, accessor: () => '', render: (r) => <Button size="sm" variant="outline" onClick={() => setCalling(r)}><PhoneCall /> Record call</Button> },
  ], [slug]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Owners the reminders have not moved. Call them, record what was agreed, and the ladder waits for any promised date.
      </p>
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.account_id}
        loading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        emptyText="Nobody to call. Accounts join this list when the reminders have not worked."
      />
      <CallSheet row={calling} onClose={() => setCalling(null)} />
    </div>
  );
}

/** The account a call is about: from the call list, or the account page. */
export interface CallTarget {
  account_id: string;
  account_ref: string;
  customer_name?: string;
  balance?: CallRow['balance'];
}

/** Records one collections call on an account. */
export function CallSheet({ row, onClose }: { row: CallTarget | null; onClose: () => void }) {
  const add = useAddCollectionNote(row?.account_id ?? '');
  const [outcome, setOutcome] = useState<CollectionNote['outcome']>('reached');
  const [promise, setPromise] = useState('');
  const [note, setNote] = useState('');
  const needsDate = outcome === 'promised';
  const reset = () => { setOutcome('reached'); setPromise(''); setNote(''); };

  return (
    <FormSheet
      open={!!row}
      onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}
      size="md"
      title={row ? `Call ${row.customer_name || row.account_ref}` : 'Record a call'}
      description={row ? `${row.account_ref}${row.balance != null ? `, owing ${kes(row.balance)}` : ''}` : undefined}
      footer={<>
        <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
        <Button disabled={add.isPending || (needsDate && !promise)}
          onClick={() => add.mutate({ outcome, promise_date: promise || undefined, note: note.trim() || undefined }, { onSuccess: () => { reset(); onClose(); } })}>
          {add.isPending ? 'Saving...' : 'Save'}
        </Button>
      </>}
    >
      <div className="space-y-4">
        <Field label="What happened" htmlFor="call-outcome">
          <NativeSelect id="call-outcome" value={outcome} onChange={(e) => setOutcome(e.target.value as CollectionNote['outcome'])}>
            {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Promised payment date" htmlFor="call-promise" required={needsDate}
          hint="The demand letter and escalation wait until this date.">
          <Input id="call-promise" type="date" value={promise} onChange={(e) => setPromise(e.target.value)} />
        </Field>
        <Field label="Note" htmlFor="call-note">
          <Input id="call-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="What was said" />
        </Field>
      </div>
    </FormSheet>
  );
}

/**
 * An account's collections state for the account page: where it stands on the ladder, any
 * promise to pay, and the calls made, with a button to record one.
 */
export function AccountCollections({ account }: { account: CallTarget }) {
  const { data: l, isLoading } = useLadder(account.account_id);
  const [calling, setCalling] = useState(false);
  const notes = [...(l?.notes ?? [])].reverse();
  if (isLoading || !l || (!l.episode && notes.length === 0)) return null;

  return (
    <section className="rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <div>
          <h2 className="font-semibold">Collections</h2>
          <p className="text-xs text-muted-foreground">
            {l.episode ? `Owing since ${fmtDate(l.episode)}` : 'Up to date'}
            {l.done?.length ? `; steps done on days ${l.done.join(', ')}` : ''}
            {l.call_list ? '; on the call list' : ''}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setCalling(true)}><PhoneCall /> Record call</Button>
      </div>
      <PaymentPlanPanel accountId={account.account_id} balance={account.balance} plan={l.plan} />
      {l.promise_date && (
        <p className="border-b bg-success/5 px-5 py-2 text-sm">Promised to pay by <strong>{fmtDate(l.promise_date)}</strong>; the letter and escalation wait until then.</p>
      )}
      {notes.length ? (
        <ul className="divide-y">
          {notes.map((n, i) => (
            <li key={`${n.at}-${i}`} className="px-5 py-3 text-sm">
              <p className="font-medium">{outcomeLabel(n.outcome)}{n.promise_date ? `, to pay by ${fmtDate(n.promise_date)}` : ''}</p>
              {n.text && <p className="text-muted-foreground">{n.text}</p>}
              <p className="text-xs text-muted-foreground">{fmtDate(n.at)}{n.by ? `, ${n.by}` : ''}</p>
            </li>
          ))}
        </ul>
      ) : <p className="px-5 py-4 text-sm text-muted-foreground">No calls recorded yet.</p>}
      <CallSheet row={calling ? account : null} onClose={() => setCalling(false)} />
    </section>
  );
}
