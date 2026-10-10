'use client';

import { useMemo, useState } from 'react';
import { MessageSquareWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect, TextArea } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { StatusBadge } from '@/components/common/status-badge';
import { useMyBillQueries, useRaiseBillQuery } from '@/hooks/use-portal';
import { apiErrorMessage } from '@/lib/api/errors';
import type { BillQuery, LedgerInvoice } from '@/lib/api/types';
import { fmtDate, kes } from '@/lib/utils';

const WINDOW_DAYS = 30;
const STATUS_LABEL: Record<BillQuery['status'], string> = { open: 'Sent', in_review: 'Being checked', resolved: 'Resolved', rejected: 'Answered' };

/** Lets a resident query a bill from the last 30 days (or the account in general). */
export function QueryBill({ accountId, invoices }: { accountId: string; invoices: LedgerInvoice[] }) {
  const [open, setOpen] = useState(false);
  const raise = useRaiseBillQuery(accountId);
  const recent = useMemo(() => {
    const since = Date.now() - WINDOW_DAYS * 86400000;
    return invoices.filter((i) => new Date(i.invoice_date).getTime() >= since);
  }, [invoices]);
  const [f, setF] = useState({ invoice: '', subject: '', body: '' });
  const [error, setError] = useState('');
  const close = () => { setOpen(false); setError(''); setF({ invoice: '', subject: '', body: '' }); };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}><MessageSquareWarning /> Query a bill</Button>
      <FormSheet
        open={open}
        onOpenChange={(o) => !o && close()}
        size="md"
        title="Query a bill"
        description="The estate office answers within 7 days. Keep paying what you agree with in the meantime."
        footer={<>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button disabled={!f.subject.trim() || !f.body.trim() || raise.isPending}
            onClick={() => raise.mutate({ invoice_id: f.invoice || undefined, subject: f.subject.trim(), body: f.body.trim() },
              { onSuccess: close, onError: (e) => setError(apiErrorMessage(e)) })}>
            {raise.isPending ? 'Sending...' : 'Send query'}
          </Button>
        </>}
      >
        <div className="space-y-4">
          <Field label="Bill" htmlFor="qb-bill" hint="Bills from the last 30 days. Contact the office about older ones.">
            <NativeSelect id="qb-bill" value={f.invoice} onChange={(e) => setF({ ...f, invoice: e.target.value })}>
              <option value="">The account in general</option>
              {recent.map((i) => <option key={i.id} value={i.id}>{`${i.invoice_number}, ${fmtDate(i.invoice_date)}, ${kes(i.total_amount)}`}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Subject" htmlFor="qb-subject" required>
            <Input id="qb-subject" maxLength={120} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="Water charge looks too high" />
          </Field>
          <Field label="What looks wrong" htmlFor="qb-body" required error={error || undefined}>
            <TextArea id="qb-body" rows={4} maxLength={2000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })}
              placeholder="The bill shows 45 m3 but we were away most of the month." />
          </Field>
        </div>
      </FormSheet>
    </>
  );
}

/** The resident's queries on one account, with the office's answers. */
export function MyBillQueries({ accountId }: { accountId: string }) {
  const { rows, isLoading } = useMyBillQueries();
  const mine = rows.filter((q) => q.unit_account_id === accountId);
  if (isLoading || mine.length === 0) return null;
  return (
    <Card>
      <CardHeader><CardTitle>Your queries</CardTitle></CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {mine.map((q) => (
            <li key={q.id} className="space-y-1 px-4 py-3 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{q.subject}</p>
                <StatusBadge status={q.status === 'resolved' ? 'paid' : q.status === 'rejected' ? 'closed' : 'pending'} label={STATUS_LABEL[q.status]} />
              </div>
              <p className="text-xs text-muted-foreground">{fmtDate(q.created_at)}{q.metadata?.invoice_number ? `, bill ${q.metadata.invoice_number}` : ''}</p>
              {q.resolution && <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">{q.resolution}</p>}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
