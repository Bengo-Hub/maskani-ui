'use client';

import { useMemo, useState } from 'react';
import { Trash2, UserPlus, Users } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { useAccess, useSlug } from '@/hooks/use-access';
import { usePropertyStaff } from '@/hooks/use-register';
import { useUsers } from '@/hooks/use-settings';
import { registerApi } from '@/lib/api/register';
import type { PropertyRole, StaffAssignment } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';
import { titleCase } from '@/lib/utils';

const ROLES: PropertyRole[] = ['property_manager', 'caretaker', 'finance', 'sales', 'letting', 'security', 'other'];

export function PropertyStaff({ propertyId }: { propertyId: string }) {
  const slug = useSlug();
  const qc = useQueryClient();
  const { can } = useAccess();
  const manage = can('users.manage');
  const { data: staff = [], isLoading } = usePropertyStaff(propertyId, can('users.view'));
  const { data: users = [] } = useUsers('staff');
  const byLocalId = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ user: string; role: PropertyRole }>({ user: '', role: 'caretaker' });
  const [removing, setRemoving] = useState<StaffAssignment | null>(null);

  const refresh = () => void qc.invalidateQueries({ queryKey: qk.propertyStaff(slug, propertyId) });
  const assign = useMutation({
    mutationFn: () => {
      const u = byLocalId.get(form.user);
      return registerApi.assignStaff(slug, propertyId, { auth_user_id: u?.auth_service_user_id ?? '', property_role: form.role });
    },
    onSuccess: () => { toast.success('Staff assigned'); setOpen(false); refresh(); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => registerApi.removeStaff(slug, id),
    onSuccess: () => { toast.success('Assignment removed'); setRemoving(null); refresh(); },
  });

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
                  <Button variant="ghost" size="icon" onClick={() => setRemoving(s)} aria-label="Remove assignment"><Trash2 /></Button>
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
          <Button onClick={() => assign.mutate()} disabled={!form.user || assign.isPending}>{assign.isPending ? 'Saving...' : 'Assign'}</Button>
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
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </div>
  );
}
