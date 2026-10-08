'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { KeysetTable } from '@/components/common/keyset-table';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { RunWizard } from '@/components/billing/run-wizard';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useBillingRuns, useFunds } from '@/hooks/use-billing';
import { useProperties } from '@/hooks/use-register';
import type { BillingRun } from '@/lib/api/types';
import { fmtDate, kes, num, periodLabel } from '@/lib/utils';
import { useSelectedPropertyId } from '@/store/property';

export default function BillingRunsPage() {
  const slug = useSlug();
  const router = useRouter();
  const { can } = useAccess();
  const propertyId = useSelectedPropertyId(slug);
  const runs = useBillingRuns(propertyId);
  const { data: properties = [] } = useProperties();
  const { data: funds = [] } = useFunds();
  const [open, setOpen] = useState(false);

  const columns = useMemo<DataTableColumn<BillingRun>[]>(() => {
    const propName = new Map(properties.map((p) => [p.id, p.name]));
    const fundName = new Map(funds.map((f) => [f.id, f.name]));
    return [
      {
        key: 'period', header: 'Month', primary: true, accessor: (r) => r.period,
        render: (r) => (
          <div><p className="font-semibold">{periodLabel(r.period)}</p>
            <p className="text-xs text-muted-foreground">{[propName.get(r.property_id), fundName.get(r.fund_id)].filter(Boolean).join(' · ')}</p></div>
        ),
      },
      { key: 'status', header: 'Status', mobileAction: true, accessor: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
      { key: 'issued', header: 'Bills', accessor: (r) => r.issued_count ?? 0, render: (r) => `${r.issued_count ?? 0} of ${(r.unit_count ?? 0) - (r.skipped_count ?? 0)}${r.failed_count ? `, ${r.failed_count} failed` : ''}` },
      { key: 'total', header: 'Total', align: 'right', accessor: (r) => num(r.total_amount), render: (r) => <span className="tabular">{kes(r.total_amount)}</span> },
      { key: 'due', header: 'Due', hideBelow: 'md', accessor: (r) => r.due_date ?? '', render: (r) => fmtDate(r.due_date) },
    ];
  }, [properties, funds]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Billing runs"
        subtitle="Monthly bills per property and fund. One run per month and fund; repeating it opens the same run."
        actions={can('billing.run') ? <Button onClick={() => setOpen(true)}><Plus /> New billing run</Button> : undefined}
      />
      <KeysetTable
        columns={columns}
        rows={runs.rows}
        rowKey={(r) => r.id}
        loading={runs.isLoading}
        error={runs.isError}
        onRetry={() => void runs.refetch()}
        hasMore={runs.hasMore}
        loadMore={() => void runs.loadMore()}
        loadingMore={runs.loadingMore}
        emptyText="No billing runs yet. Start with this month."
        onRowClick={(r) => router.push(`/${slug}/billing/runs/${r.id}`)}
      />
      <RunWizard open={open} onOpenChange={setOpen} />
    </div>
  );
}
