'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { settingsApi } from '@/lib/api/operations';
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
      void qc.invalidateQueries({ queryKey: qk.users(slug) });
    },
  });
}

export const USE_CASES: { value: string; label: string }[] = [
  { value: 'estate_developer', label: 'Estate (developer managed)' },
  { value: 'owners_association', label: 'Estate (owners association)' },
  { value: 'developer_sales', label: 'Development sales only' },
  { value: 'residential_manager', label: 'Residential lettings' },
  { value: 'commercial_manager', label: 'Commercial lettings' },
  { value: 'self_managing_landlord', label: 'Landlord, self managed' },
];
