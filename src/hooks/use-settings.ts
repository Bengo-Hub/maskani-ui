'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { settingsApi, type StaffInviteInput } from '@/lib/api/operations';
import { qk } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth';
import { useAccess, useSlug } from './use-access';

/** Catalogue entries (property_type, unit_type, wo_category, pass_type, ...), cached for 30 minutes. */
export function useCatalogue(kind: string) {
  const slug = useSlug();
  const { ready } = useAccess();
  return useQuery({
    queryKey: qk.catalogue(slug, kind),
    queryFn: () => settingsApi.catalogue(slug, kind).then((r) => (r.data ?? []).filter((e) => e.active !== false)),
    enabled: ready,
    staleTime: 30 * 60 * 1000,
  });
}

/** Every entry of a list, switched-off ones included, for the settings editor. */
export function useCatalogueAll(kind: string) {
  const slug = useSlug();
  const { can } = useAccess();
  return useQuery({
    queryKey: [...qk.catalogue(slug, kind), 'all'],
    queryFn: () => settingsApi.catalogue(slug, kind).then((r) => r.data ?? []),
    enabled: can('settings.view'),
  });
}

/** The estate's general settings (billing days, water, channels). */
export function useEstateSettings<T = Record<string, unknown>>() {
  const slug = useSlug();
  const { can } = useAccess();
  return useQuery({
    queryKey: qk.settings(slug),
    queryFn: () => settingsApi.settings(slug) as Promise<T>,
    enabled: can('settings.view'),
  });
}

export function useUpdateEstateSettings() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => settingsApi.updateSettings(slug, body),
    onSuccess: () => {
      toast.success('Settings saved');
      void qc.invalidateQueries({ queryKey: qk.settings(slug) });
      void useAuthStore.getState().refreshMe(slug);
    },
  });
}

export function useUpsertCatalogue(kind: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, name, active }: { code: string; name: string; active?: boolean }) =>
      settingsApi.upsertCatalogue(slug, kind, code, { name, active }),
    onSuccess: () => {
      toast.success('Saved');
      void qc.invalidateQueries({ queryKey: qk.catalogue(slug, kind) });
    },
  });
}

export function useModules() {
  const slug = useSlug();
  const { can } = useAccess();
  return useQuery({ queryKey: qk.modules(slug), queryFn: () => settingsApi.modules(slug), enabled: can('settings.view') });
}

export function useSetModules() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { modules: string[] } | { preset: string }) => settingsApi.setModules(slug, body),
    onSuccess: () => {
      toast.success('Modules updated');
      void qc.invalidateQueries({ queryKey: qk.modules(slug) });
      // Navigation follows /auth/me modules, so refresh the profile too.
      void useAuthStore.getState().refreshMe(slug);
    },
  });
}

export function useUsers(kind?: string) {
  const slug = useSlug();
  const { can } = useAccess();
  return useQuery({
    queryKey: qk.users(slug, kind),
    queryFn: () => settingsApi.users(slug, kind).then((r) => r.data ?? []),
    enabled: can('users.view'),
  });
}

export function useRoles() {
  const slug = useSlug();
  const { can } = useAccess();
  return useQuery({ queryKey: qk.roles(slug), queryFn: () => settingsApi.roles(slug).then((r) => r.data ?? []), enabled: can('users.view'), staleTime: 10 * 60 * 1000 });
}

export function useSetUserRoles() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roles }: { id: string; roles: string[] }) => settingsApi.setUserRoles(slug, id, roles),
    onSuccess: () => {
      toast.success('Roles updated');
      void qc.invalidateQueries({ queryKey: [slug, 'users'] });
      void qc.invalidateQueries({ queryKey: qk.roles(slug) });
    },
  });
}

export function useSetUserStatus() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' }) => settingsApi.setUserStatus(slug, id, status),
    onSuccess: (_d, v) => {
      toast.success(v.status === 'active' ? 'Access restored' : 'Access suspended');
      void qc.invalidateQueries({ queryKey: [slug, 'users'] });
    },
  });
}

export function useInviteStaff() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StaffInviteInput) => settingsApi.inviteStaff(slug, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [slug, 'users'] });
      void qc.invalidateQueries({ queryKey: qk.roles(slug) });
    },
  });
}

export function usePermissions() {
  const slug = useSlug();
  const { can } = useAccess();
  return useQuery({
    queryKey: qk.permissions(slug),
    queryFn: () => settingsApi.permissions(slug).then((r) => r.data ?? []),
    enabled: can('users.view'),
    staleTime: 60 * 60 * 1000,
  });
}

/** Role edits: create, customise a default, save name and permissions, delete or reset. */
export function useRoleMutations() {
  const slug = useSlug();
  const qc = useQueryClient();
  const done = (msg: string) => () => {
    toast.success(msg);
    void qc.invalidateQueries({ queryKey: qk.roles(slug) });
    void useAuthStore.getState().refreshMe(slug);
  };
  return {
    create: useMutation({
      mutationFn: (body: { code: string; name: string; description?: string; permissions: string[] }) => settingsApi.createRole(slug, body),
      onSuccess: done('Role created'),
    }),
    customize: useMutation({ mutationFn: (code: string) => settingsApi.customizeRole(slug, code), onSuccess: done('This estate now has its own copy of the role') }),
    update: useMutation({
      mutationFn: ({ id, ...body }: { id: string; name?: string; description?: string; permissions?: string[] }) => settingsApi.updateRole(slug, id, body),
      onSuccess: done('Role saved'),
    }),
    remove: useMutation({ mutationFn: (id: string) => settingsApi.deleteRole(slug, id), onSuccess: done('Role removed') }),
  };
}

export const USE_CASES: { value: string; label: string }[] = [
  { value: 'estate_developer', label: 'Estate (developer managed)' },
  { value: 'owners_association', label: 'Estate (owners association)' },
  { value: 'developer_sales', label: 'Development sales only' },
  { value: 'residential_manager', label: 'Residential lettings' },
  { value: 'commercial_manager', label: 'Commercial lettings' },
  { value: 'self_managing_landlord', label: 'Landlord, self managed' },
];
