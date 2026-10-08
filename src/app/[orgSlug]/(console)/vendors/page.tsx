'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { KeysetTable } from '@/components/common/keyset-table';
import { PageHeader } from '@/components/common/page-header';
import { ExpiryBadge } from '@/components/works/expiry-badge';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useCreateVendor, useVendors } from '@/hooks/use-works';
import type { Vendor } from '@/lib/api/types';
import { normalisePhone } from '@/lib/auth/api';
import { fmtDate } from '@/lib/utils';

export default function VendorsPage() {
  const slug = useSlug();
  const router = useRouter();
  const { can } = useAccess();
  const list = useVendors();
  const create = useCreateVendor();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', contact_name: '', phone: '', email: '', registration_number: '' });

  const columns = useMemo<DataTableColumn<Vendor>[]>(() => [
    { key: 'name', header: 'Vendor', primary: true, accessor: (v) => v.name, render: (v) => <div><p className="font-medium">{v.name}</p><p className="text-xs text-muted-foreground">{(v.categories ?? []).join(', ')}</p></div> },
    { key: 'contact', header: 'Contact', hideBelow: 'md', accessor: (v) => v.contact_name ?? '', render: (v) => <span>{v.contact_name} <span className="text-muted-foreground">{v.phone}</span></span> },
    { key: 'next', header: 'Next expiry', hideBelow: 'lg', accessor: (v) => v.next_expiry ?? '', render: (v) => fmtDate(v.next_expiry) },
    { key: 'docs', header: 'Documents', mobileAction: true, accessor: (v) => v.expired_documents ?? 0, render: (v) => <ExpiryBadge vendor={v} /> },
  ], []);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Vendors"
        subtitle="Security, cleaning and maintenance providers, with licence expiry tracking"
        actions={can('vendors.manage') ? <Button onClick={() => { setF({ name: '', contact_name: '', phone: '', email: '', registration_number: '' }); setOpen(true); }}><Plus /> Add vendor</Button> : undefined}
      />
      <KeysetTable
        columns={columns}
        rows={list.rows}
        rowKey={(v) => v.id}
        loading={list.isLoading}
        error={list.isError}
        onRetry={() => void list.refetch()}
        hasMore={list.hasMore}
        loadMore={() => void list.loadMore()}
        loadingMore={list.loadingMore}
        emptyText="No vendors yet."
        onRowClick={(v) => router.push(`/${slug}/vendors/${v.id}`)}
      />
      <FormSheet
        open={open}
        onOpenChange={setOpen}
        size="md"
        title="Add vendor"
        footer={<>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={!f.name.trim() || create.isPending}
            onClick={() => create.mutate({
              name: f.name.trim(), contact_name: f.contact_name.trim() || undefined, phone: f.phone.trim() ? normalisePhone(f.phone) : undefined,
              email: f.email.trim() || undefined, registration_number: f.registration_number.trim() || undefined,
            }, { onSuccess: (v) => { setOpen(false); router.push(`/${slug}/vendors/${v.id}`); } })}
          >
            {create.isPending ? 'Saving...' : 'Add vendor'}
          </Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="vn-name" required className="sm:col-span-2"><Input id="vn-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Contact person" htmlFor="vn-contact"><Input id="vn-contact" value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} /></Field>
          <Field label="Phone" htmlFor="vn-phone"><Input id="vn-phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Email" htmlFor="vn-email"><Input id="vn-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Registration number" htmlFor="vn-reg"><Input id="vn-reg" value={f.registration_number} onChange={(e) => setF({ ...f, registration_number: e.target.value })} /></Field>
        </div>
      </FormSheet>
    </div>
  );
}
