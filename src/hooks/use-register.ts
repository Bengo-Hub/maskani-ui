'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { registerApi, type LinkPartyInput, type PartyInput, type PropertyInput, type UnitFilters, type UnitInput } from '@/lib/api/register';
import type { PropertyRole } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';
import { useAccess, useSlug } from './use-access';
import { useKeysetList } from './use-keyset-list';

export function useProperties() {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useQuery({
    queryKey: qk.properties(slug),
    queryFn: () => registerApi.properties(slug).then((r) => r.data ?? []),
    enabled: canAll('properties', 'properties.view'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProperty(id: string) {
  const slug = useSlug();
  return useQuery({ queryKey: qk.property(slug, id), queryFn: () => registerApi.property(slug, id), enabled: !!id });
}

export function usePropertyStaff(id: string, enabled = true) {
  const slug = useSlug();
  return useQuery({
    queryKey: qk.propertyStaff(slug, id),
    queryFn: () => registerApi.propertyStaff(slug, id).then((r) => r.data ?? []),
    enabled: !!id && enabled,
  });
}

export function useAssignStaff(propertyId: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { auth_user_id: string; property_role: PropertyRole }) => registerApi.assignStaff(slug, propertyId, body),
    onSuccess: () => { toast.success('Staff assigned'); void qc.invalidateQueries({ queryKey: qk.propertyStaff(slug, propertyId) }); },
  });
}

export function useRemoveStaff(propertyId: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => registerApi.removeStaff(slug, assignmentId),
    onSuccess: () => { toast.success('Assignment removed'); void qc.invalidateQueries({ queryKey: qk.propertyStaff(slug, propertyId) }); },
  });
}

export function useSaveProperty(id?: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PropertyInput) => (id ? registerApi.updateProperty(slug, id, body) : registerApi.createProperty(slug, body)),
    onSuccess: () => {
      toast.success(id ? 'Property updated' : 'Property created');
      void qc.invalidateQueries({ queryKey: qk.properties(slug) });
    },
  });
}

/** Saves a property's or unit's photo gallery (keys in order, the first is the cover). */
export function useSavePhotos(target: 'property' | 'unit', id: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photos: string[]): Promise<void> => {
      if (target === 'property') await registerApi.updateProperty(slug, id, { photos });
      else await registerApi.updateUnit(slug, id, { photos });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: target === 'property' ? qk.property(slug, id) : qk.unit(slug, id) });
      void qc.invalidateQueries({ queryKey: target === 'property' ? qk.properties(slug) : qk.units(slug) });
    },
  });
}

export function useAddBlock(propertyId: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { code: string; name?: string; phase?: string; floors?: number }) => registerApi.createBlock(slug, propertyId, body),
    onSuccess: () => {
      toast.success('Block added');
      void qc.invalidateQueries({ queryKey: qk.property(slug, propertyId) });
    },
  });
}

export function useUnits(filters: UnitFilters) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useKeysetList(
    qk.unitList(slug, filters),
    (cursor) => registerApi.units(slug, { ...filters, cursor, limit: 50 }),
    { enabled: canAll('properties', 'units.view') },
  );
}

export function useUnit(id: string) {
  const slug = useSlug();
  return useQuery({ queryKey: qk.unit(slug, id), queryFn: () => registerApi.unit(slug, id), enabled: !!id });
}

export function useSaveUnit(id?: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UnitInput) => (id ? registerApi.updateUnit(slug, id, body) : registerApi.createUnit(slug, body)),
    onSuccess: () => {
      toast.success(id ? 'Unit updated' : 'Unit added');
      void qc.invalidateQueries({ queryKey: qk.units(slug) });
      void qc.invalidateQueries({ queryKey: qk.properties(slug) });
    },
  });
}

export function useParties(q: string) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useKeysetList(
    qk.partyList(slug, q),
    (cursor) => registerApi.parties(slug, { q: q || undefined, cursor, limit: 50 }),
    { enabled: canAll('properties', 'parties.view') },
  );
}

export function useParty(id: string) {
  const slug = useSlug();
  return useQuery({ queryKey: qk.party(slug, id), queryFn: () => registerApi.party(slug, id), enabled: !!id });
}

export function useSaveParty(id?: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PartyInput) => (id ? registerApi.updateParty(slug, id, body) : registerApi.createParty(slug, body)),
    onSuccess: () => {
      toast.success(id ? 'Details saved' : 'Person added');
      void qc.invalidateQueries({ queryKey: qk.parties(slug) });
    },
  });
}

export function useLinkParty(unitId: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LinkPartyInput) => registerApi.linkParty(slug, unitId, body),
    onSuccess: () => {
      toast.success('Linked to the unit');
      void qc.invalidateQueries({ queryKey: qk.unit(slug, unitId) });
      void qc.invalidateQueries({ queryKey: qk.parties(slug) });
    },
  });
}

export function useEndLink(unitId: string) {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ linkId, endDate }: { linkId: string; endDate: string }) => registerApi.endLink(slug, linkId, { end_date: endDate }),
    onSuccess: () => {
      toast.success('Link ended');
      void qc.invalidateQueries({ queryKey: qk.unit(slug, unitId) });
    },
  });
}

export function useInviteParty() {
  const slug = useSlug();
  return useMutation({
    mutationFn: (partyId: string) => registerApi.invite(slug, partyId),
    onSuccess: () => toast.success('Invitation sent by WhatsApp and email'),
  });
}
