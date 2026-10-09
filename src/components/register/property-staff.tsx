'use client';

import { useMemo, useState } from 'react';
import { Trash2, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { IconButton } from '@/components/common/icon-button';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { useAccess } from '@/hooks/use-access';
import { useAssignStaff, usePropertyStaff, useRemoveStaff } from '@/hooks/use-register';
import { useUsers } from '@/hooks/use-settings';
import type { PropertyRole, StaffAssignment } from '@/lib/api/types';
import { titleCase } from '@/lib/utils';

const ROLES: PropertyRole[] = ['property_manager', 'caretaker', 'finance', 'sales', 'letting', 'security', 'other'];

export function PropertyStaff({ propertyId }: { propertyId: string }) {
  const { can } = useAccess();
  const manage = can('users.manage');
  const { data: staff = [], isLoading } = usePropertyStaff(propertyId, can('users.view'));
  const { data: users = [] } = useUsers('staff');
  const byLocalId = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ user: string; role: PropertyRole }>({ user: '', role: 'caretaker' });
  const [removing, setRemoving] = useState<StaffAssignment | null>(null);

  const assign = useAssignStaff(propertyId);
  const remove = useRemoveStaff(propertyId);
  const submit = () => assign.mutate(
    { auth_user_id: byLocalId.get(form.user)?.auth_service_user_id ?? '', property_role: form.role },
    { onSuccess: () => setOpen(false) },
  );

  return (
    <div className="space-y-3">
      {manage && <div className="flex justify-end"><Button variant="outline" onClick={() => setOpen(true)}><UserPlus /> Assign staff</Button></div>}
      {!isLoading && staff.length === 0 ? (
        <EmptyState icon={Users} title="No staff assigned" description="Staff with no property assignment can see every property." />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {staff.map((s) => {
            const u = byLocalId.get(s.user_id);
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{u?.name || u?.email || 'Staff member'}</p>
                  <p className="text-xs text-muted-foreground">{titleCase(s.property_role)}{u?.phone ? ` · ${u.phone}` : ''}</p>
                </div>
                {manage && (
                  <IconButton label="Remove assignment" onClick={() => setRemoving(s)}><Trash2 /></IconButton>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <FormSheet
        open={open}
        onOpenChange={setOpen}
        size="sm"
        title="Assign staff"
        description="Staff must already belong to your organisation in Codevertex accounts."
        footer={<>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!form.user || assign.isPending}>{assign.isPending ? 'Saving...' : 'Assign'}</Button>
        </>}
      >
        <div className="space-y-4">
          <Field label="Person" htmlFor="s-user" required>
            <NativeSelect id="s-user" value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })}>
              <option value="">Choose a staff member</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Role at this property" htmlFor="s-role">
            <NativeSelect id="s-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as PropertyRole })}>
              {ROLES.map((r) => <option key={r} value={r}>{titleCase(r)}</option>)}
            </NativeSelect>
          </Field>
        </div>
      </FormSheet>
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        variant="danger"
        title="Remove this assignment?"
        description="They lose access to this property unless they have other assignments."
        confirmLabel="Remove"
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
      />
    </div>
  );
}
