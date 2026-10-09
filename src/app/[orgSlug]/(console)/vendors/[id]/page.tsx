'use client';

import { use, useState } from 'react';
import { Plus } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Field } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { PageHeader } from '@/components/common/page-header';
import { ToneBadge } from '@/components/common/status-badge';
import { VendorPeople } from '@/components/works/vendor-people';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useAddVendorDocument, useVendor } from '@/hooks/use-works';
import type { VendorDocument } from '@/lib/api/types';
import { apiDate, daysUntil, fmtDate } from '@/lib/utils';
import { ExpiryBadge } from '@/components/works/expiry-badge';

const DOC_COLUMNS: DataTableColumn<VendorDocument>[] = [
  { key: 'type', header: 'Document', primary: true, accessor: (d) => d.doc_type.replace(/_/g, ' '), render: (d) => <span className="font-medium uppercase">{d.doc_type.replace(/_/g, ' ')}</span> },
  { key: 'number', header: 'Number', accessor: (d) => d.number ?? '' },
  { key: 'issued', header: 'Issued', hideBelow: 'md', accessor: (d) => d.issued_at ?? '', render: (d) => fmtDate(d.issued_at) },
  {
    key: 'expires', header: 'Expires', mobileAction: true, accessor: (d) => d.expires_at ?? '',
    render: (d) => {
      const left = daysUntil(d.expires_at);
      return (
        <span className="flex items-center gap-2 text-sm">
          {fmtDate(d.expires_at) || 'No expiry'}
          {left !== null && (left < 0 ? <ToneBadge tone="danger">Expired</ToneBadge> : left <= 30 ? <ToneBadge tone="warning">{left} days</ToneBadge> : null)}
        </span>
      );
    },
  },
];

export default function VendorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const slug = useSlug();
  const { can } = useAccess();
  const manage = can('vendors.manage');
  const { data: v, isLoading } = useVendor(id);
  const addDoc = useAddVendorDocument(id);
  const [docOpen, setDocOpen] = useState(false);
  const [d, setD] = useState({ doc_type: '', number: '', issued_at: '', expires_at: '' });

  if (isLoading || !v) return <div className="mx-auto max-w-7xl space-y-3"><Skeleton className="h-10 w-56" /><Skeleton className="h-64" /></div>;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader back={{ href: `/${slug}/vendors`, label: 'Vendors' }} title={v.name} subtitle={<span className="inline-flex flex-wrap items-center gap-2">{v.contact_name} {v.phone} <ExpiryBadge vendor={v} /></span>} />
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Licences and documents</CardTitle>
            {manage && <Button size="sm" variant="outline" onClick={() => { setD({ doc_type: '', number: '', issued_at: '', expires_at: '' }); setDocOpen(true); }}><Plus /> Add document</Button>}
          </CardHeader>
          <CardContent>
            <DataTable columns={DOC_COLUMNS} rows={v.documents ?? []} rowKey={(doc) => doc.id} emptyText="No documents recorded." maxBodyHeight={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Personnel</CardTitle></CardHeader>
          <CardContent><VendorPeople vendorId={v.id} people={v.personnel ?? []} manage={manage} /></CardContent>
        </Card>
      </div>
      <FormSheet
        open={docOpen}
        onOpenChange={setDocOpen}
        size="md"
        title="Add document"
        footer={<>
          <Button variant="outline" onClick={() => setDocOpen(false)}>Cancel</Button>
          <Button
            disabled={!d.doc_type.trim() || addDoc.isPending}
            onClick={() => addDoc.mutate({
              doc_type: d.doc_type.trim().toLowerCase().replace(/\s+/g, '_'), number: d.number.trim() || undefined,
              issued_at: d.issued_at ? apiDate(d.issued_at) : undefined, expires_at: d.expires_at ? apiDate(d.expires_at) : undefined,
            }, { onSuccess: () => setDocOpen(false) })}
          >
            {addDoc.isPending ? 'Saving...' : 'Add'}
          </Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Document" htmlFor="vd-type" required hint="For example PSRA licence, NEMA, business permit, insurance"><Input id="vd-type" value={d.doc_type} onChange={(e) => setD({ ...d, doc_type: e.target.value })} /></Field>
          <Field label="Number" htmlFor="vd-num"><Input id="vd-num" value={d.number} onChange={(e) => setD({ ...d, number: e.target.value })} /></Field>
          <Field label="Issued" htmlFor="vd-iss"><Input id="vd-iss" type="date" value={d.issued_at} onChange={(e) => setD({ ...d, issued_at: e.target.value })} /></Field>
          <Field label="Expires" htmlFor="vd-exp"><Input id="vd-exp" type="date" value={d.expires_at} onChange={(e) => setD({ ...d, expires_at: e.target.value })} /></Field>
        </div>
      </FormSheet>
    </div>
  );
}
