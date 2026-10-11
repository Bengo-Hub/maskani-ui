'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { settingsApi, type StaffInviteInput } from '@/lib/api/operations';
import type { ApprovalRuleInput, PrivacyKind, PrivacyStatus, Role } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth';
import { useAccess, useSlug } from './use-access';
import { useKeysetList } from './use-keyset-list';

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

/** Saves a list entry. `quiet` leaves the success message to the caller (the combobox names the entry). */
export function useUpsertCatalogue(kind: string, quiet = false) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, name, active }: { code: string; name: string; active?: boolean }) =>
      settingsApi.upsertCatalogue(slug, kind, code, { name, active }),
    onSuccess: () => {
      if (!quiet) toast.success('Saved');
      return qc.invalidateQueries({ queryKey: qk.catalogue(slug, kind) });
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
    /** Saves any role: a default one first gets this estate's own copy, which takes the edits. */
    save: useMutation({
      mutationFn: async ({ role, ...body }: { role: Role; name?: string; description?: string; permissions: string[] }) => {
        const id = role.is_system_role ? (await settingsApi.customizeRole(slug, role.code)).id : role.id;
        return settingsApi.updateRole(slug, id, body);
      },
      onSuccess: done('Role saved for this estate'),
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

/** The estate's approval rules for credits. */
export function useApprovalRules() {
  const slug = useSlug();
  const { can } = useAccess();
  return useQuery({
    queryKey: qk.approvalRules(slug),
    queryFn: () => settingsApi.approvalRules(slug).then((r) => r.data ?? []),
    enabled: can('settings.view') || can('billing.approve'),
  });
}

export function useSaveApprovalRule() {
  const slug = useSlug();
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: qk.approvalRules(slug) });
  return {
    save: useMutation({
      mutationFn: (v: { id?: string; body: ApprovalRuleInput }) => (v.id ? settingsApi.updateApprovalRule(slug, v.id, v.body) : settingsApi.createApprovalRule(slug, v.body)),
      onSuccess: () => { toast.success('Approval rule saved'); refresh(); },
    }),
    remove: useMutation({
      mutationFn: (id: string) => settingsApi.deleteApprovalRule(slug, id),
      onSuccess: () => { toast.success('Approval rule removed'); refresh(); },
    }),
  };
}

/** The audit trail of critical security workflows, newest first (administrators). */
export function useAuditLogs(f: { targetType: string; from: string; to: string }) {
  const slug = useSlug();
  const { can } = useAccess();
  return useKeysetList(
    [slug, 'audit-logs', f.targetType, f.from, f.to],
    (cursor) => settingsApi.auditLogs(slug, { target_type: f.targetType || undefined, from: f.from || undefined, to: f.to || undefined, cursor, limit: 50 }),
    { enabled: can('settings.manage') },
  );
}

/** Data subject requests for the office, newest first. */
export function usePrivacyRequests(f: { status: PrivacyStatus | ''; overdue: boolean }) {
  const slug = useSlug();
  const { can } = useAccess();
  return useKeysetList(
    [slug, 'privacy-requests', f.status, f.overdue],
    (cursor) => settingsApi.privacyRequests(slug, { status: f.status || undefined, overdue: f.overdue, cursor, limit: 50 }),
    { enabled: can('privacy.manage') },
  );
}

/** Every office step on a privacy request; each refreshes the list. */
export function usePrivacyActions() {
  const slug = useSlug();
  const qc = useQueryClient();
  const done = (msg: string) => () => {
    toast.success(msg);
    void qc.invalidateQueries({ queryKey: [slug, 'privacy-requests'] });
  };
  return {
    create: useMutation({ mutationFn: (b: { party_id: string; kind: PrivacyKind; notes?: string }) => settingsApi.createPrivacyRequest(slug, b), onSuccess: done('Request recorded') }),
    sendCode: useMutation({ mutationFn: (id: string) => settingsApi.sendPrivacyCode(slug, id), onSuccess: done('Code sent to the phone and email on record') }),
    verify: useMutation({
      mutationFn: (v: { id: string; code?: string; in_person?: boolean; note?: string }) => settingsApi.verifyPrivacyRequest(slug, v.id, v),
      onSuccess: done('Identity confirmed'),
    }),
    close: useMutation({
      mutationFn: (v: { id: string; action: 'complete' | 'reject' | 'anonymise'; text?: string }) => settingsApi.closePrivacyRequest(slug, v.id, v.action, v.text),
      onSuccess: (_r, v) => done(v.action === 'reject' ? 'Request rejected' : v.action === 'anonymise' ? 'Details erased' : 'Request completed')(),
    }),
  };
}

/** The central approvals inbox: requests by status and workflow, optionally only those waiting for me. */
export function useApprovals(f: { status: string; module: string; mine: boolean; propertyId: string }) {
  const slug = useSlug();
  const { can } = useAccess();
  return useKeysetList(
    qk.approvals(slug, `${f.status}:${f.module}:${f.mine}:${f.propertyId || 'all'}`),
    (cursor) => settingsApi.approvals(slug, { status: f.status || undefined, module: f.module || undefined, mine: f.mine,
      property_id: f.propertyId || undefined, cursor, limit: 24 }),
    { enabled: can('billing.approve') || can('billing.verify') || can('settings.view') },
  );
}

/** Approves or rejects a request's current step; every queue that shows approvals refreshes. */
export function useDecideApproval() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; decision: 'approve' | 'reject'; comment?: string }) => settingsApi.decideApproval(slug, v.id, v.decision, v.comment),
    onSuccess: (r) => {
      toast.success(r.status === 'approved' ? 'Approved' : r.status === 'rejected' ? 'Rejected' : 'Approved; it moves to the next step');
      for (const k of ['approvals', 'adjustments', 'manual-payments', 'work-orders']) void qc.invalidateQueries({ queryKey: [slug, k] });
      void qc.invalidateQueries({ queryKey: qk.accounts(slug) });
    },
  });
}
