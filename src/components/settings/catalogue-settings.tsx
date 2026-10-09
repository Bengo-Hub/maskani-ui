'use client';

import { useMemo, useState } from 'react';
import { Check, ListTree, Pencil, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/common/empty-state';
import { useAccess } from '@/hooks/use-access';
import { useCatalogueAll, useUpsertCatalogue } from '@/hooks/use-settings';
import { useUrlParam } from '@/hooks/use-url-param';
import { CATALOGUE_KINDS, type CatalogueKind } from '@/lib/catalogues';
import { cn } from '@/lib/utils';

const KIND_VALUES = CATALOGUE_KINDS.map((k) => k.kind);

/** Code for a new entry from its name: "5 Bedroom Maisonette" becomes 5_bedroom_maisonette. */
export function catalogueCode(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/**
 * The lists behind dropdowns across the app. Platform defaults come seeded; an estate can rename,
 * switch off or add its own entries (also from any creatable dropdown). The list is in the URL.
 */
export function CatalogueSettings() {
  const { can } = useAccess();
  const manage = can('settings.manage');
  const [kind, setKind] = useUrlParam<CatalogueKind>('kind', 'unit_type', KIND_VALUES);
  const current = CATALOGUE_KINDS.find((k) => k.kind === kind)!;
  // All entries including inactive ones, so they can be switched back on.
  const { data = [], isLoading } = useCatalogueAll(kind);
  const upsert = useUpsertCatalogue(kind);
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ code: string; name: string } | null>(null);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? data.filter((e) => e.name.toLowerCase().includes(t) || e.code.includes(t)) : data;
  }, [data, q]);
  const exists = (label: string) => data.some((e) => e.code === catalogueCode(label) || e.name.trim().toLowerCase() === label.trim().toLowerCase());

  const add = () => {
    const label = name.trim();
    if (!label || exists(label)) return;
    upsert.mutate({ code: catalogueCode(label), name: label }, { onSuccess: () => setName('') });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">
      <ul className="scrollbar-hide flex gap-1.5 overflow-x-auto rounded-2xl border bg-card p-2 lg:flex-col lg:gap-0.5 lg:overflow-visible" aria-label="Lists">
        {CATALOGUE_KINDS.map((k) => (
          <li key={k.kind} className="shrink-0">
            <button
              type="button"
              onClick={() => { setKind(k.kind); setQ(''); setEditing(null); }}
              className={cn('w-full whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm transition-colors',
                k.kind === kind ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}
            >
              {k.label}
            </button>
          </li>
        ))}
      </ul>

      <section className="min-w-0 rounded-2xl border bg-card">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">{current.label}</h2>
            <p className="text-sm text-muted-foreground">{data.filter((e) => e.active !== false).length} in use, {data.length} in all</p>
          </div>
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this list" className="pl-9" aria-label="Search this list" />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={ListTree} title={q ? 'Nothing matches' : 'No entries yet'} description={q ? 'Try another word.' : manage ? 'Add the first entry below.' : undefined} />
        ) : (
          <ul className="divide-y">
            {rows.map((e) => {
              const isEditing = editing?.code === e.code;
              return (
                <li key={e.code} className={cn('flex items-center gap-3 px-4 py-2.5', e.active === false && 'opacity-60')}>
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <form
                        className="flex gap-2"
                        onSubmit={(ev) => {
                          ev.preventDefault();
                          const n = editing.name.trim();
                          if (n && n !== e.name) upsert.mutate({ code: e.code, name: n, active: e.active !== false }, { onSuccess: () => setEditing(null) });
                          else setEditing(null);
                        }}
                      >
                        <Input autoFocus value={editing.name} onChange={(ev) => setEditing({ code: e.code, name: ev.target.value })} aria-label="Name" className="h-9" />
                        <Button type="submit" size="icon" variant="ghost" aria-label="Save name" disabled={upsert.isPending}><Check /></Button>
                        <Button type="button" size="icon" variant="ghost" aria-label="Cancel" onClick={() => setEditing(null)}><X /></Button>
                      </form>
                    ) : (
                      <>
                        <p className="truncate font-medium">{e.name}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">{e.code}</p>
                      </>
                    )}
                  </div>
                  {manage && !isEditing && (
                    <Button size="icon" variant="ghost" aria-label={`Rename ${e.name}`} onClick={() => setEditing({ code: e.code, name: e.name })}><Pencil /></Button>
                  )}
                  <Switch
                    checked={e.active !== false}
                    disabled={!manage || upsert.isPending}
                    aria-label={`${e.name} in use`}
                    onCheckedChange={(v) => upsert.mutate({ code: e.code, name: e.name, active: v })}
                  />
                </li>
              );
            })}
          </ul>
        )}

        {manage && (
          <form className="flex gap-2 border-t p-4" onSubmit={(e) => { e.preventDefault(); add(); }}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Add to ${current.label.toLowerCase()}`} aria-label="New entry" />
            <Button type="submit" disabled={!name.trim() || exists(name) || upsert.isPending}><Plus /> Add</Button>
          </form>
        )}
      </section>
    </div>
  );
}
