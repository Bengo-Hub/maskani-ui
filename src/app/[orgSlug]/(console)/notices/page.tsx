'use client';

import { useMemo, useState } from 'react';
import { Plus, Send } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { RichTextField, toPlainText } from '@/components/common/rich-text';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Field } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { KeysetTable } from '@/components/common/keyset-table';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge, ToneBadge } from '@/components/common/status-badge';
import { useNoticeDeliveries, useNoticeMutations, useNotices } from '@/hooks/use-notices';
import { useAccess } from '@/hooks/use-access';
import { useProperty } from '@/hooks/use-register';
import type { NoticeInput } from '@/lib/api/operations';
import type { Notice, NoticeDelivery } from '@/lib/api/types';
import { fmtDateTime } from '@/lib/utils';
import { usePropertyOrSingle } from '@/components/common/property-required';

const DELIVERY_COLUMNS: DataTableColumn<NoticeDelivery>[] = [
  { key: 'recipient', header: 'Recipient', primary: true, accessor: (d) => d.recipient ?? 'Resident' },
  { key: 'channel', header: 'Channel', accessor: (d) => d.channel, render: (d) => <span className="capitalize">{d.channel}</span> },
  { key: 'error', header: 'Problem', hideBelow: 'md', accessor: (d) => d.error ?? '', render: (d) => <span className="text-xs text-muted-foreground">{d.error}</span> },
  { key: 'status', header: 'Status', mobileAction: true, accessor: (d) => d.status, render: (d) => <StatusBadge status={d.status} /> },
];

export default function NoticesPage() {
  const propertyId = usePropertyOrSingle();
  const { data: property } = useProperty(propertyId);
  const list = useNotices();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Notice | null>(null);
  const [sending, setSending] = useState<Notice | null>(null);
  const [f, setF] = useState({ title: '', body: '', emergency: false, owners: true, occupants: true, whatsapp: true, email: true, blocks: [] as string[] });
  const deliveries = useNoticeDeliveries(view?.id);
  const { create, send } = useNoticeMutations(() => { setOpen(false); setSending(null); });
  // notices.view reads the list and deliveries; writing and sending need notices.manage.
  const manage = useAccess().can('notices.manage');

  const roles = [...(f.owners ? ['owner' as const] : []), ...(f.occupants ? ['occupant' as const] : [])];
  const channels = [...(f.whatsapp ? ['whatsapp'] : []), ...(f.email ? ['email'] : [])];
  const valid = f.title.trim() && f.body.trim() && roles.length > 0 && channels.length > 0;
  const build = (sendNow: boolean): NoticeInput => ({
    property_id: propertyId || undefined,
    audience: { scope: 'estate', roles, ...(f.blocks.length ? { block_ids: f.blocks } : {}) },
    channels, priority: f.emergency ? 'emergency' : 'routine', title: f.title.trim(), body: f.body.trim(), send_now: sendNow,
  });

  const columns = useMemo<DataTableColumn<Notice>[]>(() => [
    { key: 'title', header: 'Notice', primary: true, accessor: (n) => n.title, render: (n) => <div><p className="font-medium">{n.title}</p><p className="line-clamp-1 text-xs text-muted-foreground">{toPlainText(n.body)}</p></div> },
    { key: 'pri', header: 'Priority', hideBelow: 'md', accessor: (n) => n.priority, render: (n) => (n.priority === 'emergency' ? <ToneBadge tone="danger">Emergency</ToneBadge> : <ToneBadge>Routine</ToneBadge>) },
    { key: 'when', header: 'Sent', hideBelow: 'md', accessor: (n) => n.sent_at ?? '', render: (n) => fmtDateTime(n.sent_at) || '' },
    { key: 'status', header: 'Status', mobileAction: true, accessor: (n) => n.status, render: (n) => <StatusBadge status={n.status} /> },
  ], []);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Notices"
        subtitle="Sent by WhatsApp and email. Routine notices wait out quiet hours (21:00 to 07:00); emergencies go at once."
        actions={manage && <Button onClick={() => { setF({ title: '', body: '', emergency: false, owners: true, occupants: true, whatsapp: true, email: true, blocks: [] }); setOpen(true); }}><Plus /> New notice</Button>}
      />
      <KeysetTable
        columns={columns}
        rows={list.rows}
        rowKey={(n) => n.id}
        loading={list.isLoading}
        error={list.isError}
        onRetry={() => void list.refetch()}
        hasMore={list.hasMore}
        loadMore={() => void list.loadMore()}
        loadingMore={list.loadingMore}
        emptyText="No notices yet."
        onRowClick={(n) => (n.status === 'draft' && manage ? setSending(n) : setView(n))}
      />

      <FormSheet
        open={open}
        onOpenChange={setOpen}
        size="lg"
        title="New notice"
        description={property ? `To residents of ${property.name}` : 'To residents of every property'}
        footer={<>
          <Button variant="outline" onClick={() => create.mutate(build(false))} disabled={!valid || create.isPending}>Save draft</Button>
          <Button onClick={() => create.mutate(build(true))} disabled={!valid || create.isPending}><Send /> Send</Button>
        </>}
      >
        <div className="space-y-4">
          <Field label="Title" htmlFor="nt-title" required><Input id="nt-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Message" htmlFor="nt-body" required hint="Email shows the text with its paragraphs and lists; WhatsApp gets it on one line, without links">
            <RichTextField id="nt-body" value={f.body} onChange={(v) => setF({ ...f, body: v })} placeholder="What residents need to know" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Who</legend>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={f.owners} onCheckedChange={(v) => setF({ ...f, owners: !!v })} /> Owners</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={f.occupants} onCheckedChange={(v) => setF({ ...f, occupants: !!v })} /> Occupants</label>
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">How</legend>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={f.whatsapp} onCheckedChange={(v) => setF({ ...f, whatsapp: !!v })} /> WhatsApp</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={f.email} onCheckedChange={(v) => setF({ ...f, email: !!v })} /> Email</label>
            </fieldset>
          </div>
          {(property?.edges?.blocks?.length ?? 0) > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Only these blocks <span className="font-normal text-muted-foreground">(leave empty for everyone)</span></legend>
              <div className="flex flex-wrap gap-2">
                {property?.edges?.blocks?.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
                    <Checkbox checked={f.blocks.includes(b.id)} onCheckedChange={(v) => setF({ ...f, blocks: v ? [...f.blocks, b.id] : f.blocks.filter((x) => x !== b.id) })} />
                    {b.name || b.code}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <label className="flex items-center gap-2 rounded-lg border border-destructive/30 p-3 text-sm">
            <Checkbox checked={f.emergency} onCheckedChange={(v) => setF({ ...f, emergency: !!v })} /> Emergency: send now, even during quiet hours
          </label>
        </div>
      </FormSheet>

      <FormSheet open={!!view} onOpenChange={(o) => !o && setView(null)} size="lg" title={view?.title ?? ''} description={view ? `Sent ${fmtDateTime(view.sent_at)}` : undefined}>
        {view && (
          <div className="space-y-4">
            <p className="whitespace-pre-line text-sm">{view.body}</p>
            <DataTable
              columns={DELIVERY_COLUMNS}
              rows={deliveries.data ?? []}
              rowKey={(d) => d.id}
              loading={deliveries.isLoading}
              error={deliveries.isError}
              onRetry={() => void deliveries.refetch()}
              emptyText="No deliveries recorded yet."
              dense
              maxBodyHeight="20rem"
              showExportCsv
              exportFileName="notice-deliveries"
            />
          </div>
        )}
      </FormSheet>

      <ConfirmDialog
        open={!!sending}
        onOpenChange={(o) => !o && setSending(null)}
        title={`Send "${sending?.title ?? ''}"?`}
        description="It goes to the residents chosen when it was drafted."
        confirmLabel="Send"
        loading={send.isPending}
        onConfirm={() => sending && send.mutate(sending.id)}
      />
    </div>
  );
}
