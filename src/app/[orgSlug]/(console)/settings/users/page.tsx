'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormSheet } from '@/components/common/form-sheet';
import { PageHeader } from '@/components/common/page-header';
import { ToneBadge } from '@/components/common/status-badge';
import { useAccess } from '@/hooks/use-access';
import { useRoles, useSetUserRoles, useUsers } from '@/hooks/use-settings';
import type { StaffUser } from '@/lib/api/types';
import { AUTH_UI_URL } from '@/lib/config';

/**
 * Maskani roles for staff. People join the organisation in Codevertex accounts (SSO); here they
 * get their Maskani roles. A user list is bounded (at most a few hundred staff), so it pages locally.
 */
export default function UsersPage() {
  const { can } = useAccess();
  const manage = can('users.manage');
  const { data: users = [], isLoading } = useUsers('staff');
  const { data: roles = [] } = useRoles();
  const setRoles = useSetUserRoles();
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => setPicked(editing?.roles ?? []), [editing]);
  const staffRoles = roles.filter((r) => !r.is_customer_role);
  const roleName = useMemo(() => new Map(roles.map((r) => [r.role_code, r.name])), [roles]);

  const columns = useMemo<DataTableColumn<StaffUser>[]>(() => [
    { key: 'name', header: 'Name', primary: true, accessor: (u) => u.name || u.email || '', render: (u) => <div><p className="font-medium">{u.name || u.email}</p><p className="text-xs text-muted-foreground">{u.email}</p></div> },
    { key: 'roles', header: 'Roles', accessor: (u) => (u.roles ?? []).join(', '), render: (u) => <div className="flex flex-wrap gap-1">{(u.roles ?? []).map((r) => <ToneBadge key={r} tone="primary">{roleName.get(r) ?? r}</ToneBadge>)}</div> },
    ...(manage ? [{ key: 'edit', header: '', mobileAction: true, accessor: () => '', render: (u: StaffUser) => <Button size="sm" variant="outline" onClick={() => setEditing(u)}>Roles</Button> }] : []),
  ], [manage, roleName]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Users and roles"
        subtitle={<>Invite staff in <a href={`${AUTH_UI_URL}/dashboard/my-tenant`} className="text-primary underline" target="_blank" rel="noreferrer">Codevertex accounts</a>, then give them Maskani roles here. Assign them to properties from each property page.</>}
      />
      <DataTable columns={columns} rows={users} rowKey={(u) => u.id} loading={isLoading} emptyText="No staff yet." storageKey="maskani-users" />
      <FormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        size="md"
        title={`Roles for ${editing?.name || editing?.email || ''}`}
        footer={<>
          <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          <Button disabled={setRoles.isPending} onClick={() => editing && setRoles.mutate({ id: editing.id, roles: picked }, { onSuccess: () => setEditing(null) })}>{setRoles.isPending ? 'Saving...' : 'Save roles'}</Button>
        </>}
      >
        <div className="space-y-2">
          {staffRoles.map((r) => (
            <label key={r.role_code} className="flex items-start gap-3 rounded-lg border p-3">
              <Checkbox checked={picked.includes(r.role_code)} onCheckedChange={(v) => setPicked((s) => (v ? [...s, r.role_code] : s.filter((x) => x !== r.role_code)))} className="mt-0.5" />
              <span><span className="block text-sm font-medium">{r.name}</span>{r.description && <span className="text-xs text-muted-foreground">{r.description}</span>}</span>
            </label>
          ))}
        </div>
      </FormSheet>
    </div>
  );
}
