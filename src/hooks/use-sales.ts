'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { salesApi } from '@/lib/api/operations';
import type { ContractInput } from '@/lib/api/types';
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
    },
  });
}
