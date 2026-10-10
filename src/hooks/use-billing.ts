'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { billingApi, type ChargeTypeInput, type FundInput, type RateInput, type RunInput } from '@/lib/api/billing';
import type { AdjustmentInput, BillingScheduleInput, CollectionNote, PayRequest } from '@/lib/api/types';
import type { BankCsvLine } from '@/lib/bank-csv';
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

/** A property's billing schedule and the stage of its next run. */
export function useBillingSchedule(propertyId: string) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useQuery({
    queryKey: qk.billingSchedule(slug, propertyId),
    queryFn: () => billingApi.schedule(slug, propertyId),
    enabled: !!propertyId && canAll('billing', 'billing.view'),
  });
}

export function useBillingScheduleMutations(propertyId: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return {
    save: useMutation({
      mutationFn: (body: Omit<BillingScheduleInput, 'property_id'>) => billingApi.saveSchedule(slug, { property_id: propertyId, ...body }),
      onSuccess: (v) => {
        qc.setQueryData(qk.billingSchedule(slug, propertyId), v);
        toast.success('Billing schedule saved');
      },
    }),
    approve: useMutation({
      mutationFn: (period: string) => billingApi.approveSchedule(slug, { property_id: propertyId, period }),
      onSuccess: () => {
        toast.success('Billing run started without the missing readings');
        void qc.invalidateQueries({ queryKey: qk.billingSchedule(slug, propertyId) });
        void qc.invalidateQueries({ queryKey: qk.runs(slug) });
      },
    }),
  };
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

/** A run's lines in unit code order, 100 at a time; `filter` is a line status ('' for all). The
 *  run's own status is in the key so lines refresh when issuing ends, and poll while it lasts. */
export function useRunLines(id: string, filter: string, runStatus?: string) {
  const slug = useSlug();
  return useKeysetList(
    [...qk.runLines(slug, id), filter, runStatus ?? ''],
    (cursor) => billingApi.runLines(slug, id, { status: filter || undefined, cursor, limit: 100 }),
    { enabled: !!id, refetchInterval: runStatus === 'issuing' ? 5000 : false },
  );
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

/** Accounts the collections ladder put on the call list that still owe. */
export function useCallList(propertyId: string) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useQuery({
    queryKey: qk.callList(slug, propertyId || undefined),
    queryFn: () => billingApi.callList(slug, propertyId || undefined).then((r) => r.data ?? []),
    enabled: canAll('billing', 'billing.collect'),
  });
}

/** An account's place on the collections ladder, with its notes. */
export function useLadder(accountId: string) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useQuery({
    queryKey: qk.ladder(slug, accountId),
    queryFn: () => billingApi.ladder(slug, accountId),
    enabled: !!accountId && canAll('billing', 'billing.view'),
  });
}

export function useAddCollectionNote(accountId: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { outcome: CollectionNote['outcome']; promise_date?: string; note?: string }) =>
      billingApi.addCollectionNote(slug, accountId, body),
    onSuccess: (l) => {
      toast.success('Call recorded');
      qc.setQueryData(qk.ladder(slug, accountId), l);
      void qc.invalidateQueries({ queryKey: [slug, 'call-list'] });
    },
  });
}

/** Manual payments by status (the review queue), within the selected property or all. */
export function useManualPayments(status: string, propertyId: string) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useKeysetList(
    qk.manualPayments(slug, `${status}:${propertyId || 'all'}`),
    (cursor) => billingApi.manualPayments(slug, { status: status || undefined, property_id: propertyId || undefined, cursor, limit: 24 }),
    { enabled: canAll('billing', 'billing.verify') || canAll('billing', 'billing.collect') },
  );
}

/** Credit notes and waivers by status, newest first (keyset). */
export function useAdjustments(status: string, propertyId: string) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useKeysetList(
    qk.adjustments(slug, `${status}:${propertyId || 'all'}`),
    (cursor) => billingApi.adjustments(slug, { status: status || undefined, property_id: propertyId || undefined, cursor, limit: 24 }),
    { enabled: canAll('billing', 'billing.adjust') || canAll('billing', 'billing.approve') },
  );
}

/** Asks to credit part of one bill; the statement and queue refresh. */
export function useRequestAdjustment(accountId: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdjustmentInput) => billingApi.requestAdjustment(slug, accountId, body),
    onSuccess: () => {
      toast.success('Sent for approval');
      void qc.invalidateQueries({ queryKey: [slug, 'adjustments'] });
    },
  });
}

export function useAdjustmentReview() {
  const slug = useSlug();
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: [slug, 'adjustments'] });
    void qc.invalidateQueries({ queryKey: qk.accounts(slug) });
    void qc.invalidateQueries({ queryKey: qk.dashboard(slug) });
  };
  return {
    approve: useMutation({
      mutationFn: (v: { id: string; note?: string }) => billingApi.approveAdjustment(slug, v.id, v.note),
      onSuccess: (a) => { toast.success(a.status === 'applied' ? 'Approved; the credit note is raised' : 'Approved; it needs another approver'); refresh(); },
    }),
    reject: useMutation({
      mutationFn: (v: { id: string; reason: string }) => billingApi.rejectAdjustment(slug, v.id, v.reason),
      onSuccess: () => { toast.success('Credit rejected'); refresh(); },
    }),
  };
}

/** Residents' bill queries by status, newest first (keyset). */
export function useBillQueries(status: string, propertyId: string) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useKeysetList(
    qk.billQueries(slug, `${status}:${propertyId || 'all'}`),
    (cursor) => billingApi.billQueries(slug, { status: status || undefined, property_id: propertyId || undefined, cursor, limit: 24 }),
    { enabled: canAll('billing', 'billing.view') },
  );
}

export function useAnswerBillQuery() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; status: 'in_review' | 'resolved' | 'rejected'; resolution?: string }) =>
      billingApi.answerBillQuery(slug, v.id, { status: v.status, resolution: v.resolution }),
    onSuccess: (q) => {
      toast.success(q.status === 'in_review' ? 'Query taken' : 'Answer sent to the resident');
      void qc.invalidateQueries({ queryKey: [slug, 'bill-queries'] });
    },
  });
}

/** Matches bank statement credits to accounts and queues them for review. */
export function useImportBankLines() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { fund: string; property_id?: string; lines: BankCsvLine[] }) => billingApi.importBankLines(slug, body).then((r) => r.data ?? []),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: [slug, 'manual-payments'] }); },
  });
}

export function useManualPaymentReview() {
  const slug = useSlug();
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: [slug, 'manual-payments'] });
    void qc.invalidateQueries({ queryKey: qk.accounts(slug) });
    void qc.invalidateQueries({ queryKey: qk.dashboard(slug) });
  };
  return {
    approve: useMutation({
      mutationFn: (v: { id: string; note?: string }) => billingApi.approveManual(slug, v.id, v.note),
      onSuccess: () => { toast.success('Payment verified and booked'); refresh(); },
    }),
    reject: useMutation({
      mutationFn: (v: { id: string; reason: string }) => billingApi.rejectManual(slug, v.id, v.reason),
      onSuccess: () => { toast.success('Payment rejected'); refresh(); },
    }),
  };
}
