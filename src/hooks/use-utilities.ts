'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { utilitiesApi } from '@/lib/api/operations';
import { qk } from '@/lib/query-keys';
import { useAccess, useSlug } from './use-access';

export function useReadingRound(propertyId: string, period: string) {
  const slug = useSlug();
  const { mod, can } = useAccess();
  return useQuery({
    queryKey: qk.round(slug, propertyId, period),
    queryFn: () => utilitiesApi.round(slug, period, propertyId),
    enabled: !!propertyId && mod('utilities') && (can('utilities.read') || can('utilities.view')),
  });
}

export function useSaveReading(propertyId: string, period: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { meterId: string; reading: number; photoKey?: string; notes?: string }) =>
      utilitiesApi.saveReading(slug, v.meterId, { period, reading: v.reading, photo_key: v.photoKey, read_at: new Date().toISOString(), notes: v.notes }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.round(slug, propertyId, period) }),
  });
}

export function useVerifyReading(propertyId: string, period: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { readingId: string; action: 'accept' | 'reject' | 'recheck' }) => utilitiesApi.verifyReading(slug, v.readingId, v.action),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.round(slug, propertyId, period) }),
  });
}

export function useEstimateReading(propertyId: string, period: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (meterId: string) => utilitiesApi.estimate(slug, meterId, period),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.round(slug, propertyId, period) }),
  });
}

export function useWaterBalance(propertyId: string) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useQuery({
    queryKey: qk.waterBalance(slug, propertyId),
    queryFn: () => utilitiesApi.waterBalance(slug, propertyId).then((r) => r.data ?? []),
    enabled: !!propertyId && canAll('utilities', 'utilities.view'),
  });
}
