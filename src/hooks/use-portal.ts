'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { portalApi } from '@/lib/api/portal';
import type { PassInput, WorkPriority } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth';
import { useSlug } from './use-access';
import { useKeysetList } from './use-keyset-list';

function usePortalReady() {
  const me = useAuthStore((s) => s.me);
  return !!me?.is_portal_user;
}

/** Records the terms version the resident accepted, then reloads /auth/me so the gate closes. */
export function useAcceptTerms() {
  const slug = useSlug();
  const refreshMe = useAuthStore((s) => s.refreshMe);
  return useMutation({
    mutationFn: (version: string) => portalApi.acceptTerms(slug, version),
    onSuccess: () => refreshMe(slug),
  });
}

export function usePortalUnits() {
  const slug = useSlug();
  const ready = usePortalReady();
  return useQuery({ queryKey: qk.portalUnits(slug), queryFn: () => portalApi.units(slug).then((r) => r.data ?? []), enabled: ready, staleTime: 30_000 });
}

export function usePortalStatement(accountId: string) {
  const slug = useSlug();
  return useQuery({ queryKey: qk.portalStatement(slug, accountId), queryFn: () => portalApi.statement(slug, accountId), enabled: !!accountId });
}

export function usePortalPurchase() {
  const slug = useSlug();
  const ready = usePortalReady();
  return useQuery({ queryKey: qk.portalPurchase(slug), queryFn: () => portalApi.purchase(slug).then((r) => r.data ?? []), enabled: ready });
}

export function usePortalPasses() {
  const slug = useSlug();
  const ready = usePortalReady();
  return useQuery({ queryKey: qk.portalPasses(slug), queryFn: () => portalApi.passes(slug).then((r) => r.data ?? []), enabled: ready });
}

export function useCreatePortalPass() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<PassInput, 'property_id'> & { property_id?: string }) => portalApi.createPass(slug, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.portalPasses(slug) }),
  });
}

/** A resident's answer to a walk-in at the gate. The API returns the recorded decision, which is
 *  "timeout" when the 5 minutes ran out first; decided_by says whether the guard settled it already. */
export function useDecideWalkIn(id: string) {
  const slug = useSlug();
  return useMutation({
    mutationFn: (approve: boolean) => portalApi.decideWalkIn(slug, id, approve) as Promise<{ decision?: string; decided_by?: string }>,
  });
}

export function useCancelPortalPass() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => portalApi.cancelPass(slug, id),
    onSuccess: () => { toast.success('Pass cancelled'); void qc.invalidateQueries({ queryKey: qk.portalPasses(slug) }); },
  });
}

export function usePortalRequests() {
  const slug = useSlug();
  const ready = usePortalReady();
  return useKeysetList(qk.portalRequests(slug), (cursor) => portalApi.requests(slug, cursor), { enabled: ready });
}

export function useCreatePortalRequest() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { unit_id: string; category?: string; priority: WorkPriority; title: string; description?: string; photos?: string[] }) =>
      portalApi.createRequest(slug, body),
    onSuccess: () => { toast.success('Request sent to the estate office'); void qc.invalidateQueries({ queryKey: qk.portalRequests(slug) }); },
  });
}

export function usePortalRequestAction() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: 'confirm' | 'reopen'; note?: string }) => portalApi.requestAction(slug, id, { action, note }),
    onSuccess: (_d, v) => {
      toast.success(v.action === 'confirm' ? 'Thanks, marked as done' : 'Reopened. The estate office has been told.');
      void qc.invalidateQueries({ queryKey: qk.portalRequests(slug) });
    },
  });
}

export function usePortalNotices() {
  const slug = useSlug();
  const ready = usePortalReady();
  return useQuery({ queryKey: qk.portalNotices(slug), queryFn: () => portalApi.notices(slug).then((r) => r.data ?? []), enabled: ready });
}
