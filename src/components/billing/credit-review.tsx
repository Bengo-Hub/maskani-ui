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
import { useAdjustmentReview, useAdjustments } from '@/hooks/use-billing';
import type { Adjustment } from '@/lib/api/types';
import { fmtDate, kes, num } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

const KIND: Record<Adjustment['kind'], string> = { credit_note: 'Credit note', waiver: 'Waiver', debit: 'Debit', write_off: 'Write-off' };
const STATUS_LABEL: Record<Adjustment['status'], string> = {
  pending_approval: 'Waiting', approved: 'Approved, not raised yet', rejected: 'Rejected', applied: 'Credited',
};

/**
 * Credit notes and waivers waiting for approval, and their history. The approval rule for the
 * amount decides how many approvals and whose; the requester never approves their own. An
 * approved one whose credit note did not go through shows "Approved, not raised yet": approving
 * again retries it.
 */
export function CreditReview({ propertyId }: { propertyId: string }) {
  const slug = useSlug();
  const { can } = useAccess();
  const myId = useAuthStore((s) => s.me?.id);
  const approve = can('billing.approve');
  const [status, setStatus] = useState<Adjustment['status']>('pending_approval');
  const list = useAdjustments(status, propertyId);
  const review = useAdjustmentReview();
  const [rejecting, setRejecting] = useState<Adjustment | null>(null);
  const [reason, setReason] = useState('');

  const columns = useMemo<DataTableColumn<Adjustment>[]>(() => [
    {
      key: 'acct', header: 'Account', primary: true, accessor: (a) => a.metadata?.account_ref ?? '',
      render: (a) => (
        <div><Link href={`/${slug}/billing/accounts/${a.unit_account_id}`} className="font-mono font-semibold text-primary hover:underline">{a.metadata?.account_ref ?? 'Account'}</Link>
          <p className="text-xs text-muted-foreground">{a.metadata?.unit_code}{a.metadata?.invoice_number ? `, bill ${a.metadata.invoice_number}` : ''}</p></div>
      ),
    },
    { key: 'kind', header: 'Type', accessor: (a) => KIND[a.kind], render: (a) => <div><p>{KIND[a.kind]}</p><p className="line-clamp-2 max-w-xs text-xs text-muted-foreground">{a.reason}</p></div> },
    {
      key: 'by', header: 'Asked by', hideBelow: 'lg', accessor: (a) => a.metadata?.requested_by_name ?? '',
      render: (a) => <div className="text-sm"><p>{a.metadata?.requested_by_name || 'Finance'}</p><p className="text-xs text-muted-foreground">{fmtDate(a.created_at)}</p></div>,
    },
    {
      key: 'approvals', header: 'Approvals', hideBelow: 'md', accessor: (a) => a.approvals?.length ?? 0,
      render: (a) => (a.approvals?.length ? <span className="text-sm">{a.approvals.map((x) => x.name || 'Approver').join(', ')}</span> : <span className="text-xs text-muted-foreground">None yet</span>),
    },
    { key: 'amt', header: 'Amount', align: 'right', accessor: (a) => num(a.amount), render: (a) => <span className="font-semibold tabular">{kes(a.amount)}</span> },
    status === 'pending_approval' || status === 'approved'
      ? {
        key: 'act', header: '', mobileAction: true, accessor: () => '',
        render: (a) => approve ? (
          <div className="flex justify-end gap-2">
            {a.status === 'pending_approval' && <Button size="sm" variant="outline" onClick={() => { setReason(''); setRejecting(a); }}><X /> Reject</Button>}
            <Button size="sm" disabled={review.approve.isPending || (!!myId && a.requested_by === myId)}
              title={myId && a.requested_by === myId ? 'Someone else must approve a credit you asked for' : undefined}
              onClick={() => review.approve.mutate({ id: a.id })}><Check /> {a.status === 'approved' ? 'Retry' : 'Approve'}</Button>
          </div>
        ) : <span className="text-xs text-muted-foreground">Waiting for approval</span>,
      }
      : {
        key: 'res', header: 'Result', mobileAction: true, accessor: (a) => a.status,
        render: (a) => (
          <div className="text-sm"><StatusBadge status={a.status === 'applied' ? 'paid' : a.status} label={STATUS_LABEL[a.status]} />
            <p className="text-xs text-muted-foreground">{a.status === 'applied' ? a.metadata?.credit_note_number : a.metadata?.rejected_reason}</p></div>
        ),
      },
  ], [slug, status, approve, review.approve, myId]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Credits change the account only once approved. Ask for one from the account page.</p>
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as Adjustment['status'])} className="w-48" aria-label="Show">
          <option value="pending_approval">Waiting for approval</option>
          <option value="approved">Approved, not raised yet</option>
          <option value="applied">Credited</option>
          <option value="rejected">Rejected</option>
        </NativeSelect>
      </div>
      <KeysetTable
        columns={columns}
        rows={list.rows}
        rowKey={(a) => a.id}
        loading={list.isLoading}
        error={list.isError}
        onRetry={() => void list.refetch()}
        hasMore={list.hasMore}
        loadMore={() => void list.loadMore()}
        loadingMore={list.loadingMore}
        emptyText={status === 'pending_approval' ? 'Nothing waiting for approval.' : 'None yet.'}
      />
      <FormSheet
        open={!!rejecting}
        onOpenChange={(o) => !o && setRejecting(null)}
        size="sm"
        title="Reject this credit?"
        description={rejecting ? `${KIND[rejecting.kind]} of ${kes(rejecting.amount)} on ${rejecting.metadata?.account_ref ?? 'the account'}` : undefined}
        footer={<>
          <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
          <Button variant="destructive" disabled={!reason.trim() || review.reject.isPending}
            onClick={() => rejecting && review.reject.mutate({ id: rejecting.id, reason: reason.trim() }, { onSuccess: () => setRejecting(null) })}>
            Reject
          </Button>
        </>}
      >
        <Field label="Reason" htmlFor="adj-rej" required hint="Finance sees this.">
          <Input id="adj-rej" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="The bill was right; the reading was confirmed" />
        </Field>
      </FormSheet>
    </div>
  );
}
