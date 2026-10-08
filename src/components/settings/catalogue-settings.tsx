'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { NativeSelect } from '@/components/common/field';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useUpsertCatalogue } from '@/hooks/use-settings';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/operations';
import { qk } from '@/lib/query-keys';

const KINDS = [
  { kind: 'unit_type', label: 'Unit types' },
  { kind: 'wo_category', label: 'Work order categories' },
  { kind: 'property_type', label: 'Property types' },
  { kind: 'vendor_category', label: 'Vendor categories' },
  { kind: 'incident_type', label: 'Incident types' },
  { kind: 'notice_category', label: 'Notice categories' },
];

/**
 * The lists that drive dropdowns across the app. Platform defaults come seeded; an estate can
 * rename, switch off or add its own entries.
 */
export function CatalogueSettings() {
  const slug = useSlug();
  const { can } = useAccess();
  const manage = can('settings.manage');
  const [kind, setKind] = useState('unit_type');
  // All entries including inactive ones, so they can be switched back on.
  const { data = [] } = useQuery({ queryKey: [...qk.catalogue(slug, kind), 'all'], queryFn: () => settingsApi.catalogue(slug, kind).then((r) => r.data ?? []) });
  const upsert = useUpsertCatalogue(kind);
  const [name, setName] = useState('');

  const add = () => {
    const label = name.trim();
    if (!label) return;
    const code = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    upsert.mutate({ code, name: label }, { onSuccess: () => setName('') });
  };

  return (
    <div className="space-y-4">
      <NativeSelect className="sm:w-72" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="List">
        {KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
      </NativeSelect>
      <ul className="divide-y rounded-lg border">
        {data.map((e) => (
          <li key={e.code} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0"><p className="font-medium">{e.name}</p><p className="font-mono text-xs text-muted-foreground">{e.code}</p></div>
            <Switch checked={e.active !== false} disabled={!manage || upsert.isPending} onCheckedChange={(v) => upsert.mutate({ code: e.code, name: e.name, active: v })} />
          </li>
        ))}
      </ul>
      {manage && (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add an entry" />
          <Button type="submit" variant="outline" disabled={!name.trim() || upsert.isPending}><Plus /> Add</Button>
        </form>
      )}
    </div>
  );
}
