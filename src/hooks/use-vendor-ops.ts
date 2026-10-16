'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { worksApi } from '@/lib/api/operations';
import type { MaintenanceScheduleInput, ServiceScheduleInput, VendorContractInput } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';
import { useSlug } from './use-access';

// Vendor operations: service contracts, the visit plans under them, the visits those plans produce,
// preventive maintenance plans and the vendor's treasury supplier link. Errors are toasted by the
// query client's default mutation handler.

function useInvalidating<T, R>(fn: (slug: string, v: T) => Promise<R>, message: string, keys: (slug: string) => readonly (readonly unknown[])[]) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: T) => fn(slug, v),
    onSuccess: () => {
      toast.success(message);
      for (const k of keys(slug)) void qc.invalidateQueries({ queryKey: k });
    },
  });
}

export const useSaveContract = (vendorId: string) => useInvalidating(
  (s, v: { id?: string; body: VendorContractInput }) => (v.id ? worksApi.updateContract(s, v.id, v.body) : worksApi.createContract(s, vendorId, v.body)),
  'Contract saved', (s) => [qk.vendor(s, vendorId)],
);

export const useTerminateContract = (vendorId: string) => useInvalidating(
  (s, v: { id: string; reason: string }) => worksApi.terminateContract(s, v.id, v.reason),
  'Contract terminated', (s) => [qk.vendor(s, vendorId), qk.serviceVisits(s)],
);

export function useVisitPlans(contractId: string) {
  const slug = useSlug();
  return useQuery({ queryKey: qk.visitPlans(slug, contractId), queryFn: () => worksApi.visitPlans(slug, contractId), enabled: !!contractId });
}

export const useSaveVisitPlan = (contractId: string) => useInvalidating(
  (s, v: { id?: string; body: ServiceScheduleInput }) => (v.id ? worksApi.updateVisitPlan(s, v.id, v.body) : worksApi.createVisitPlan(s, contractId, v.body)),
  'Visit plan saved', (s) => [qk.visitPlans(s, contractId), qk.serviceVisits(s)],
);

export function useServiceVisits(params: { property_id: string; from: string; to: string; status?: string }) {
  const slug = useSlug();
  return useQuery({
    queryKey: [...qk.serviceVisits(slug), params],
    queryFn: () => worksApi.visits(slug, { ...params, status: params.status || undefined }),
    enabled: !!params.property_id && !!params.from && !!params.to,
  });
}

export const useRecordVisit = () => useInvalidating(
  (s, v: { id: string; status: 'completed' | 'partial'; photos?: string[]; checklist_result?: { item: string; done: boolean }[] }) =>
    worksApi.recordVisit(s, v.id, { status: v.status, photos: v.photos, checklist_result: v.checklist_result }),
  'Visit recorded', (s) => [qk.serviceVisits(s)],
);

export function useMaintenancePlans(propertyId: string) {
  const slug = useSlug();
  return useQuery({
    queryKey: [...qk.maintenancePlans(slug), propertyId],
    queryFn: () => worksApi.maintenancePlans(slug, propertyId),
    enabled: !!propertyId,
  });
}

export const useSaveMaintenancePlan = () => useInvalidating(
  (s, v: { id?: string; body: MaintenanceScheduleInput }) => (v.id ? worksApi.updateMaintenancePlan(s, v.id, v.body) : worksApi.createMaintenancePlan(s, v.body)),
  'Maintenance plan saved', (s) => [qk.maintenancePlans(s)],
);

export const useLinkTreasurySupplier = (vendorId: string) => useInvalidating(
  (s, v: { treasury_vendor_id: string; name: string }) => worksApi.linkTreasury(s, vendorId, v),
  'Linked to the treasury supplier', (s) => [qk.vendor(s, vendorId), qk.vendors(s)],
);
