'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { worksApi, type WorkActionInput, type WorkOrderInput } from '@/lib/api/operations';
import type { Vendor, VendorDocument, VendorPersonnel } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';
import { useAccess, useSlug } from './use-access';
import { useKeysetList } from './use-keyset-list';

export interface WorkFilters { property_id?: string; status?: string; priority?: string; overdue?: boolean }

export function useWorkOrders(filters: WorkFilters) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useKeysetList(
    qk.workOrderList(slug, filters),
    (cursor) => worksApi.workOrders(slug, { ...filters, property_id: filters.property_id || undefined, status: filters.status || undefined, priority: filters.priority || undefined, overdue: filters.overdue || undefined, cursor, limit: 50 }),
    { enabled: canAll('maintenance', 'works.view') },
  );
}

export function useWorkOrder(id: string) {
  const slug = useSlug();
  return useQuery({ queryKey: qk.workOrder(slug, id), queryFn: () => worksApi.workOrder(slug, id), enabled: !!id });
}

export function useCreateWorkOrder() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: WorkOrderInput) => worksApi.create(slug, body),
    onSuccess: () => { toast.success('Work order created'); void qc.invalidateQueries({ queryKey: qk.workOrders(slug) }); },
  });
}

export function useWorkAction(id: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: WorkActionInput) => worksApi.action(slug, id, body),
    onSuccess: () => {
      toast.success('Work order updated');
      void qc.invalidateQueries({ queryKey: qk.workOrders(slug) });
      void qc.invalidateQueries({ queryKey: qk.dashboard(slug) });
    },
  });
}

export function useVendors(q = '') {
  const slug = useSlug();
  const { mod, can } = useAccess();
  return useKeysetList(
    [...qk.vendors(slug), q],
    (cursor) => worksApi.vendors(slug, { cursor, limit: 50, q: q || undefined }),
    { enabled: (mod('providers') || mod('maintenance')) && can('vendors.view') },
  );
}

export function useVendor(id: string) {
  const slug = useSlug();
  return useQuery({ queryKey: qk.vendor(slug, id), queryFn: () => worksApi.vendor(slug, id), enabled: !!id });
}

function useVendorMutation<T, R>(fn: (slug: string, v: T) => Promise<R>, message: string, vendorId?: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: T) => fn(slug, v),
    onSuccess: () => {
      toast.success(message);
      void qc.invalidateQueries({ queryKey: qk.vendors(slug) });
      if (vendorId) void qc.invalidateQueries({ queryKey: qk.vendor(slug, vendorId) });
    },
  });
}

export const useCreateVendor = () => useVendorMutation((s, v: Partial<Vendor>) => worksApi.createVendor(s, v), 'Vendor added');
export const useAddVendorDocument = (vendorId: string) =>
  useVendorMutation((s, v: Partial<VendorDocument>) => worksApi.addDocument(s, vendorId, v), 'Document added', vendorId);
export const useAddPersonnel = (vendorId: string) =>
  useVendorMutation((s, v: Partial<VendorPersonnel>) => worksApi.addPersonnel(s, vendorId, v), 'Person added', vendorId);
export const useSetGuardPin = (vendorId: string) =>
  useVendorMutation((s, v: { personnelId: string; pin: string }) => worksApi.setGuardPin(s, vendorId, v.personnelId, v.pin), 'PIN set', vendorId);
