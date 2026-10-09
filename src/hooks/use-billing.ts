'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { billingApi, type ChargeTypeInput, type FundInput, type RateInput, type RunInput } from '@/lib/api/billing';
import type { PayRequest } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';
import { useAccess, useSlug } from './use-access';
import { useKeysetList } from './use-keyset-list';

export function useFunds() {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useQuery({ queryKey: qk.funds(slug), queryFn: () => billingApi.funds(slug).then((r) => r.data ?? []), enabled: canAll('billing', 'billing.view'), staleTime: 10 * 60 * 1000 });
}

export function useChargeTypes() {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useQuery({ queryKey: qk.charges(slug), queryFn: () => billingApi.chargeTypes(slug).then((r) => r.data ?? []), enabled: canAll('billing', 'billing.view'), staleTime: 5 * 60 * 1000 });
}

function useChargeMutation<T>(fn: (slug: string, v: T) => Promise<unknown>, message: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: T) => fn(slug, v),
    onSuccess: () => { toast.success(message); void qc.invalidateQueries({ queryKey: qk.charges(slug) }); },
  });
}

export const useCreateChargeType = () => useChargeMutation((s, v: ChargeTypeInput) => billingApi.createChargeType(s, v), 'Charge added');
export const useEnableChargeType = () => useChargeMutation((s, code: string) => billingApi.enableChargeType(s, code), 'Charge added from the catalogue');

/** Standard charges not yet added (only fetched while the catalogue sheet is open). */
export function useChargeCatalogue(open: boolean) {
  const slug = useSlug();
  return useQuery({
    queryKey: [...qk.charges(slug), 'catalogue'],
    queryFn: () => billingApi.chargeCatalogue(slug).then((r) => r.data ?? []),
    enabled: open,
  });
}
export const useUpdateChargeType = () =>
  useChargeMutation((s, v: { id: string; body: ChargeTypeInput }) => billingApi.updateChargeType(s, v.id, v.body), 'Charge updated');

export function useUpdateFund() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: FundInput }) => billingApi.updateFund(slug, id, body),
    onSuccess: () => { toast.success('Fund saved'); void qc.invalidateQueries({ queryKey: qk.funds(slug) }); },
  });
}
export const useAddRate = () =>
  useChargeMutation((s, v: { chargeTypeId: string; rate: RateInput }) => billingApi.addRate(s, v.chargeTypeId, v.rate), 'Rate saved');

export function useBillingRuns(propertyId: string) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useKeysetList(
    qk.runList(slug, propertyId || undefined),
    (cursor) => billingApi.runs(slug, { property_id: propertyId || undefined, cursor, limit: 24 }),
    { enabled: canAll('billing', 'billing.view') },
  );
}

/** A run being issued refreshes on the realtime event and, as a fallback, every 5 s while issuing. */
export function useBillingRun(id: string) {
  const slug = useSlug();
  return useQuery({
    queryKey: qk.run(slug, id),
    queryFn: () => billingApi.run(slug, id),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data?.status === 'issuing' ? 5000 : false),
  });
}

export function useRunLines(id: string, status?: string) {
  const slug = useSlug();
  return useQuery({
    queryKey: [...qk.runLines(slug, id), status ?? ''],
    queryFn: () => billingApi.runLines(slug, id).then((r) => r.data ?? []),
    enabled: !!id,
    refetchInterval: status === 'issuing' ? 5000 : false,
  });
}

export function usePreviewRun() {
  const slug = useSlug();
  return useMutation({ mutationFn: (body: RunInput) => billingApi.preview(slug, body) });
}

export function useIssueRun() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RunInput) => billingApi.issue(slug, body),
    onSuccess: () => { toast.success('Bills are being issued'); void qc.invalidateQueries({ queryKey: qk.runs(slug) }); },
  });
}

export function useRetryRun() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => billingApi.retry(slug, id),
    onSuccess: () => { toast.success('Retrying the failed bills'); void qc.invalidateQueries({ queryKey: qk.runs(slug) }); },
  });
}

export function useAccounts(filters: { property_id?: string; owing?: boolean }) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useKeysetList(
    qk.accountList(slug, filters),
    (cursor) => billingApi.accounts(slug, { ...filters, property_id: filters.property_id || undefined, cursor, limit: 50 }),
    { enabled: canAll('billing', 'billing.view') },
  );
}

export function useStatement(accountId: string) {
  const slug = useSlug();
  return useQuery({ queryKey: qk.statement(slug, accountId), queryFn: () => billingApi.statement(slug, accountId), enabled: !!accountId });
}

export function useStaffPay(accountId: string) {
  const slug = useSlug();
  return useMutation({ mutationFn: (body: PayRequest) => billingApi.staffPay(slug, accountId, body) });
}

export function useSuspense(days = 60) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useQuery({
    queryKey: [...qk.suspense(slug), days],
    queryFn: () => billingApi.suspense(slug, days).then((r) => r.data ?? []),
    enabled: canAll('billing', 'billing.collect'),
  });
}

export function useAssignSuspense() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transId, accountId }: { transId: string; accountId: string }) => billingApi.assignSuspense(slug, transId, accountId),
    onSuccess: () => {
      toast.success('Payment assigned to the account');
      void qc.invalidateQueries({ queryKey: qk.suspense(slug) });
      void qc.invalidateQueries({ queryKey: qk.accounts(slug) });
    },
  });
}

/** Owing accounts, largest first. Search and the minimum balance run on the server, so they reach
 *  accounts beyond the loaded page. */
export function useArrears(propertyId: string, filter: { q?: string; min?: string } = {}) {
  const slug = useSlug();
  const { canAll } = useAccess();
  const q = filter.q?.trim() || undefined;
  const min = filter.min || undefined;
  return useKeysetList(
    [...qk.arrears(slug, propertyId || undefined), q ?? '', min ?? ''],
    (cursor) => billingApi.arrears(slug, { property_id: propertyId || undefined, q, min, cursor, limit: 50 }),
    { enabled: canAll('billing', 'reports.view') },
  );
}
