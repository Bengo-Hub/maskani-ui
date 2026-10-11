'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ShieldCheck, X } from 'lucide-react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Field, NativeSelect, TextArea } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { KeysetTable } from '@/components/common/keyset-table';
import { PageHeader } from '@/components/common/page-header';
import { SectionLayout, type Section } from '@/components/common/section-nav';
import { StatusBadge } from '@/components/common/status-badge';
import { APPROVAL_MODULE, ApprovalProgress, RULE_MODULES } from '@/components/approvals/approval-progress';
import { useSlug } from '@/hooks/use-access';
import { useApprovals, useDecideApproval } from '@/hooks/use-settings';
import { useUrlParam } from '@/hooks/use-url-param';
import { apiErrorMessage } from '@/lib/api/errors';
import type { ApprovalRequest } from '@/lib/api/types';
import { fmtDate, kes, num } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useSelectedPropertyId } from '@/store/property';

const TABS = ['mine', 'pending', 'decided'] as const;
type Tab = (typeof TABS)[number];

export default function ApprovalsPage() {
  return <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-7xl" />}><Approvals /></Suspense>;
}

/** Where the object behind a request lives, so the approver can check it before deciding. */
function objectLink(slug: string, r: ApprovalRequest): string | undefined {
  const acc = r.metadata?.account_id;
  switch (r.module) {
    case 'credit_note': case 'adjustment': case 'manual_payment':
      return acc ? `/${slug}/billing/accounts/${acc}` : undefined;
    case 'work_order_quote':
      return `/${slug}/works/${r.object_id}`;
    case 'restructure':
      return r.metadata?.contract_id ? `/${slug}/sales/contracts/${r.metadata.contract_id}` : undefined;
  }
  return undefined;
}

/**
 * The central approvals inbox: every workflow that needs sign-off (credits, waivers, manual
 * payments, work order quotes, and more as they land), decided step by step. "Waiting for me" lists
 * requests whose current step the caller's role or permission may act on.
 */
function Approvals() {
  const slug = useSlug();
  const myId = useAuthStore((s) => s.me?.id);
  const propertyId = useSelectedPropertyId(slug);
  const [tab, setTab] = useUrlParam<Tab>('tab', 'mine', TABS);
  const [module, setModule] = useUrlParam('module', '');
  const [decided, setDecided] = useState<'approved' | 'rejected'>('approved');
  const status = tab === 'decided' ? decided : 'pending';
  const list = useApprovals({ status, module, mine: tab === 'mine', propertyId });
  const mineCount = useApprovals({ status: 'pending', module: '', mine: true, propertyId });
  const decide = useDecideApproval();
  const [acting, setActing] = useState<{ r: ApprovalRequest; d: 'approve' | 'reject' } | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const columns = useMemo<DataTableColumn<ApprovalRequest>[]>(() => [
    {
      key: 'what', header: 'What', primary: true, accessor: (r) => r.metadata?.label ?? r.object_reference,
      render: (r) => {
        const href = objectLink(slug, r);
        const label = r.metadata?.label || r.object_reference || APPROVAL_MODULE[r.module];
        return (
          <div className="min-w-0">
            {href ? <Link href={href} className="font-medium text-primary hover:underline">{label}</Link> : <p className="font-medium">{label}</p>}
            <p className="text-xs text-muted-foreground">{APPROVAL_MODULE[r.module]}{r.metadata?.account_ref ? `, ${r.metadata.account_ref}` : ''}{r.metadata?.unit_code ? ` (${r.metadata.unit_code})` : ''}</p>
            {r.metadata?.reason && <p className="line-clamp-2 text-xs text-muted-foreground">{r.metadata.reason}</p>}
          </div>
        );
      },
    },
    { key: 'amt', header: 'Amount', align: 'right', accessor: (r) => num(r.amount), render: (r) => <span className="font-semibold tabular">{kes(r.amount)}</span> },
    {
      key: 'by', header: 'Sent by', hideBelow: 'lg', accessor: (r) => r.submitted_by_name ?? '',
      render: (r) => <div className="text-sm"><p>{r.submitted_by_name || 'Staff'}</p><p className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</p></div>,
    },
    { key: 'steps', header: 'Steps', hideBelow: 'md', accessor: (r) => r.current_sequence, render: (r) => <ApprovalProgress request={r} /> },
    tab === 'decided'
      ? { key: 'res', header: 'Result', mobileAction: true, accessor: (r) => r.status, render: (r) => <StatusBadge status={r.status === 'approved' ? 'paid' : r.status} label={r.status === 'approved' ? 'Approved' : 'Rejected'} /> }
      : {
        key: 'act', header: '', mobileAction: true, accessor: () => '',
        render: (r) => r.submitted_by && r.submitted_by === myId
          ? <span className="text-xs text-muted-foreground">You sent this</span>
          : (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => { setComment(''); setError(''); setActing({ r, d: 'reject' }); }}><X /> Reject</Button>
              <Button size="sm" onClick={() => { setComment(''); setError(''); setActing({ r, d: 'approve' }); }}><Check /> Approve</Button>
            </div>
          ),
      },
  ], [slug, tab, myId]);

  const sections: Section<Tab>[] = [
    { value: 'mine', label: 'Waiting for me', icon: ShieldCheck, count: mineCount.rows.length || undefined, hint: 'Steps your role can decide' },
    { value: 'pending', label: 'All waiting', icon: ShieldCheck, hint: 'Every open approval you can see' },
    { value: 'decided', label: 'Decided', icon: Check, hint: 'Approved and rejected' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title="Approvals" subtitle="Credits, waivers, manual payments and quotes waiting for sign-off, step by step." />
      <SectionLayout sections={sections} value={tab} onChange={(v) => setTab(v)}>
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <NativeSelect className="sm:w-56" value={module} onChange={(e) => setModule(e.target.value)} aria-label="Workflow">
              <option value="">Every workflow</option>
              {RULE_MODULES.map((m) => <option key={m} value={m}>{APPROVAL_MODULE[m]}</option>)}
            </NativeSelect>
            {tab === 'decided' && (
              <NativeSelect className="sm:w-44" value={decided} onChange={(e) => setDecided(e.target.value as typeof decided)} aria-label="Result">
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </NativeSelect>
            )}
          </div>
          <KeysetTable
            columns={columns}
            rows={list.rows}
            rowKey={(r) => r.id}
            loading={list.isLoading}
            error={list.isError}
            onRetry={() => void list.refetch()}
            hasMore={list.hasMore}
            loadMore={() => void list.loadMore()}
            loadingMore={list.loadingMore}
            emptyText={tab === 'mine' ? 'Nothing is waiting for you.' : 'None.'}
          />
        </div>
      </SectionLayout>
      <FormSheet
        open={!!acting}
        onOpenChange={(o) => !o && setActing(null)}
        size="sm"
        title={acting?.d === 'reject' ? 'Reject this?' : 'Approve this step?'}
        description={acting ? `${acting.r.metadata?.label || APPROVAL_MODULE[acting.r.module]}, ${kes(acting.r.amount)}` : undefined}
        footer={<>
          <Button variant="outline" onClick={() => setActing(null)}>Cancel</Button>
          <Button variant={acting?.d === 'reject' ? 'destructive' : 'default'} disabled={decide.isPending || (acting?.d === 'reject' && !comment.trim())}
            onClick={() => acting && decide.mutate({ id: acting.r.id, decision: acting.d, comment: comment.trim() || undefined },
              { onSuccess: () => setActing(null), onError: (e) => setError(apiErrorMessage(e)) })}>
            {acting?.d === 'reject' ? 'Reject' : 'Approve'}
          </Button>
        </>}
      >
        <Field label={acting?.d === 'reject' ? 'Reason' : 'Comment'} htmlFor="ap-comment" required={acting?.d === 'reject'}
          hint={acting?.d === 'reject' ? 'The person who sent it sees this.' : 'Optional'} error={error || undefined}>
          <TextArea id="ap-comment" rows={3} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
      </FormSheet>
    </div>
  );
}
