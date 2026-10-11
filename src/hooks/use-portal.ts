'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { portalApi } from '@/lib/api/portal';
import type { BillQueryInput, PassInput, PrivacyKind, WorkPriority } from '@/lib/api/types';
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
  const qc = useQueryClient();
  const refreshMe = useAuthStore((s) => s.refreshMe);
  return useMutation({
    mutationFn: (version: string) => portalApi.acceptTerms(slug, version),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.portalTerms(slug) });
      return refreshMe(slug);
    },
  });
}

/** The resident's own privacy requests, newest first. */
export function useMyPrivacyRequests() {
  const slug = useSlug();
  const ready = usePortalReady();
  return useQuery({ queryKey: qk.portalPrivacy(slug), queryFn: () => portalApi.privacyRequests(slug).then((r) => r.data ?? []), enabled: ready });
}

export function useCreateMyPrivacyRequest() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { kind: PrivacyKind; notes?: string }) => portalApi.createPrivacyRequest(slug, b),
    onSuccess: () => {
      toast.success('Request sent to the estate office');
      void qc.invalidateQueries({ queryKey: qk.portalPrivacy(slug) });
    },
  });
}

/** Every acceptance of the terms and privacy notice, newest first. */
export function useTermsHistory() {
  const slug = useSlug();
  const ready = usePortalReady();
  return useQuery({ queryKey: qk.portalTerms(slug), queryFn: () => portalApi.termsHistory(slug).then((r) => r.data ?? []), enabled: ready });
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

/** The buyer accepts an approved new payment plan. */
export function useAcceptPortalPlan() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => portalApi.acceptPlan(slug, planId),
    onSuccess: () => {
      toast.success('Thank you. Your new payment plan is in force.');
      void qc.invalidateQueries({ queryKey: qk.portalPurchase(slug) });
    },
  });
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

/** The resident's bill queries and their answers, newest first. */
export function useMyBillQueries() {
  const slug = useSlug();
  const ready = usePortalReady();
  return useKeysetList(qk.billQueries(slug, 'mine'), (cursor) => portalApi.billQueries(slug, cursor), { enabled: ready });
}

export function useRaiseBillQuery(accountId: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BillQueryInput) => portalApi.raiseBillQuery(slug, accountId, body),
    onSuccess: () => { toast.success('Query sent to the estate office'); void qc.invalidateQueries({ queryKey: qk.billQueries(slug, 'mine') }); },
  });
}

/** A unit's household, staff and vehicles, managed by its owners and occupants. */
export function useHousehold(unitId: string) {
  const slug = useSlug();
  const ready = usePortalReady();
  return useQuery({ queryKey: [slug, 'household', unitId], queryFn: () => portalApi.household(slug, unitId), enabled: ready && !!unitId });
}

export function useHouseholdActions(unitId: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  const refresh = (msg: string) => () => { toast.success(msg); void qc.invalidateQueries({ queryKey: [slug, 'household', unitId] }); };
  return {
    addPerson: useMutation({
      mutationFn: (body: { name: string; phone?: string; role: 'household_member' | 'domestic_staff' }) => portalApi.addHousehold(slug, unitId, body),
      onSuccess: refresh('Added'),
    }),
    endPerson: useMutation({ mutationFn: (linkId: string) => portalApi.endHousehold(slug, unitId, linkId), onSuccess: refresh('Removed') }),
    addVehicle: useMutation({
      mutationFn: (body: { plate: string; make?: string; model?: string; colour?: string }) => portalApi.addVehicle(slug, unitId, body),
      onSuccess: refresh('Vehicle added'),
    }),
    removeVehicle: useMutation({ mutationFn: (vehicleId: string) => portalApi.removeVehicle(slug, unitId, vehicleId), onSuccess: refresh('Vehicle removed') }),
  };
}
