'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Copy, KeyRound, MailPlus, ShieldOff, ShieldCheck, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { PageHeader } from '@/components/common/page-header';
import { SearchInput } from '@/components/common/search-input';
import { StatTile } from '@/components/common/stat-tile';
import { StatusBadge, ToneBadge } from '@/components/common/status-badge';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useProperties } from '@/hooks/use-register';
import { useInviteStaff, useRoles, useSetUserRoles, useSetUserStatus, useUsers } from '@/hooks/use-settings';
import { useUrlParam } from '@/hooks/use-url-param';
import { apiErrorMessage } from '@/lib/api/errors';
import type { Role, StaffUser } from '@/lib/api/types';
import { AUTH_UI_URL } from '@/lib/config';

export default function UsersPage() {
  return <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-7xl" />}><Users /></Suspense>;
}

/** Estate staff: invite from here (auth-api over S2S), give Maskani roles, suspend access. */
function Users() {
  const slug = useSlug();
  const { can } = useAccess();
  const manage = can('users.manage');
  const { data: users = [], isLoading } = useUsers('staff');
  const { data: roles = [] } = useRoles();
  const staffRoles = useMemo(() => roles.filter((r) => !r.is_customer_role), [roles]);
  const roleName = useMemo(() => new Map(roles.map((r) => [r.code, r.name])), [roles]);
  const [q, setQ] = useUrlParam('q', '');
  const [roleFilter, setRoleFilter] = useUrlParam('role', '');
  const [statusFilter, setStatusFilter] = useUrlParam('status', '');
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [inviting, setInviting] = useState(false);
  const [suspending, setSuspending] = useState<StaffUser | null>(null);
  const setStatus = useSetUserStatus();

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return users.filter((u) =>
      (!t || `${u.name ?? ''} ${u.email ?? ''}`.toLowerCase().includes(t)) &&
      (!roleFilter || (u.roles ?? []).includes(roleFilter)) &&
      (!statusFilter || (u.status || 'active') === statusFilter));
  }, [users, q, roleFilter, statusFilter]);
  const active = users.filter((u) => (u.status || 'active') === 'active').length;

  const columns = useMemo<DataTableColumn<StaffUser>[]>(() => [
    {
      key: 'name', header: 'Name', primary: true, accessor: (u) => u.name || u.email || '',
      render: (u) => <div className="min-w-0"><p className="truncate font-medium">{u.name || u.email}</p><p className="truncate text-xs text-muted-foreground">{u.email}</p></div>,
    },
    {
      key: 'roles', header: 'Roles', accessor: (u) => (u.roles ?? []).map((r) => roleName.get(r) ?? r).join(', '),
      render: (u) => <div className="flex flex-wrap gap-1">{(u.roles ?? []).map((r) => <ToneBadge key={r} tone="primary">{roleName.get(r) ?? r}</ToneBadge>)}</div>,
    },
    { key: 'status', header: 'Access', hideBelow: 'md', accessor: (u) => u.status || 'active', render: (u) => <StatusBadge status={u.status || 'active'} label={(u.status || 'active') === 'active' ? 'Active' : 'Suspended'} /> },
    ...(manage ? [{
      key: 'actions', header: '', mobileAction: true, accessor: () => '',
      render: (u: StaffUser) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setEditing(u)}><UserCog /> Roles</Button>
          {(u.status || 'active') === 'active'
            ? <Button size="sm" variant="ghost" aria-label="Suspend access" onClick={() => setSuspending(u)}><ShieldOff /></Button>
            : <Button size="sm" variant="ghost" aria-label="Restore access" onClick={() => setStatus.mutate({ id: u.id, status: 'active' })}><ShieldCheck /></Button>}
        </div>
      ),
    }] : []),
  ], [manage, roleName, setStatus]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Staff"
        subtitle="Invite estate staff, give them Maskani roles and choose which properties they work on."
        actions={<>
          <Link href={`/${slug}/settings/roles`} className={buttonVariants({ variant: 'outline' })}><KeyRound /> Roles and permissions</Link>
          {manage && <Button onClick={() => setInviting(true)}><MailPlus /> Invite staff</Button>}
        </>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={UserCog} label="Staff" value={users.length} loading={isLoading} />
        <StatTile icon={ShieldCheck} label="Active" value={active} loading={isLoading} />
        <StatTile icon={ShieldOff} label="Suspended" value={users.length - active} loading={isLoading} />
        <StatTile icon={KeyRound} label="Staff roles" value={staffRoles.length} href={`/${slug}/settings/roles`} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput value={q} onSearch={(v) => setQ(v)} placeholder="Search name or email" className="sm:max-w-xs" />
        <NativeSelect className="sm:w-56" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Role">
          <option value="">Any role</option>
          {staffRoles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
        </NativeSelect>
        <NativeSelect className="sm:w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Access">
          <option value="">Any access</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </NativeSelect>
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(u) => u.id} loading={isLoading} emptyText="No staff match." storageKey="maskani-users" />

      <p className="text-xs text-muted-foreground">
        People keep one Codevertex account for every product. Their sign-in, password and other products are managed in{' '}
        <a href={`${AUTH_UI_URL}/dashboard/my-tenant`} className="text-primary underline" target="_blank" rel="noreferrer">Codevertex accounts</a>.
      </p>

      <RoleSheet user={editing} roles={staffRoles} onClose={() => setEditing(null)} />
      <InviteSheet open={inviting} onOpenChange={setInviting} roles={staffRoles} />
      <ConfirmDialog
        open={!!suspending}
        onOpenChange={(o) => !o && setSuspending(null)}
        title={`Suspend ${suspending?.name || suspending?.email || ''}?`}
        description="They will no longer reach Maskani for this estate. Their Codevertex account and other products are not affected, and you can restore access at any time."
        confirmLabel="Suspend access"
        variant="warning"
        loading={setStatus.isPending}
        onConfirm={() => suspending && setStatus.mutate({ id: suspending.id, status: 'suspended' }, { onSuccess: () => setSuspending(null) })}
      />
    </div>
  );
}

function RoleChecklist({ roles, picked, onChange }: { roles: Role[]; picked: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-2">
      {roles.map((r) => (
        <label key={r.code} className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-secondary/40">
          <Checkbox checked={picked.includes(r.code)} onCheckedChange={(v) => onChange(v ? [...picked, r.code] : picked.filter((x) => x !== r.code))} className="mt-0.5" />
          <span className="min-w-0">
            <span className="block text-sm font-medium">{r.name}{!r.is_system_role && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(this estate)</span>}</span>
            {r.description && <span className="block text-xs text-muted-foreground">{r.description}</span>}
            <span className="block text-xs text-muted-foreground">{r.permissions.length} permissions</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function RoleSheet({ user, roles, onClose }: { user: StaffUser | null; roles: Role[]; onClose: () => void }) {
  const setRoles = useSetUserRoles();
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => setPicked(user?.roles ?? []), [user]);
  return (
    <FormSheet
      open={!!user}
      onOpenChange={(o) => !o && onClose()}
      size="md"
      title={`Roles for ${user?.name || user?.email || ''}`}
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={setRoles.isPending || picked.length === 0} onClick={() => user && setRoles.mutate({ id: user.id, roles: picked }, { onSuccess: onClose })}>
          {setRoles.isPending ? 'Saving...' : 'Save roles'}
        </Button>
      </>}
    >
      <RoleChecklist roles={roles} picked={picked} onChange={setPicked} />
    </FormSheet>
  );
}

function InviteSheet({ open, onOpenChange, roles }: { open: boolean; onOpenChange: (o: boolean) => void; roles: Role[] }) {
  const invite = useInviteStaff();
  const { data: properties = [] } = useProperties();
  const [f, setF] = useState({ email: '', name: '', phone: '' });
  const [picked, setPicked] = useState<string[]>([]);
  const [props, setProps] = useState<string[]>([]);
  const [result, setResult] = useState<{ email: string; temp?: string } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) { setF({ email: '', name: '', phone: '' }); setPicked([]); setProps([]); setResult(null); setError(''); }
  }, [open]);
  const valid = /\S+@\S+\.\S+/.test(f.email) && picked.length > 0;

  const submit = () => {
    setError('');
    invite.mutate(
      { email: f.email.trim(), name: f.name.trim() || undefined, phone: f.phone.trim() || undefined, roles: picked, property_ids: props.length ? props : undefined },
      {
        onSuccess: (r) => { setResult({ email: f.email.trim(), temp: r.temp_password }); toast.success('Staff member added'); },
        onError: (e) => setError(apiErrorMessage(e, 'Could not add this person.')),
      },
    );
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={result ? 'Staff member added' : 'Invite staff'}
      footer={result
        ? <Button onClick={() => onOpenChange(false)}>Done</Button>
        : <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!valid || invite.isPending}>{invite.isPending ? 'Adding...' : 'Add staff member'}</Button>
        </>}
    >
      {result ? (
        <div className="space-y-4">
          <p className="text-sm">{result.email} can now sign in to this estate with their Codevertex account.</p>
          {result.temp ? (
            <div className="space-y-2 rounded-xl border border-warning/40 bg-warning/5 p-4">
              <p className="text-sm font-medium">A new account was created. Its temporary password is shown only now:</p>
              <div className="flex gap-2">
                <Input readOnly value={result.temp} className="font-mono" aria-label="Temporary password" />
                <Button variant="outline" size="icon" aria-label="Copy" onClick={() => void navigator.clipboard?.writeText(result.temp!).then(() => toast.success('Copied'))}><Copy /></Button>
              </div>
              <p className="text-xs text-muted-foreground">They also get an email with the sign-in link, and must choose a new password the first time.</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">They already had a Codevertex account, so they sign in with their existing password.</p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="iv-email" required hint="They sign in with this email">
              <Input id="iv-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="off" />
            </Field>
            <Field label="Full name" htmlFor="iv-name">
              <Input id="iv-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </Field>
            <Field label="Phone" htmlFor="iv-phone" hint="Optional, for WhatsApp alerts">
              <Input id="iv-phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="0712 345 678" />
            </Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Roles</p>
            <RoleChecklist roles={roles} picked={picked} onChange={setPicked} />
          </div>
          {properties.length > 1 && (
            <div>
              <p className="mb-1 text-sm font-semibold">Properties</p>
              <p className="mb-2 text-xs text-muted-foreground">Leave all unticked to let them work on every property.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {properties.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 hover:bg-secondary/40">
                    <Checkbox checked={props.includes(p.id)} onCheckedChange={(v) => setProps((s) => (v ? [...s, p.id] : s.filter((x) => x !== p.id)))} />
                    <span className="text-sm">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </div>
      )}
    </FormSheet>
  );
}
