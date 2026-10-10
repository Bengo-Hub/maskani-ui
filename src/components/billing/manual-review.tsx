'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { KeysetTable } from '@/components/common/keyset-table';
import { StatusBadge } from '@/components/common/status-badge';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useManualPaymentReview, useManualPayments } from '@/hooks/use-billing';
import type { ManualPayment } from '@/lib/api/types';
import { fmtDate, kes, num } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

const METHOD_LABEL: Record<ManualPayment['method'], string> = {
  bank_transfer: 'Bank transfer', cash: 'Cash', cheque: 'Cheque', mpesa: 'M-Pesa code',
};

/**
 * Payments recorded by hand (bank, cash, cheque, an M-Pesa code, or a resident's bank reference
 * for a large amount) waiting to be verified. A reviewer checks the money arrived, then approves
 * (it is booked against the account) or rejects with a reason. Nobody approves their own entry.
 */
export function ManualReview({ propertyId }: { propertyId: string }) {
  const slug = useSlug();
  const { can } = useAccess();
  const myId = useAuthStore((s) => s.me?.id);
  const verify = can('billing.verify');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const list = useManualPayments(status, propertyId);
  const review = useManualPaymentReview();
  const [rejecting, setRejecting] = useState<ManualPayment | null>(null);
  const [reason, setReason] = useState('');

  const columns = useMemo<DataTableColumn<ManualPayment>[]>(() => [
    {
      key: 'acct', header: 'Account', primary: true, accessor: (m) => m.metadata?.account_ref ?? '',
      render: (m) => (
        <div><Link href={`/${slug}/billing/accounts/${m.unit_account_id}`} className="font-mono font-semibold text-primary hover:underline">{m.metadata?.account_ref ?? 'Account'}</Link>
          <p className="text-xs text-muted-foreground">{m.metadata?.unit_code}{m.metadata?.portal ? ', from the resident' : ''}</p></div>
      ),
    },
    {
      key: 'how', header: 'Paid by', accessor: (m) => m.method,
      render: (m) => <div><p>{METHOD_LABEL[m.method]}</p><p className="font-mono text-xs text-muted-foreground">{m.reference}</p></div>,
    },
    { key: 'on', header: 'Paid on', hideBelow: 'md', accessor: (m) => m.paid_on, render: (m) => fmtDate(m.paid_on) },
    { key: 'by', header: 'Recorded by', hideBelow: 'lg', accessor: (m) => m.submitted_by_name ?? '', render: (m) => <div className="text-sm"><p>{m.submitted_by_name || 'Unknown'}</p><p className="text-xs text-muted-foreground">{fmtDate(m.created_at)}</p></div> },
    { key: 'amt', header: 'Amount', align: 'right', accessor: (m) => num(m.amount), render: (m) => <span className="font-semibold tabular">{kes(m.amount)}</span> },
    status === 'pending'
      ? {
        key: 'act', header: '', mobileAction: true, accessor: () => '',
        render: (m) => verify ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => { setReason(''); setRejecting(m); }}><X /> Reject</Button>
            <Button size="sm" disabled={review.approve.isPending || (!!myId && m.submitted_by === myId)}
              title={myId && m.submitted_by === myId ? 'Someone else must verify a payment you recorded' : undefined}
              onClick={() => review.approve.mutate({ id: m.id })}><Check /> Verify</Button>
          </div>
        ) : <span className="text-xs text-muted-foreground">Waiting for review</span>,
      }
      : {
        key: 'rev', header: 'Reviewed', mobileAction: true, accessor: (m) => m.reviewed_at ?? '',
        render: (m) => <div className="text-sm"><StatusBadge status={m.status} /><p className="text-xs text-muted-foreground">{m.reviewed_by_name}{m.review_note ? `: ${m.review_note}` : ''}</p></div>,
      },
  ], [slug, status, verify, review.approve, myId]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Check the money reached the bank or till before verifying; it is then booked against the account.</p>
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-44" aria-label="Show">
          <option value="pending">Waiting for review</option>
          <option value="approved">Verified</option>
          <option value="rejected">Rejected</option>
        </NativeSelect>
      </div>
      <KeysetTable
        columns={columns}
        rows={list.rows}
        rowKey={(m) => m.id}
        loading={list.isLoading}
        error={list.isError}
        onRetry={() => void list.refetch()}
        hasMore={list.hasMore}
        loadMore={() => void list.loadMore()}
        loadingMore={list.loadingMore}
        emptyText={status === 'pending' ? 'Nothing waiting for review.' : 'None yet.'}
      />
      <FormSheet
        open={!!rejecting}
        onOpenChange={(o) => !o && setRejecting(null)}
        size="sm"
        title="Reject this payment?"
        description={rejecting ? `${METHOD_LABEL[rejecting.method]} ${rejecting.reference}, ${kes(rejecting.amount)}` : undefined}
        footer={<>
          <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
          <Button variant="destructive" disabled={!reason.trim() || review.reject.isPending}
            onClick={() => rejecting && review.reject.mutate({ id: rejecting.id, reason: reason.trim() }, { onSuccess: () => setRejecting(null) })}>
            Reject
          </Button>
        </>}
      >
        <Field label="Reason" htmlFor="rej-reason" required hint="The person who recorded it sees this.">
          <Input id="rej-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Not on the bank statement" />
        </Field>
      </FormSheet>
    </div>
  );
}
