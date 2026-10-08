'use client';

import { use, useEffect, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { WorkActionSheet } from '@/components/works/work-action-sheet';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useWorkOrder } from '@/hooks/use-works';
import { mediaApi } from '@/lib/api/operations';
import type { WorkAction, WorkStatus } from '@/lib/api/types';
import { label, WORK_STATUS } from '@/lib/labels';
import { fmtDateTime, kes, num, titleCase } from '@/lib/utils';

/** Actions offered per status; the API remains the authority on transitions. */
const NEXT: Partial<Record<WorkStatus, WorkAction[]>> = {
  requested: ['assign', 'cancel'],
  triaged: ['assign', 'cancel'],
  reopened: ['assign', 'start', 'cancel'],
  assigned: ['quote', 'start', 'cancel'],
  quoted: ['approve_quote', 'cancel'],
  approved: ['start'],
  in_progress: ['complete'],
  completed: ['confirm', 'reopen', 'close'],
  confirmed: ['close'],
};

const ACTION_LABEL: Record<WorkAction, string> = {
  assign: 'Assign', quote: 'Record quote', approve_quote: 'Approve quote', start: 'Start', complete: 'Complete',
  confirm: 'Confirm', reopen: 'Reopen', cancel: 'Cancel', close: 'Close',
};

function useSigned(slug: string, keys: string[]) {
  const [urls, setUrls] = useState<string[]>([]);
  const joined = keys.join('|');
  useEffect(() => {
    const list = joined ? joined.split('|') : [];
    if (!list.length) { setUrls([]); return; }
    mediaApi.sign(slug, list).then((r) => setUrls(list.map((k) => r.urls?.[k]).filter(Boolean) as string[])).catch(() => setUrls([]));
  }, [slug, joined]);
  return urls;
}

export default function WorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const slug = useSlug();
  const { can } = useAccess();
  const { data: wo, isLoading } = useWorkOrder(id);
  const [action, setAction] = useState<WorkAction | null>(null);
  const before = useSigned(slug, wo?.photos_before ?? []);
  const after = useSigned(slug, wo?.photos_after ?? []);

  if (isLoading || !wo) return <div className="mx-auto max-w-4xl space-y-3"><Skeleton className="h-10 w-56" /><Skeleton className="h-64" /></div>;
  const actions = can('works.manage') ? NEXT[wo.status] ?? [] : [];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back={{ href: `/${slug}/works`, label: 'Work orders' }}
        title={wo.title}
        subtitle={<span className="inline-flex flex-wrap items-center gap-2">{wo.number} <StatusBadge status={wo.status} label={label(WORK_STATUS, wo.status)} /> <StatusBadge status={wo.priority} /></span>}
        actions={actions.length ? <>{actions.map((a) => (
          <Button key={a} variant={a === 'cancel' || a === 'reopen' ? 'outline' : 'default'} onClick={() => setAction(a)}>{ACTION_LABEL[a]}</Button>
        ))}</> : undefined}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            {wo.description && <p className="whitespace-pre-line">{wo.description}</p>}
            <dl className="grid grid-cols-2 gap-3">
              <div><dt className="text-xs text-muted-foreground">Category</dt><dd>{titleCase(wo.category)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Where</dt><dd>{wo.area || (wo.unit_id ? 'Unit' : 'Common area')}</dd></div>
              <div>
                <dt className="text-xs text-muted-foreground">Fix by</dt>
                <dd className={wo.sla_breached ? 'flex items-center gap-1 text-destructive' : 'flex items-center gap-1'}>
                  {wo.sla_breached ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}{fmtDateTime(wo.resolution_due_at) || 'No target'}
                </dd>
              </div>
              <div><dt className="text-xs text-muted-foreground">Source</dt><dd>{titleCase(wo.source)}</dd></div>
              {num(wo.quote_amount) > 0 && <div><dt className="text-xs text-muted-foreground">Quote</dt><dd>{kes(wo.quote_amount)} ({titleCase(wo.quote_status)})</dd></div>}
              {num(wo.cost_amount) > 0 && <div><dt className="text-xs text-muted-foreground">Cost</dt><dd>{kes(wo.cost_amount)}{wo.recharge ? ', billed to owner' : ''}</dd></div>}
            </dl>
            {before.length > 0 && <div><p className="mb-2 text-xs text-muted-foreground">Before</p><div className="grid grid-cols-3 gap-2">{before.map((u) => <img key={u} src={u} alt="" className="aspect-square rounded-lg object-cover" />)}</div></div>}
            {after.length > 0 && <div><p className="mb-2 text-xs text-muted-foreground">After</p><div className="grid grid-cols-3 gap-2">{after.map((u) => <img key={u} src={u} alt="" className="aspect-square rounded-lg object-cover" />)}</div></div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-3 border-l pl-4">
              {(wo.edges?.events ?? []).map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                  <p className="font-medium">{e.to_status ? label(WORK_STATUS, e.to_status) : titleCase(e.kind)}</p>
                  {e.note && <p className="text-muted-foreground">{e.note}</p>}
                  <p className="text-xs text-muted-foreground">{fmtDateTime(e.created_at)}{e.actor_kind ? ` · ${e.actor_kind}` : ''}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
      <WorkActionSheet workOrderId={wo.id} action={action} onClose={() => setAction(null)} />
    </div>
  );
}
