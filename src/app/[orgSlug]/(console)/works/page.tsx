'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Plus } from 'lucide-react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NativeSelect } from '@/components/common/field';
import { KeysetTable } from '@/components/common/keyset-table';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { WorkOrderForm } from '@/components/works/work-order-form';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useWorkOrders } from '@/hooks/use-works';
import type { WorkOrder } from '@/lib/api/types';
import { label, WORK_STATUS } from '@/lib/labels';
import { fmtDateTime, titleCase } from '@/lib/utils';
import { useSelectedPropertyId } from '@/store/property';

export default function WorksPage() {
  return <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-7xl" />}><Works /></Suspense>;
}

function Works() {
  const slug = useSlug();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { can } = useAccess();
  const propertyId = useSelectedPropertyId(slug);
  const [status, setStatus] = useState('');
  const [overdue, setOverdue] = useState(false);
  const [open, setOpen] = useState(false);
  const list = useWorkOrders({ property_id: propertyId, status, overdue });

  // The mobile "New request" button links here with ?new=1.
  useEffect(() => {
    if (sp.get('new') === '1' && can('works.manage')) {
      setOpen(true);
      router.replace(pathname);
    }
  }, [sp, can, router, pathname]);

  const columns = useMemo<DataTableColumn<WorkOrder>[]>(() => [
    {
      key: 'title', header: 'Work order', primary: true, accessor: (w) => w.title,
      render: (w) => (
        <div className="min-w-0">
          <p className="font-medium">{w.title}</p>
          <p className="text-xs text-muted-foreground">{w.number} · {titleCase(w.category)}{w.area ? ` · ${w.area}` : ''}</p>
        </div>
      ),
    },
    { key: 'priority', header: 'Priority', hideBelow: 'md', accessor: (w) => w.priority, render: (w) => <StatusBadge status={w.priority} /> },
    {
      key: 'due', header: 'Due', hideBelow: 'md', accessor: (w) => w.resolution_due_at ?? '',
      render: (w) => (
        <span className={w.sla_breached ? 'flex items-center gap-1 text-destructive' : ''}>
          {w.sla_breached && <AlertTriangle className="h-3.5 w-3.5" />}{fmtDateTime(w.resolution_due_at)}
        </span>
      ),
    },
    { key: 'status', header: 'Status', mobileAction: true, accessor: (w) => w.status, render: (w) => <StatusBadge status={w.status} label={label(WORK_STATUS, w.status)} /> },
  ], []);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Work orders"
        subtitle="Repairs and maintenance with response times"
        actions={can('works.manage') ? <Button onClick={() => setOpen(true)}><Plus /> New work order</Button> : undefined}
      />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <NativeSelect className="sm:w-48" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          {Object.entries(WORK_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </NativeSelect>
        <NativeSelect className="sm:w-48" value={overdue ? 'overdue' : 'all'} onChange={(e) => setOverdue(e.target.value === 'overdue')} aria-label="Due">
          <option value="all">All</option>
          <option value="overdue">Past response time</option>
        </NativeSelect>
      </div>
      <KeysetTable
        columns={columns}
        rows={list.rows}
        rowKey={(w) => w.id}
        loading={list.isLoading}
        error={list.isError}
        onRetry={() => void list.refetch()}
        hasMore={list.hasMore}
        loadMore={() => void list.loadMore()}
        loadingMore={list.loadingMore}
        emptyText="No work orders."
        onRowClick={(w) => router.push(`/${slug}/works/${w.id}`)}
        exportFileName="work-orders"
      />
      <WorkOrderForm open={open} onOpenChange={setOpen} />
    </div>
  );
}
