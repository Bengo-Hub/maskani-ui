'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { PhotoPicker, type PickedPhoto } from '@/components/common/photo-picker';
import { SearchInput } from '@/components/common/search-input';
import { useSlug } from '@/hooks/use-access';
import { useProperties, useUnits } from '@/hooks/use-register';
import { useCatalogue } from '@/hooks/use-settings';
import { useCreateWorkOrder } from '@/hooks/use-works';
import type { WorkPriority } from '@/lib/api/types';
import { useSelectedPropertyId } from '@/store/property';

export function WorkOrderForm({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const slug = useSlug();
  const router = useRouter();
  const selected = useSelectedPropertyId(slug);
  const { data: properties = [] } = useProperties();
  const { data: categories = [] } = useCatalogue('wo_category');
  const create = useCreateWorkOrder();
  const [f, setF] = useState({ property_id: '', unit_id: '', area: '', category: '', priority: 'normal' as WorkPriority, title: '', description: '' });
  const [unitQ, setUnitQ] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const units = useUnits({ property_id: f.property_id, q: unitQ });

  useEffect(() => {
    if (!open) return;
    setF({ property_id: selected || (properties.length === 1 ? properties[0].id : ''), unit_id: '', area: '', category: categories[0]?.code ?? '', priority: 'normal', title: '', description: '' });
    setUnitQ('');
    setPhotos([]);
  }, [open, selected, properties, categories]);

  const valid = f.property_id && f.category && f.title.trim();
  const submit = () => create.mutate({
    property_id: f.property_id, unit_id: f.unit_id || undefined, area: f.unit_id ? undefined : f.area.trim() || undefined,
    category: f.category, priority: f.priority, title: f.title.trim(), description: f.description.trim() || undefined, photos: photos.map((p) => p.key),
  }, { onSuccess: (wo) => { onOpenChange(false); router.push(`/${slug}/works/${wo.id}`); } });

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="New work order"
      footer={<>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={submit} disabled={!valid || create.isPending}>{create.isPending ? 'Saving...' : 'Create'}</Button>
      </>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Property" htmlFor="wo-prop" required>
          <NativeSelect id="wo-prop" value={f.property_id} onChange={(e) => setF({ ...f, property_id: e.target.value, unit_id: '' })}>
            <option value="">Choose a property</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Category" htmlFor="wo-cat" required>
          <NativeSelect id="wo-cat" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            <option value="">Choose</option>
            {categories.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Unit" hint="Leave empty for a common area" className="sm:col-span-2">
          <div className="space-y-2">
            <SearchInput value={unitQ} onSearch={setUnitQ} placeholder="Unit code, then Enter" className="sm:w-full" />
            {unitQ && (
              <NativeSelect value={f.unit_id} onChange={(e) => setF({ ...f, unit_id: e.target.value })} aria-label="Unit">
                <option value="">Common area</option>
                {units.rows.map((u) => <option key={u.id} value={u.id}>{u.code}</option>)}
              </NativeSelect>
            )}
          </div>
        </Field>
        {!f.unit_id && <Field label="Area" htmlFor="wo-area"><Input id="wo-area" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} placeholder="Main gate, borehole, Block A stairs" /></Field>}
        <Field label="Priority" htmlFor="wo-pri">
          <NativeSelect id="wo-pri" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as WorkPriority })}>
            <option value="emergency">Emergency</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </NativeSelect>
        </Field>
        <Field label="Title" htmlFor="wo-title" required className="sm:col-span-2"><Input id="wo-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Details" htmlFor="wo-desc" className="sm:col-span-2"><Textarea id="wo-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} /></Field>
        <Field label="Photos" className="sm:col-span-2"><PhotoPicker slug={slug} kind="works" value={photos} onChange={setPhotos} /></Field>
      </div>
    </FormSheet>
  );
}
