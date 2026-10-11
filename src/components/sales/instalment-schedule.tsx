'use client';

import { useMemo } from 'react';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/status-badge';
import type { Instalment } from '@/lib/api/types';
import { fmtDate, kes, num, titleCase } from '@/lib/utils';

const COLUMNS: DataTableColumn<Instalment>[] = [
  { key: 'seq', header: '#', accessor: (i) => i.seq, mobileHidden: true, render: (i) => <span className="tabular text-muted-foreground">{i.seq}</span> },
  { key: 'due', header: 'Due', primary: true, accessor: (i) => i.due_date, render: (i) => fmtDate(i.due_date) },
  { key: 'for', header: 'For', accessor: (i) => i.milestone_label || titleCase(i.kind) },
  { key: 'amount', header: 'Amount', align: 'right', accessor: (i) => num(i.amount), render: (i) => <span className="tabular">{kes(i.amount)}</span> },
  { key: 'paid', header: 'Paid', align: 'right', accessor: (i) => num(i.paid_amount), render: (i) => <span className="tabular">{kes(i.paid_amount ?? 0)}</span> },
  { key: 'status', header: 'Status', mobileAction: true, accessor: (i) => i.status ?? '', render: (i) => <StatusBadge status={i.status} /> },
];

/** A milestone not yet released: billed only when staff release it (the stage is reached). */
export const isUnreleasedMilestone = (i: Instalment) => i.kind === 'milestone' && i.status === 'scheduled';

/**
 * Payment schedule; the totals always equal the sum of the instalments shown. With `onRelease`,
 * unreleased milestones get a Release action.
 */
export function InstalmentSchedule({ instalments, onRelease }: { instalments: Instalment[]; onRelease?: (i: Instalment) => void }) {
  const columns = useMemo(() => (onRelease ? [...COLUMNS, {
    key: 'act', header: '', align: 'right', accessor: () => '',
    render: (i: Instalment) => (isUnreleasedMilestone(i) ? <Button size="sm" variant="outline" onClick={() => onRelease(i)}>Release</Button> : null),
  } as DataTableColumn<Instalment>] : COLUMNS), [onRelease]);
  const rows = [...instalments].sort((a, b) => a.seq - b.seq);
  const total = rows.reduce((s, i) => s + num(i.amount), 0);
  const paid = rows.reduce((s, i) => s + num(i.paid_amount), 0);
  return (
    <div className="space-y-2">
      <DataTable columns={columns} rows={rows} rowKey={(i) => i.id} pageSize={Math.max(rows.length, 10)} maxBodyHeight={false} />
      <p className="flex justify-end gap-6 text-sm font-semibold">
        <span>Total <span className="tabular">{kes(total)}</span></span>
        <span>Paid <span className="tabular">{kes(paid)}</span></span>
      </p>
    </div>
  );
}
