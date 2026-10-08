'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Layers, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/common/empty-state';
import { Field } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useAddBlock } from '@/hooks/use-register';
import type { Property } from '@/lib/api/types';

export function PropertyBlocks({ property }: { property: Property }) {
  const slug = useSlug();
  const { can } = useAccess();
  const blocks = [...(property.edges?.blocks ?? [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.code.localeCompare(b.code));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', phase: '' });
  const add = useAddBlock(property.id);

  const submit = () => {
    if (!form.code.trim()) return;
    add.mutate(
      { code: form.code.trim().toUpperCase(), name: form.name.trim() || undefined, phase: form.phase.trim() || undefined },
      { onSuccess: () => { setOpen(false); setForm({ code: '', name: '', phase: '' }); } },
    );
  };

  return (
    <div className="space-y-3">
      {can('properties.manage') && (
        <div className="flex justify-end"><Button variant="outline" onClick={() => setOpen(true)}><Plus /> Add block</Button></div>
      )}
      {blocks.length === 0 ? (
        <EmptyState icon={Layers} title="No blocks" description="Group units into blocks or phases, for example Block A and Block B." />
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {blocks.map((b) => (
            <li key={b.id}>
              <Link
                href={`/${slug}/units?property_id=${property.id}&block_id=${b.id}`}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:border-primary/40"
              >
                <span className="font-medium">{b.name || `Block ${b.code}`}</span>
                <span className="text-xs text-muted-foreground">{b.phase ? `Phase ${b.phase}` : b.code}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <FormSheet
        open={open}
        onOpenChange={setOpen}
        size="sm"
        title="Add block"
        footer={<>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!form.code.trim() || add.isPending}>{add.isPending ? 'Saving...' : 'Add block'}</Button>
        </>}
      >
        <div className="space-y-4">
          <Field label="Code" htmlFor="b-code" required hint="Used in unit codes, for example A or B">
            <Input id="b-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="uppercase" />
          </Field>
          <Field label="Name" htmlFor="b-name">
            <Input id="b-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Block A" />
          </Field>
          <Field label="Phase" htmlFor="b-phase">
            <Input id="b-phase" value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })} placeholder="1" />
          </Field>
        </div>
      </FormSheet>
    </div>
  );
}
