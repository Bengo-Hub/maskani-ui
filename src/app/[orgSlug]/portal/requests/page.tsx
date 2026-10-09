'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextField } from '@/components/common/rich-text';
import { EmptyState } from '@/components/common/empty-state';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { PageHeader } from '@/components/common/page-header';
import { PhotoPicker, type PickedPhoto } from '@/components/common/photo-picker';
import { StatusBadge } from '@/components/common/status-badge';
import { useSlug } from '@/hooks/use-access';
import { useCreatePortalRequest, usePortalRequestAction, usePortalRequests, usePortalUnits } from '@/hooks/use-portal';
import { useCatalogue } from '@/hooks/use-settings';
import { label, WORK_STATUS } from '@/lib/labels';
import { fmtDate } from '@/lib/utils';

export default function PortalRequestsPage() {
  const slug = useSlug();
  const list = usePortalRequests();
  const { data: units = [] } = usePortalUnits();
  const { data: categories = [] } = useCatalogue('wo_category');
  const create = useCreatePortalRequest();
  const act = usePortalRequestAction();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ unit_id: '', category: '', urgent: false, title: '', description: '' });
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);

  const openForm = () => { setF({ unit_id: units[0]?.unit.id ?? '', category: categories[0]?.code ?? '', urgent: false, title: '', description: '' }); setPhotos([]); setOpen(true); };
  // "Report a problem" on the home opens the form here (?new=1), once, after the units load.
  const wantsNew = useSearchParams().get('new') === '1';
  const openRef = useRef(openForm);
  openRef.current = openForm;
  const autoOpened = useRef(false);
  useEffect(() => {
    if (wantsNew && !autoOpened.current && units.length > 0) {
      autoOpened.current = true;
      openRef.current();
    }
  }, [wantsNew, units.length]);
  const valid = f.unit_id && f.title.trim();
  const submit = () => {
    if (!valid) return;
    create.mutate({
      unit_id: f.unit_id, category: f.category || undefined, priority: f.urgent ? 'high' : 'normal',
      title: f.title.trim(), description: f.description.trim() || undefined, photos: photos.map((p) => p.key),
    }, { onSuccess: () => setOpen(false) });
  };

  return (
    <div>
      <PageHeader title="Requests" subtitle="Repairs and issues for the estate office" actions={<Button onClick={openForm} disabled={units.length === 0}><Plus /> New request</Button>} />
      {list.isLoading && <Skeleton className="h-40" />}
      {!list.isLoading && list.rows.length === 0 && <EmptyState icon={Wrench} title="No requests" description="Report a leak, a broken light or anything else that needs fixing." />}
      <div className="space-y-2">
        {list.rows.map((r) => (
          <Card key={r.id} className="gap-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.number ? `${r.number} · ` : ''}{fmtDate(r.created_at)}</p>
              </div>
              <StatusBadge status={r.status} label={label(WORK_STATUS, r.status)} />
            </div>
            {r.status === 'completed' && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => act.mutate({ id: r.id, action: 'confirm' })} disabled={act.isPending}>It is fixed</Button>
                <Button size="sm" variant="outline" onClick={() => act.mutate({ id: r.id, action: 'reopen' })} disabled={act.isPending}>Not fixed</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
      {list.hasMore && <div className="mt-3 flex justify-center"><Button variant="outline" onClick={() => void list.loadMore()} disabled={list.loadingMore}>Load more</Button></div>}

      <FormSheet
        open={open}
        onOpenChange={setOpen}
        size="md"
        title="New request"
        footer={<>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!valid || create.isPending}>{create.isPending ? 'Sending...' : 'Send request'}</Button>
        </>}
      >
        <div className="space-y-4">
          {units.length > 1 && (
            <Field label="Unit" htmlFor="rq-unit">
              <NativeSelect id="rq-unit" value={f.unit_id} onChange={(e) => setF({ ...f, unit_id: e.target.value })}>
                {units.map((u) => <option key={u.unit.id} value={u.unit.id}>{u.unit.code}</option>)}
              </NativeSelect>
            </Field>
          )}
          {categories.length > 0 && (
            <Field label="What is it about?" htmlFor="rq-cat">
              <NativeSelect id="rq-cat" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
                {categories.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </NativeSelect>
            </Field>
          )}
          <Field label="Short title" htmlFor="rq-title" required><Input id="rq-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Kitchen sink leaking" /></Field>
          <Field label="Details" htmlFor="rq-desc"><RichTextField id="rq-desc" value={f.description} onChange={(v) => setF({ ...f, description: v })} placeholder="What needs fixing, and where" /></Field>
          <Field label="Photos"><PhotoPicker slug={slug} kind="works" value={photos} onChange={setPhotos} /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.urgent} onChange={(e) => setF({ ...f, urgent: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" />
            This is urgent (water or power off, security risk)
          </label>
        </div>
      </FormSheet>
    </div>
  );
}
