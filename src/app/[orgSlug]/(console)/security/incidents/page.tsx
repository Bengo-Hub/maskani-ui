'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { KeysetTable } from '@/components/common/keyset-table';
import { PageHeader } from '@/components/common/page-header';
import { PropertyRequired, usePropertyOrSingle } from '@/components/common/property-required';
import { StatusBadge, ToneBadge } from '@/components/common/status-badge';
import { useSlug } from '@/hooks/use-access';
import { useCreateIncident, useIncidents } from '@/hooks/use-security';
import type { Incident } from '@/lib/api/types';
import { fmtDateTime, titleCase } from '@/lib/utils';

const SEV_TONE = { low: 'neutral', medium: 'warning', high: 'danger', critical: 'danger' } as const;

export default function IncidentsPage() {
  const slug = useSlug();
  const router = useRouter();
  const propertyId = usePropertyOrSingle();
  const list = useIncidents(propertyId);
  const create = useCreateIncident();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ category: 'intrusion', severity: 'medium', title: '', description: '' });

  const columns = useMemo<DataTableColumn<Incident>[]>(() => [
    { key: 'title', header: 'Incident', primary: true, accessor: (i) => i.title, render: (i) => <div><p className="font-medium">{i.title}</p><p className="text-xs text-muted-foreground">{titleCase(i.category)}</p></div> },
    { key: 'sev', header: 'Severity', accessor: (i) => i.severity, render: (i) => <ToneBadge tone={SEV_TONE[i.severity as keyof typeof SEV_TONE] ?? 'neutral'}>{titleCase(i.severity)}</ToneBadge> },
    { key: 'when', header: 'When', hideBelow: 'md', accessor: (i) => i.occurred_at, render: (i) => fmtDateTime(i.occurred_at) },
    { key: 'status', header: 'Status', mobileAction: true, accessor: (i) => i.status ?? '', render: (i) => <StatusBadge status={i.status} /> },
  ], []);

  if (!propertyId) return <div className="mx-auto max-w-7xl"><PageHeader title="Incidents" /><PropertyRequired what="Incidents" /></div>;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Incidents" subtitle="Occurrence book from the gate and the office" actions={<Button onClick={() => setOpen(true)}><Plus /> Record incident</Button>} />
      <KeysetTable
        columns={columns}
        rows={list.rows}
        rowKey={(i) => i.id}
        loading={list.isLoading}
        error={list.isError}
        onRetry={() => void list.refetch()}
        hasMore={list.hasMore}
        loadMore={() => void list.loadMore()}
        loadingMore={list.loadingMore}
        emptyText="No incidents recorded."
        onRowClick={(i) => router.push(`/${slug}/security/incidents/${i.id}`)}
      />
      <FormSheet
        open={open}
        onOpenChange={setOpen}
        size="md"
        title="Record incident"
        footer={<>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={!f.title.trim() || create.isPending}
            onClick={() => create.mutate({ property_id: propertyId, ...f, title: f.title.trim(), occurred_at: new Date().toISOString() }, { onSuccess: () => setOpen(false) })}
          >
            {create.isPending ? 'Saving...' : 'Save'}
          </Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="ic-cat">
            <NativeSelect id="ic-cat" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              {['intrusion', 'theft', 'fire', 'medical', 'dispute', 'damage', 'other'].map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Severity" htmlFor="ic-sev">
            <NativeSelect id="ic-sev" value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value })}>
              {['low', 'medium', 'high', 'critical'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Title" htmlFor="ic-title" required className="sm:col-span-2"><Input id="ic-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Details" htmlFor="ic-desc" className="sm:col-span-2"><Textarea id="ic-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={4} /></Field>
        </div>
      </FormSheet>
    </div>
  );
}
