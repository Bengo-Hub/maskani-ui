'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Lock, Plus, RotateCcw, Save, Search, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { PageHeader } from '@/components/common/page-header';
import { ToneBadge } from '@/components/common/status-badge';
import { useAccess, useSlug } from '@/hooks/use-access';
import { usePermissions, useRoleMutations, useRoles } from '@/hooks/use-settings';
import { useUrlParam } from '@/hooks/use-url-param';
import type { Permission, Role } from '@/lib/api/types';
import { cn, titleCase } from '@/lib/utils';

const MODULE_LABEL: Record<string, string> = {
  tenant: 'Administration', settings: 'Settings', users: 'Users and roles', properties: 'Properties', units: 'Units',
  parties: 'Owners and residents', imports: 'Imports', billing: 'Billing and collections', utilities: 'Water and meters',
  sales: 'Unit sales', works: 'Work orders', vendors: 'Vendors', gate: 'Gate and security', notices: 'Notices',
  documents: 'Documents', reports: 'Reports', privacy: 'Privacy',
};
const moduleLabel = (m: string) => MODULE_LABEL[m] ?? titleCase(m);

export default function RolesPage() {
  return <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-7xl" />}><Roles /></Suspense>;
}

function roleKind(r: Role): { label: string; tone: 'neutral' | 'primary' | 'gold' } {
  if (r.is_system_role) return { label: 'Default', tone: 'neutral' };
  if (r.cloned_from_role_id) return { label: 'Customised', tone: 'gold' };
  return { label: 'This estate', tone: 'primary' };
}

/** Roles and what each may do, by module. Defaults are shared; an estate customises or adds its own. */
function Roles() {
  const slug = useSlug();
  const { can } = useAccess();
  const manage = can('users.manage');
  const { data: roles = [], isLoading } = useRoles();
  const { data: catalogue = [] } = usePermissions();
  const m = useRoleMutations();
  const [code, setCode] = useUrlParam('role', '');
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<Role | null>(null);

  const staff = roles.filter((r) => !r.is_customer_role);
  const portal = roles.filter((r) => r.is_customer_role);
  const selected = roles.find((r) => r.code === code) ?? staff[0] ?? roles[0];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Roles and permissions"
        subtitle="What each role may see and do. Defaults apply to every estate; customise one to change it for this estate only."
        back={{ href: `/${slug}/settings/users`, label: 'Staff' }}
        actions={manage ? <Button onClick={() => setCreating(true)}><Plus /> New role</Button> : undefined}
      />
      {isLoading ? <Skeleton className="h-96 w-full rounded-2xl" /> : (
        <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          <nav className="space-y-4 rounded-2xl border bg-card p-3 lg:sticky lg:top-20 lg:self-start" aria-label="Roles">
            {[{ title: 'Staff roles', list: staff }, { title: 'Portal roles', list: portal }].map((g) => g.list.length > 0 && (
              <div key={g.title}>
                <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</p>
                <ul className="space-y-0.5">
                  {g.list.map((r) => {
                    const k = roleKind(r);
                    const on = selected?.code === r.code;
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => setCode(r.code)}
                          className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors',
                            on ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-secondary')}
                        >
                          <span className="min-w-0 flex-1 truncate">{r.name}</span>
                          {r.locked && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Locked" />}
                          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" aria-hidden />{r.holders}</span>
                          <span className="sr-only">{k.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          {selected && (
            <RoleEditor
              key={selected.id}
              role={selected}
              catalogue={catalogue}
              manage={manage}
              onSave={(body) => m.save.mutate({ role: selected, ...body })}
              saving={m.save.isPending}
              onRemove={() => setRemoving(selected)}
            />
          )}
        </div>
      )}

      <NewRoleSheet open={creating} onOpenChange={setCreating} roles={staff} onCreated={(c) => setCode(c)} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={removing?.cloned_from_role_id ? `Reset ${removing?.name} to the default?` : `Delete ${removing?.name}?`}
        description={removing?.cloned_from_role_id
          ? 'Its holders keep the role, with the default permissions again.'
          : 'Only possible when nobody holds the role. This cannot be undone.'}
        confirmLabel={removing?.cloned_from_role_id ? 'Reset to default' : 'Delete role'}
        variant={removing?.cloned_from_role_id ? 'warning' : 'danger'}
        loading={m.remove.isPending}
        onConfirm={() => removing && m.remove.mutate(removing.id, { onSuccess: () => { setRemoving(null); setCode(''); } })}
      />
    </div>
  );
}

/**
 * Every role but the administrator edits in place. Saving a default role gives this estate its own
 * copy with the changes (other estates keep the default); Reset brings the default back.
 */
function RoleEditor({ role, catalogue, manage, onSave, saving, onRemove }: {
  role: Role;
  catalogue: Permission[];
  manage: boolean;
  onSave: (body: { name?: string; description?: string; permissions: string[] }) => void;
  saving: boolean;
  onRemove: () => void;
}) {
  const editable = manage && !role.locked && !role.is_customer_role;
  const [picked, setPicked] = useState<Set<string>>(new Set(role.permissions));
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? '');
  const [q, setQ] = useState('');
  useEffect(() => { setPicked(new Set(role.permissions)); setName(role.name); setDescription(role.description ?? ''); }, [role]);

  const grouped = useMemo(() => {
    const t = q.trim().toLowerCase();
    const g = new Map<string, Permission[]>();
    for (const p of catalogue) {
      if (t && !`${p.module} ${moduleLabel(p.module)} ${p.name} ${p.code}`.toLowerCase().includes(t)) continue;
      g.set(p.module, [...(g.get(p.module) ?? []), p]);
    }
    return [...g.entries()].sort((a, b) => moduleLabel(a[0]).localeCompare(moduleLabel(b[0])));
  }, [catalogue, q]);

  const dirty = name.trim() !== role.name || description.trim() !== (role.description ?? '')
    || picked.size !== role.permissions.length || role.permissions.some((p) => !picked.has(p));
  const toggle = (c: string) => editable && setPicked((s) => { const n = new Set(s); if (n.has(c)) n.delete(c); else n.add(c); return n; });
  const toggleModule = (perms: Permission[]) => editable && setPicked((s) => {
    const n = new Set(s);
    const all = perms.every((p) => n.has(p.code));
    for (const p of perms) { if (all) n.delete(p.code); else n.add(p.code); }
    return n;
  });
  const k = roleKind(role);

  return (
    <section className="min-w-0 rounded-2xl border bg-card">
      <div className="space-y-3 border-b p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {editable
              ? <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 max-w-sm text-base font-semibold" aria-label="Role name" />
              : <h2 className="text-lg font-semibold">{role.name}</h2>}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <ToneBadge tone={k.tone}>{k.label}</ToneBadge>
              <span className="font-mono">{role.code}</span>
              <span>{picked.size} of {catalogue.length} permissions</span>
              <span>{role.holders} {role.holders === 1 ? 'person' : 'people'}</span>
            </div>
            {editable
              ? <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this role is for" className="h-9 max-w-xl text-sm" aria-label="Role description" />
              : role.description && <p className="text-sm text-muted-foreground">{role.description}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {editable && !role.is_system_role && (
              <Button variant="ghost" onClick={onRemove}>{role.cloned_from_role_id ? <><RotateCcw /> Reset to default</> : <><Trash2 /> Delete</>}</Button>
            )}
            {editable && (
              <Button onClick={() => onSave({ name: name.trim(), description: description.trim(), permissions: [...picked] })} disabled={!dirty || saving || !name.trim()}>
                <Save /> {saving ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </div>
        {role.locked && <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Lock className="h-4 w-4" /> The tenant administrator always has every permission, so an estate can never lock itself out.</p>}
        {role.is_customer_role && <p className="text-sm text-muted-foreground">Portal roles carry no staff permissions: owners, residents and vendors see only what their unit or company links give them.</p>}
        {editable && role.is_system_role && <p className="text-sm text-muted-foreground">Default role. Your changes are saved as this estate&apos;s own version; other estates keep the default, and Reset brings it back.</p>}
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search permissions" className="pl-9" aria-label="Search permissions" />
        </div>
      </div>

      <div className="divide-y">
        {grouped.map(([mod, perms]) => {
          const on = perms.filter((p) => picked.has(p.code)).length;
          return (
            <div key={mod} className="p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{moduleLabel(mod)} <span className="ml-1 text-xs font-normal text-muted-foreground">{on} of {perms.length}</span></p>
                {editable && (
                  <button type="button" onClick={() => toggleModule(perms)} className="text-xs font-medium text-primary hover:underline">
                    {on === perms.length ? 'Clear' : 'Allow all'}
                  </button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {perms.map((p) => {
                  const has = picked.has(p.code);
                  return (
                    <button
                      key={p.code}
                      type="button"
                      disabled={!editable}
                      onClick={() => toggle(p.code)}
                      aria-pressed={has}
                      title={p.code}
                      className={cn('flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                        has ? 'border-primary/40 bg-primary/5' : 'bg-background',
                        editable ? 'hover:border-primary/40' : 'cursor-default')}
                    >
                      <span className="min-w-0 truncate">{p.name || titleCase(p.action)}</span>
                      <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full', has ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                        {has && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {grouped.length === 0 && <p className="p-5 text-sm text-muted-foreground">No permissions match.</p>}
      </div>
    </section>
  );
}

function NewRoleSheet({ open, onOpenChange, roles, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; roles: Role[]; onCreated: (code: string) => void }) {
  const slug = useSlug();
  const { create } = useRoleMutations();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [from, setFrom] = useState('');
  useEffect(() => { if (open) { setName(''); setDescription(''); setFrom(''); } }, [open]);
  const code = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'r_$1');

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="New role"
      footer={<>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button
          disabled={!name.trim() || code.length < 2 || create.isPending}
          onClick={() => create.mutate(
            { code, name: name.trim(), description: description.trim() || undefined, permissions: roles.find((r) => r.code === from)?.permissions ?? [] },
            { onSuccess: () => { onCreated(code); onOpenChange(false); } },
          )}
        >
          {create.isPending ? 'Creating...' : 'Create role'}
        </Button>
      </>}
    >
      <div className="space-y-4">
        <Field label="Name" htmlFor="nr-name" required hint={code ? `Code: ${code}` : 'For example Night guard supervisor'}>
          <Input id="nr-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Description" htmlFor="nr-desc">
          <Input id="nr-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Start from" htmlFor="nr-from" hint="Copy another role's permissions, then adjust them">
          <NativeSelect id="nr-from" value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">No permissions</option>
            {roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
          </NativeSelect>
        </Field>
        <p className="text-xs text-muted-foreground">
          After creating it, give it to staff from <Link href={`/${slug}/settings/users`} className="text-primary underline">Staff</Link>.
        </p>
      </div>
    </FormSheet>
  );
}
