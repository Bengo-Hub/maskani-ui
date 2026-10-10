'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Hand, MessageSquareReply } from 'lucide-react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { Field, NativeSelect, TextArea } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { KeysetTable } from '@/components/common/keyset-table';
import { StatusBadge } from '@/components/common/status-badge';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useAnswerBillQuery, useBillQueries } from '@/hooks/use-billing';
import { apiErrorMessage } from '@/lib/api/errors';
import type { BillQuery } from '@/lib/api/types';
import { fmtDate } from '@/lib/utils';

const STATUS_LABEL: Record<BillQuery['status'], string> = { open: 'New', in_review: 'Being checked', resolved: 'Resolved', rejected: 'Answered, no change' };

/**
 * Residents' bill queries. Finance takes one (so others see it is being checked), then answers:
 * resolved (with what was done, for example a credit raised from the account page) or answered
 * with no change. The resident is emailed the answer and sees it on the portal.
 */
export function BillQueries({ propertyId }: { propertyId: string }) {
  const slug = useSlug();
  const { can } = useAccess();
  const answerable = can('billing.adjust') || can('billing.manage');
  const [status, setStatus] = useState<'open' | 'in_review' | 'resolved' | 'rejected'>('open');
  const list = useBillQueries(status, propertyId);
  const answer = useAnswerBillQuery();
  const [answering, setAnswering] = useState<BillQuery | null>(null);
  const [outcome, setOutcome] = useState<'resolved' | 'rejected'>('resolved');
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const columns = useMemo<DataTableColumn<BillQuery>[]>(() => {
    const now = Date.now();
    return [
      {
        key: 'acct', header: 'Account', primary: true, accessor: (q) => q.metadata?.account_ref ?? '',
        render: (q) => (
          <div><Link href={`/${slug}/billing/accounts/${q.unit_account_id}`} className="font-mono font-semibold text-primary hover:underline">{q.metadata?.account_ref ?? 'Account'}</Link>
            <p className="text-xs text-muted-foreground">{q.metadata?.unit_code}{q.metadata?.invoice_number ? `, bill ${q.metadata.invoice_number}` : ''}</p></div>
        ),
      },
      {
        key: 'q', header: 'Query', accessor: (q) => q.subject,
        render: (q) => <div className="max-w-md"><p className="font-medium">{q.subject}</p><p className="line-clamp-2 text-xs text-muted-foreground">{q.body}</p></div>,
      },
      { key: 'from', header: 'From', hideBelow: 'lg', accessor: (q) => q.metadata?.raised_by_name ?? '', render: (q) => <div className="text-sm"><p>{q.metadata?.raised_by_name || 'Resident'}</p><p className="text-xs text-muted-foreground">{fmtDate(q.created_at)}</p></div> },
      status === 'open' || status === 'in_review'
        ? {
          key: 'due', header: 'Answer by', hideBelow: 'md', accessor: (q) => q.due_by ?? '',
          render: (q) => <span className={q.due_by && new Date(q.due_by).getTime() < now ? 'font-medium text-destructive' : ''}>{fmtDate(q.due_by)}</span>,
        }
        : { key: 'ans', header: 'Answer', hideBelow: 'md', accessor: (q) => q.resolution ?? '', render: (q) => <p className="line-clamp-2 max-w-xs text-sm">{q.resolution}</p> },
      {
        key: 'act', header: '', mobileAction: true, accessor: (q) => q.status,
        render: (q) => (q.status === 'open' || q.status === 'in_review') && answerable ? (
          <div className="flex justify-end gap-2">
            {q.status === 'open' && <Button size="sm" variant="outline" disabled={answer.isPending} onClick={() => answer.mutate({ id: q.id, status: 'in_review' })}><Hand /> Take</Button>}
            <Button size="sm" onClick={() => { setText(''); setOutcome('resolved'); setError(''); setAnswering(q); }}><MessageSquareReply /> Answer</Button>
          </div>
        ) : <StatusBadge status={q.status === 'resolved' ? 'paid' : q.status === 'rejected' ? 'closed' : 'pending'} label={STATUS_LABEL[q.status]} />,
      },
    ];
  }, [slug, status, answerable, answer]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Residents can query a bill within 30 days of it. Answer within 7 days.</p>
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-44" aria-label="Show">
          <option value="open">New</option>
          <option value="in_review">Being checked</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Answered, no change</option>
        </NativeSelect>
      </div>
      <KeysetTable
        columns={columns}
        rows={list.rows}
        rowKey={(q) => q.id}
        loading={list.isLoading}
        error={list.isError}
        onRetry={() => void list.refetch()}
        hasMore={list.hasMore}
        loadMore={() => void list.loadMore()}
        loadingMore={list.loadingMore}
        emptyText={status === 'open' ? 'No new queries.' : 'None yet.'}
      />
      <FormSheet
        open={!!answering}
        onOpenChange={(o) => !o && setAnswering(null)}
        size="md"
        title={answering ? `Answer: ${answering.subject}` : 'Answer'}
        description={answering?.body}
        footer={<>
          <Button variant="outline" onClick={() => setAnswering(null)}>Cancel</Button>
          <Button disabled={!text.trim() || answer.isPending}
            onClick={() => answering && answer.mutate({ id: answering.id, status: outcome, resolution: text.trim() },
              { onSuccess: () => setAnswering(null), onError: (e) => setError(apiErrorMessage(e)) })}>
            Send the answer
          </Button>
        </>}
      >
        <div className="space-y-4">
          <Field label="Outcome" htmlFor="bq-outcome">
            <NativeSelect id="bq-outcome" value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)}>
              <option value="resolved">Resolved (the bill was corrected or credited)</option>
              <option value="rejected">No change (the bill is right)</option>
            </NativeSelect>
          </Field>
          <Field label="Answer" htmlFor="bq-answer" required hint="The resident is emailed this and sees it on the portal." error={error || undefined}>
            <TextArea id="bq-answer" rows={4} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)}
              placeholder={outcome === 'resolved' ? 'We re-read the meter and credited KES 1,200 on the bill.' : 'The reading was confirmed with a photo; the bill stands.'} />
          </Field>
          {answering && outcome === 'resolved' && can('billing.adjust') && (
            <p className="text-sm">Need to credit the bill? <Link href={`/${slug}/billing/accounts/${answering.unit_account_id}`} className="font-medium text-primary hover:underline">Open the account</Link> and use Credit a bill first.</p>
          )}
        </div>
      </FormSheet>
    </div>
  );
}
