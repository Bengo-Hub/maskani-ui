'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { salesApi, utilitiesApi } from '@/lib/api/operations';
import type { ContractInput, HandoverInput, PriceItemInput, RestructureInput, TitleStageInput } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';
import { useAccess, useSlug } from './use-access';
import { useKeysetList } from './use-keyset-list';

/** The sales board, grouped by block and ordered by the API; `status` narrows it to one sale status. */
export function useAvailability(propertyId: string, status = '') {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useQuery({
    queryKey: [...qk.availability(slug, propertyId), status],
    queryFn: () => salesApi.availability(slug, propertyId, status || undefined).then((r) => r.groups ?? []),
    enabled: !!propertyId && canAll('sales', 'sales.view'),
    placeholderData: (prev) => prev,
  });
}

export function useSalesPosition(propertyId: string) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useQuery({
    queryKey: qk.salesPosition(slug, propertyId || undefined),
    queryFn: () => salesApi.position(slug, propertyId || undefined),
    enabled: canAll('sales', 'sales.view'),
  });
}

export function useContracts(filters: { property_id?: string; status?: string }) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useKeysetList(
    qk.contractList(slug, filters),
    (cursor) => salesApi.contracts(slug, { property_id: filters.property_id || undefined, status: filters.status || undefined, cursor, limit: 50 }),
    { enabled: canAll('sales', 'sales.view') },
  );
}

export function useContract(id: string) {
  const slug = useSlug();
  return useQuery({ queryKey: qk.contract(slug, id), queryFn: () => salesApi.contract(slug, id), enabled: !!id });
}

export function useCreateContract() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ContractInput) => salesApi.createContract(slug, body),
    onSuccess: () => {
      toast.success('Draft contract created');
      void qc.invalidateQueries({ queryKey: qk.contracts(slug) });
    },
  });
}

export function useActivateContract(id: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (signedAt: string) => salesApi.activate(slug, id, signedAt),
    onSuccess: () => {
      toast.success('Contract active. The payment schedule is in place.');
      void qc.invalidateQueries({ queryKey: qk.contracts(slug) });
    },
  });
}

export function useReserve(propertyId: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { unit_id: string; party_id: string; days?: number }) => salesApi.reserve(slug, body),
    onSuccess: () => {
      toast.success('Unit reserved');
      void qc.invalidateQueries({ queryKey: qk.availability(slug, propertyId) });
      void qc.invalidateQueries({ queryKey: qk.reservations(slug) });
    },
  });
}

/** After any change to one contract: its detail, plan versions, title and the lists. */
function useContractRefresh(id: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: qk.contract(slug, id) });
    void qc.invalidateQueries({ queryKey: qk.contracts(slug) });
  };
}

/** Releases a milestone instalment so it is billed now. */
export function useReleaseMilestone(contractId: string) {
  const slug = useSlug();
  const refresh = useContractRefresh(contractId);
  return useMutation({
    mutationFn: (instalmentId: string) => salesApi.releaseMilestone(slug, instalmentId),
    onSuccess: () => {
      toast.success('Milestone released. It is billed now.');
      refresh();
    },
  });
}

/** Every version of the contract's payment plan, newest first. */
export function useContractPlans(contractId: string) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useQuery({
    queryKey: qk.contractPlans(slug, contractId),
    queryFn: () => salesApi.plans(slug, contractId).then((r) => r.data ?? []),
    enabled: !!contractId && canAll('sales', 'sales.view'),
  });
}

/** Proposes a new plan for what is not yet billed; it goes to the approvals engine. */
export function useRestructure(contractId: string) {
  const slug = useSlug();
  const refresh = useContractRefresh(contractId);
  return useMutation({
    mutationFn: (body: RestructureInput) => salesApi.restructure(slug, contractId, body),
    onSuccess: (v) => {
      toast.success(v.approved_at ? 'New plan approved. It now waits for the buyer.' : 'New plan sent for approval.');
      refresh();
    },
  });
}

/** Office acceptance of an approved plan: send the buyer a code, then take it back. */
export function usePlanAcceptance(contractId: string) {
  const slug = useSlug();
  const refresh = useContractRefresh(contractId);
  const send = useMutation({
    mutationFn: (planId: string) => salesApi.sendPlanCode(slug, planId),
    onSuccess: () => toast.success('Code sent to the buyer by WhatsApp and email'),
  });
  const accept = useMutation({
    mutationFn: (v: { planId: string; code: string }) => salesApi.acceptPlanWithCode(slug, v.planId, v.code),
    onSuccess: () => {
      toast.success('The buyer accepted. The new plan is in force.');
      refresh();
    },
  });
  return { send, accept };
}

/** Handover of a fully paid unit: book it, record keys, checklist and snags, then complete it. */
export function useHandover(contractId: string) {
  const slug = useSlug();
  const refresh = useContractRefresh(contractId);
  const start = useMutation({
    mutationFn: (scheduledAt?: string) => salesApi.startHandover(slug, contractId, scheduledAt),
    onSuccess: () => {
      toast.success('Handover booked');
      refresh();
    },
  });
  const save = useMutation({
    mutationFn: (v: { id: string; body: HandoverInput }) => salesApi.updateHandover(slug, v.id, v.body),
    onSuccess: () => {
      toast.success('Handover saved');
      refresh();
    },
  });
  const complete = useMutation({
    mutationFn: (v: { id: string; handedOverAt?: string; readings: { meter_id: string; reading: number }[] }) =>
      salesApi.completeHandover(slug, v.id, { handed_over_at: v.handedOverAt, readings: v.readings }),
    onSuccess: () => {
      toast.success('Unit handed over. The buyer is now the owner and estate billing starts.');
      refresh();
    },
  });
  return { start, save, complete };
}

/** The estate's title stages with this sale's progress. */
export function useContractTitle(contractId: string, enabled = true) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useQuery({
    queryKey: qk.contractTitle(slug, contractId),
    queryFn: () => salesApi.title(slug, contractId).then((r) => r.data ?? []),
    enabled: enabled && !!contractId && canAll('sales', 'sales.view'),
  });
}

export function useSetTitleStage(contractId: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  const refresh = useContractRefresh(contractId);
  return useMutation({
    mutationFn: (v: { code: string; body: TitleStageInput }) => salesApi.setTitleStage(slug, contractId, v.code, v.body),
    onSuccess: (r) => {
      qc.setQueryData(qk.contractTitle(slug, contractId), r.data ?? []);
      toast.success('Title stage saved');
      refresh();
    },
  });
}

/** Meters on one unit, for the handover readings (the property list is capped on the API). */
export function useUnitMeters(propertyId: string, unitId: string, enabled: boolean) {
  const slug = useSlug();
  const { mod } = useAccess();
  return useQuery({
    queryKey: qk.meters(slug, propertyId),
    queryFn: () => utilitiesApi.meters(slug, propertyId).then((r) => r.data ?? []),
    enabled: enabled && !!propertyId && mod('utilities'),
    select: (rows) => rows.filter((m) => m.unit_id === unitId),
  });
}

/** Reservations, newest first, with unit code and buyer name. */
export function useReservations(filters: { property_id?: string; status?: string }) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useKeysetList(
    [...qk.reservations(slug), filters],
    (cursor) => salesApi.reservations(slug, { property_id: filters.property_id || undefined, status: filters.status || undefined, cursor }),
    { enabled: canAll('sales', 'sales.view') },
  );
}

/** The property's price lists, newest first, with their items. */
export function usePriceLists(propertyId: string) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useQuery({
    queryKey: qk.priceLists(slug, propertyId),
    queryFn: () => salesApi.priceLists(slug, propertyId).then((r) => r.data ?? []),
    enabled: !!propertyId && canAll('sales', 'sales.view'),
  });
}

/** A new price list; activating it retires the property's current one. */
export function useCreatePriceList(propertyId: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; phase?: string; effective_from: string; activate: boolean; items: PriceItemInput[] }) =>
      salesApi.createPriceList(slug, { ...body, property_id: propertyId }),
    onSuccess: (_, v) => {
      toast.success(v.activate ? 'Price list in force. The board shows the new prices.' : 'Price list saved as a draft');
      void qc.invalidateQueries({ queryKey: qk.priceLists(slug, propertyId) });
      void qc.invalidateQueries({ queryKey: qk.availability(slug, propertyId) });
    },
  });
}
