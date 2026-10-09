'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { gateApi } from '@/lib/api/operations';
import type { GateEventKind, Incident, PassInput } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';
import { useAccess, useSlug } from './use-access';
import { useKeysetList } from './use-keyset-list';

/** Gate lists need a property; with "All properties" selected they wait for a choice. */
export function usePasses(propertyId: string, active = true) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useKeysetList(
    [...qk.passes(slug), propertyId, active],
    (cursor) => gateApi.passes(slug, { property_id: propertyId, active: active || undefined, cursor, limit: 50 }),
    { enabled: !!propertyId && canAll('gate', 'gate.view') },
  );
}

export function usePass(id: string | null) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useQuery({
    queryKey: qk.pass(slug, id ?? ''),
    queryFn: () => gateApi.pass(slug, id!),
    enabled: !!id && canAll('gate', 'gate.view'),
  });
}

/** Cancels an active pass. A 409 means it was used, expired or cancelled meanwhile; the list refreshes either way. */
export function useCancelPass() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gateApi.cancelPass(slug, id),
    onSuccess: () => toast.success('Pass cancelled'),
    onSettled: () => void qc.invalidateQueries({ queryKey: qk.passes(slug) }),
  });
}

export function useGateEvents(propertyId: string, kind?: GateEventKind) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useKeysetList(
    [...qk.gateEvents(slug), propertyId, kind ?? 'all'],
    (cursor) => gateApi.events(slug, { property_id: propertyId, kind, cursor, limit: 50 }),
    { enabled: !!propertyId && canAll('gate', 'gate.view') },
  );
}

/** Who is inside now: entries and allowed walk-ins with no exit in the last 24 hours. */
export function useGateInside(propertyId: string) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useQuery({
    queryKey: qk.gateInside(slug, propertyId),
    queryFn: async () => (await gateApi.inside(slug, propertyId)).data ?? [],
    enabled: !!propertyId && canAll('gate', 'gate.view'),
    refetchInterval: 60_000,
  });
}

export function useGateDevices(propertyId: string) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useQuery({
    queryKey: qk.gateDevices(slug, propertyId),
    queryFn: async () => (await gateApi.devices(slug, propertyId)).data ?? [],
    enabled: !!propertyId && canAll('gate', 'gate.manage'),
  });
}

export function useRevokeDevice() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gateApi.revokeDevice(slug, id),
    onSuccess: () => { toast.success('Tablet revoked'); void qc.invalidateQueries({ queryKey: qk.gateDevices(slug) }); },
  });
}

export function useIncidents(propertyId: string, open?: boolean) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useKeysetList(
    [...qk.incidents(slug), propertyId, open ?? 'all'],
    (cursor) => gateApi.incidents(slug, { property_id: propertyId, open, cursor, limit: 50 }),
    { enabled: !!propertyId && canAll('gate', 'gate.view') },
  );
}

export function useIncident(id: string) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useQuery({
    queryKey: [...qk.incidents(slug), 'detail', id],
    queryFn: () => gateApi.incident(slug, id),
    enabled: !!id && canAll('gate', 'gate.view'),
  });
}

export function useCreatePass() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PassInput) => gateApi.createPass(slug, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.passes(slug) }),
  });
}

export function useCreateIncident() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Incident>) => gateApi.createIncident(slug, body),
    onSuccess: () => { toast.success('Incident recorded'); void qc.invalidateQueries({ queryKey: qk.incidents(slug) }); },
  });
}

export function useRegisterDevice() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { property_id: string; name: string; gate_name?: string }) => gateApi.registerDevice(slug, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.gateDevices(slug) }),
  });
}
