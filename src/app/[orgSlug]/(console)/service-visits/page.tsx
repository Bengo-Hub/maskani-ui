'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { PageHeader } from '@/components/common/page-header';
import { PhotoPicker, type PickedPhoto } from '@/components/common/photo-picker';
import { PropertyRequired, usePropertyOrSingle } from '@/components/common/property-required';
import { StatusBadge } from '@/components/common/status-badge';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useRecordVisit, useServiceVisits } from '@/hooks/use-vendor-ops';
import { useVendors } from '@/hooks/use-works';
import type { ServiceVisit } from '@/lib/api/types';
import { fmtDate, fmtDateTime } from '@/lib/utils';

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Monday of the week holding d. */
const weekStart = (d: Date) => {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
};

const STATUS_LABEL: Record<string, string> = { scheduled: 'Due', completed: 'Done', partial: 'Part done', missed: 'Missed' };

/**
 * A week of contracted vendor visits at the property: cleaning, security patrols, garden care.
 * Staff record a visit as done or part done with photos; one not recorded by its day is marked
 * missed overnight, which is the evidence for the contract's service credits.
 */
export default function ServiceVisitsPage() {
  const slug = useSlug();
  const { can } = useAccess();
  const propertyId = usePropertyOrSingle();
  const [start, setStart] = useState(() => weekStart(new Date()));
  const [status, setStatus] = useState('');
  const [recording, setRecording] = useState<ServiceVisit | null>(null);
  const [result, setResult] = useState<'completed' | 'partial'>('completed');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const end = useMemo(() => { const e = new Date(start); e.setDate(e.getDate() + 6); return e; }, [start]);
  const visits = useServiceVisits({ property_id: propertyId, from: ymd(start), to: ymd(end), status });
  const vendors = useVendors();
  const record = useRecordVisit();
  const vendorName = useMemo(() => new Map(vendors.rows.map((v) => [v.id, v.name])), [vendors.rows]);
  const canRecord = can('works.manage') || can('vendors.manage');
  const today = ymd(new Date());

  const columns: DataTableColumn<ServiceVisit>[] = [
    { key: 'due', header: 'Day', primary: true, accessor: (v) => v.due_at, render: (v) => <span className="font-medium">{fmtDate(v.due_at)}</span> },
    { key: 'vendor', header: 'Vendor', accessor: (v) => vendorName.get(v.vendor_id) ?? '', render: (v) => vendorName.get(v.vendor_id) ?? 'Vendor' },
    { key: 'status', header: 'Status', accessor: (v) => v.status, render: (v) => <StatusBadge status={v.status} label={STATUS_LABEL[v.status]} /> },
    { key: 'checked', header: 'Recorded', hideBelow: 'md', accessor: (v) => v.checked_in_at ?? '', render: (v) => fmtDateTime(v.checked_in_at) || '-' },
    { key: 'photos', header: 'Photos', hideBelow: 'md', accessor: (v) => v.photos?.length ?? 0 },
    {
      key: 'actions', header: '', mobileAction: true, exportable: false,
      render: (v) => canRecord && v.status !== 'completed' && v.due_at.slice(0, 10) <= today ? (
        <Button size="sm" variant="outline" onClick={() => { setResult('completed'); setPhotos([]); setRecording(v); }}><CheckCircle2 /> Record</Button>
      ) : null,
    },
  ];

  const shift = (days: number) => setStart((s) => { const n = new Date(s); n.setDate(n.getDate() + days); return n; });

  if (!propertyId) return <div className="mx-auto max-w-7xl"><PageHeader title="Service visits" /><PropertyRequired what="Service visits" /></div>;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Service visits" subtitle="Contracted vendor visits by day; missed ones count against the contract" />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" onClick={() => shift(-7)} aria-label="Previous week"><ChevronLeft /></Button>
          <span className="min-w-48 text-center text-sm font-medium">{fmtDate(ymd(start))} to {fmtDate(ymd(end))}</span>
          <Button size="icon" variant="outline" onClick={() => shift(7)} aria-label="Next week"><ChevronRight /></Button>
          <Button size="sm" variant="ghost" onClick={() => setStart(weekStart(new Date()))}>This week</Button>
        </div>
        <NativeSelect className="sm:ml-auto sm:w-48" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </NativeSelect>
      </div>
      <DataTable
        columns={columns}
        rows={visits.data?.data ?? []}
        rowKey={(v) => v.id}
        loading={visits.isLoading}
        emptyText="No visits this week. Visits come from the visit plans on a vendor's contracts."
        exportFileName="service-visits"
      />
      <FormSheet
        open={!!recording}
        onOpenChange={(o) => !o && setRecording(null)}
        size="md"
        title="Record the visit"
        description={recording ? `${vendorName.get(recording.vendor_id) ?? 'Vendor'}, ${fmtDate(recording.due_at)}` : undefined}
        footer={<>
          <Button variant="outline" onClick={() => setRecording(null)}>Cancel</Button>
          <Button disabled={record.isPending}
            onClick={() => recording && record.mutate({ id: recording.id, status: result, photos: photos.map((p) => p.key) }, { onSuccess: () => setRecording(null) })}>
            {record.isPending ? 'Saving...' : 'Record'}
          </Button>
        </>}
      >
        <div className="space-y-4">
          <Field label="What was done" htmlFor="sv-result">
            <NativeSelect id="sv-result" value={result} onChange={(e) => setResult(e.target.value as 'completed' | 'partial')}>
              <option value="completed">All done</option>
              <option value="partial">Part done</option>
            </NativeSelect>
          </Field>
          <Field label="Photos"><PhotoPicker slug={slug} kind="works" value={photos} onChange={setPhotos} /></Field>
        </div>
      </FormSheet>
    </div>
  );
}
