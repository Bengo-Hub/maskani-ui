'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
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
import { useSlug } from '@/hooks/use-access';
import { useKeysetList } from '@/hooks/use-keyset-list';
import { useProperty } from '@/hooks/use-register';
import { noticesApi, type NoticeInput } from '@/lib/api/operations';
import type { Notice } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';
import { fmtDateTime } from '@/lib/utils';
import { usePropertyOrSingle } from '@/components/common/property-required';

export default function NoticesPage() {
  const slug = useSlug();
  const qc = useQueryClient();
  const propertyId = usePropertyOrSingle();
  const { data: property } = useProperty(propertyId);
  const list = useKeysetList(qk.notices(slug), (cursor) => noticesApi.list(slug, { cursor, limit: 30 }));
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Notice | null>(null);
  const [sending, setSending] = useState<Notice | null>(null);
  const [f, setF] = useState({ title: '', body: '', emergency: false, owners: true, occupants: true, whatsapp: true, email: true, blocks: [] as string[] });
  const deliveries = useQuery({ queryKey: qk.deliveries(slug, view?.id ?? ''), queryFn: () => noticesApi.deliveries(slug, view!.id).then((r) => r.data ?? []), enabled: !!view });

  const refresh = () => void qc.invalidateQueries({ queryKey: qk.notices(slug) });
  const create = useMutation({
    mutationFn: (body: NoticeInput) => noticesApi.create(slug, body),
    onSuccess: (n) => { toast.success(n.status === 'draft' ? 'Draft saved' : 'Notice is going out'); setOpen(false); refresh(); },
  });
  const send = useMutation({
    mutationFn: (id: string) => noticesApi.send(slug, id),
    onSuccess: () => { toast.success('Notice is going out'); setSending(null); refresh(); },
  });

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
        actions={<Button onClick={() => { setF({ title: '', body: '', emergency: false, owners: true, occupants: true, whatsapp: true, email: true, blocks: [] }); setOpen(true); }}><Plus /> New notice</Button>}
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
        onRowClick={(n) => (n.status === 'draft' ? setSending(n) : setView(n))}
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
            <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border text-sm">
              {(deliveries.data ?? []).length === 0 && <li className="px-3 py-3 text-muted-foreground">{deliveries.isLoading ? 'Loading deliveries...' : 'No deliveries recorded yet.'}</li>}
              {(deliveries.data ?? []).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate">{d.recipient ?? 'Resident'} <span className="text-xs text-muted-foreground">{d.channel}</span></span>
                  <StatusBadge status={d.status} />
                </li>
              ))}
            </ul>
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
