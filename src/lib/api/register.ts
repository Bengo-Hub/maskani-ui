import { apiClient } from './client';
import { tenantBase as t } from '@/lib/config';
import type { Block, MaskaniMe, Page, Party, PartyRole, Property, PropertyRole, StaffAssignment, Unit, UnitParty } from './types';

export const meApi = {
  me: (slug: string) => apiClient.get<MaskaniMe>(`${t(slug)}/auth/me`),
};

export interface PropertyInput {
  code: string;
  name: string;
  property_type?: string;
  use_case?: string;
  description?: string;
  address?: string;
  area?: string;
  town?: string;
  county?: string;
  amenities?: string[];
}

export interface UnitInput {
  property_id: string;
  block_id?: string;
  code: string;
  unit_type?: string;
  use?: string;
  bedrooms?: number;
  bathrooms?: number;
  size_sqm?: number;
  floor?: number;
  parking_bays?: number;
  sale_status?: string;
  occupancy_status?: string;
  walking_order?: number;
}

export interface UnitFilters {
  property_id?: string;
  block_id?: string;
  sale_status?: string;
  occupancy_status?: string;
  q?: string;
}

export interface PartyInput {
  kind: 'person' | 'company';
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone?: string;
  alt_phone?: string;
  email?: string;
  id_type?: string;
  national_id?: string;
  kra_pin?: string;
  is_diaspora?: boolean;
  preferred_channel?: string;
  notes?: string;
}

export interface LinkPartyInput {
  party_id: string;
  role: PartyRole;
  ownership_share?: number;
  is_primary?: boolean;
  start_date?: string;
  bill_to?: string[];
}

export const registerApi = {
  properties: (slug: string) => apiClient.get<{ data: Property[] }>(`${t(slug)}/properties`),
  property: (slug: string, id: string) => apiClient.get<Property>(`${t(slug)}/properties/${id}`),
  createProperty: (slug: string, body: PropertyInput) => apiClient.post<Property>(`${t(slug)}/properties`, body),
  updateProperty: (slug: string, id: string, body: Partial<PropertyInput>) =>
    apiClient.patch<Property>(`${t(slug)}/properties/${id}`, body),
  createBlock: (slug: string, propertyId: string, body: { code: string; name?: string; phase?: string; floors?: number }) =>
    apiClient.post<Block>(`${t(slug)}/properties/${propertyId}/blocks`, body),
  propertyStaff: (slug: string, propertyId: string) =>
    apiClient.get<{ data: StaffAssignment[] }>(`${t(slug)}/properties/${propertyId}/staff`),
  /** `auth_user_id` is the auth-api user id (MaskaniUser.auth_service_user_id). */
  assignStaff: (slug: string, propertyId: string, body: { auth_user_id: string; property_role: PropertyRole; erp_employee_id?: string }) =>
    apiClient.post<StaffAssignment>(`${t(slug)}/properties/${propertyId}/staff`, body),
  removeStaff: (slug: string, assignmentId: string) => apiClient.delete(`${t(slug)}/staff-assignments/${assignmentId}`),

  units: (slug: string, filters: UnitFilters & { cursor?: string; limit?: number }) =>
    apiClient.get<Page<Unit>>(`${t(slug)}/units`, { ...filters }),
  unit: (slug: string, id: string) => apiClient.get<Unit>(`${t(slug)}/units/${id}`),
  createUnit: (slug: string, body: UnitInput) => apiClient.post<Unit>(`${t(slug)}/units`, body),
  updateUnit: (slug: string, id: string, body: Partial<UnitInput>) => apiClient.patch<Unit>(`${t(slug)}/units/${id}`, body),
  linkParty: (slug: string, unitId: string, body: LinkPartyInput) =>
    apiClient.post<UnitParty>(`${t(slug)}/units/${unitId}/parties`, body),
  endLink: (slug: string, linkId: string, body: { end_date: string }) =>
    apiClient.post(`${t(slug)}/unit-parties/${linkId}/end`, body),
  addVehicle: (slug: string, unitId: string, body: { plate: string; party_id?: string; make?: string; model?: string; colour?: string }) =>
    apiClient.post(`${t(slug)}/units/${unitId}/vehicles`, body),

  parties: (slug: string, params: { q?: string; cursor?: string; limit?: number }) =>
    apiClient.get<Page<Party>>(`${t(slug)}/parties`, params),
  party: (slug: string, id: string) => apiClient.get<Party>(`${t(slug)}/parties/${id}`),
  createParty: (slug: string, body: PartyInput) => apiClient.post<Party>(`${t(slug)}/parties`, body),
  updateParty: (slug: string, id: string, body: Partial<PartyInput>) => apiClient.patch<Party>(`${t(slug)}/parties/${id}`, body),
  invite: (slug: string, id: string) => apiClient.post(`${t(slug)}/parties/${id}/invite`, {}),
};
