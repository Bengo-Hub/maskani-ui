import { apiClient } from './client';
import { tenantBase as t } from '@/lib/config';
import type {
  AvailabilityUnit, ContractInput, Dashboard, GateDevice, GateEvent, Incident, MediaUpload, Meter, MeterReading,
  Notice, NoticeDelivery, Page, PassInput, PriceList, PriceListItem, ReadingRound, Reservation, SaleContract,
  SalesPosition, Vendor, VendorDocument, VendorPersonnel, VisitorPass, WaterBalanceRow, WorkAction, WorkOrder,
  WorkPriority, CatalogEntry, StaffUser, Role, ModulesState,
} from './types';

export const utilitiesApi = {
  meters: (slug: string, propertyId: string) => apiClient.get<{ data: Meter[] }>(`${t(slug)}/meters`, { property_id: propertyId }),
  createMeter: (slug: string, body: Partial<Meter>) => apiClient.post<Meter>(`${t(slug)}/meters`, body),
  round: (slug: string, period: string, propertyId: string) =>
    apiClient.get<ReadingRound>(`${t(slug)}/reading-rounds/${period}`, { property_id: propertyId }),
  saveReading: (slug: string, meterId: string, body: { period: string; reading: number; photo_key: string; read_at?: string; notes?: string }) =>
    apiClient.post<MeterReading>(`${t(slug)}/meters/${meterId}/readings`, body),
  estimate: (slug: string, meterId: string, period: string) =>
    apiClient.post<MeterReading>(`${t(slug)}/meters/${meterId}/estimate`, { period }),
  verifyReading: (slug: string, readingId: string, action: 'accept' | 'reject' | 'recheck') =>
    apiClient.post<MeterReading>(`${t(slug)}/meter-readings/${readingId}/verify`, { action }),
  waterBalance: (slug: string, propertyId: string, period?: string) =>
    apiClient.get<{ data: WaterBalanceRow[] }>(`${t(slug)}/water-balance`, { property_id: propertyId, period }),
};

export const salesApi = {
  priceLists: (slug: string, propertyId: string) => apiClient.get<{ data: PriceList[] }>(`${t(slug)}/price-lists`, { property_id: propertyId }),
  createPriceList: (slug: string, body: { property_id: string; name: string; phase?: string; effective_from: string; activate?: boolean; items: PriceListItem[] }) =>
    apiClient.post<PriceList>(`${t(slug)}/price-lists`, body),
  availability: (slug: string, propertyId: string) =>
    apiClient.get<{ data: AvailabilityUnit[] }>(`${t(slug)}/availability`, { property_id: propertyId }),
  reservations: (slug: string, params: { property_id?: string; status?: string; cursor?: string }) =>
    apiClient.get<Page<Reservation>>(`${t(slug)}/reservations`, params),
  reserve: (slug: string, body: { unit_id: string; party_id: string; days?: number }) =>
    apiClient.post<Reservation>(`${t(slug)}/reservations`, body),
  contracts: (slug: string, params: { property_id?: string; status?: string; cursor?: string; limit?: number }) =>
    apiClient.get<Page<SaleContract>>(`${t(slug)}/sale-contracts`, params),
  contract: (slug: string, id: string) => apiClient.get<SaleContract>(`${t(slug)}/sale-contracts/${id}`),
  createContract: (slug: string, body: ContractInput) => apiClient.post<SaleContract>(`${t(slug)}/sale-contracts`, body),
  activate: (slug: string, id: string, signedAt: string) =>
    apiClient.post<SaleContract>(`${t(slug)}/sale-contracts/${id}/activate`, { signed_at: signedAt }),
  position: (slug: string, propertyId?: string) =>
    apiClient.get<SalesPosition>(`${t(slug)}/reports/sales-position`, { property_id: propertyId }),
};

export interface WorkOrderInput {
  property_id: string;
  unit_id?: string;
  area?: string;
  category?: string;
  priority: WorkPriority;
  title: string;
  description?: string;
  photos?: string[];
}

export interface WorkActionInput {
  action: WorkAction;
  vendor_id?: string;
  erp_employee_id?: string;
  assigned_user_id?: string;
  quote_amount?: number;
  cost_amount?: number;
  recharge?: boolean;
  photos?: string[];
  minutes_on_site?: number;
  note?: string;
}

export const worksApi = {
  workOrders: (slug: string, params: { property_id?: string; status?: string; priority?: string; overdue?: boolean; cursor?: string; limit?: number }) =>
    apiClient.get<Page<WorkOrder>>(`${t(slug)}/work-orders`, params),
  workOrder: (slug: string, id: string) => apiClient.get<WorkOrder>(`${t(slug)}/work-orders/${id}`),
  create: (slug: string, body: WorkOrderInput) => apiClient.post<WorkOrder>(`${t(slug)}/work-orders`, body),
  action: (slug: string, id: string, body: WorkActionInput) => apiClient.post<WorkOrder>(`${t(slug)}/work-orders/${id}/actions`, body),

  vendors: (slug: string, params: { cursor?: string; limit?: number; q?: string }) =>
    apiClient.get<Page<Vendor>>(`${t(slug)}/vendors`, params),
  vendor: (slug: string, id: string) => apiClient.get<Vendor>(`${t(slug)}/vendors/${id}`),
  createVendor: (slug: string, body: Partial<Vendor>) => apiClient.post<Vendor>(`${t(slug)}/vendors`, body),
  addDocument: (slug: string, id: string, body: Partial<VendorDocument>) => apiClient.post<VendorDocument>(`${t(slug)}/vendors/${id}/documents`, body),
  addPersonnel: (slug: string, id: string, body: Partial<VendorPersonnel>) => apiClient.post<VendorPersonnel>(`${t(slug)}/vendors/${id}/personnel`, body),
  setGuardPin: (slug: string, vendorId: string, personnelId: string, pin: string) =>
    apiClient.put(`${t(slug)}/vendors/${vendorId}/personnel/${personnelId}/pin`, { pin }),
};

export const gateApi = {
  passes: (slug: string, params: { property_id: string; active?: boolean; cursor?: string; limit?: number }) =>
    apiClient.get<Page<VisitorPass>>(`${t(slug)}/visitor-passes`, params),
  createPass: (slug: string, body: PassInput) => apiClient.post<VisitorPass>(`${t(slug)}/visitor-passes`, body),
  events: (slug: string, params: { property_id: string; cursor?: string; limit?: number }) =>
    apiClient.get<Page<GateEvent>>(`${t(slug)}/gate/events`, params),
  registerDevice: (slug: string, body: { property_id: string; name: string; gate_name?: string }) =>
    apiClient.post<{ device: GateDevice; device_key: string; tenant_slug: string }>(`${t(slug)}/gate/devices`, body),
  incidents: (slug: string, params: { property_id: string; open?: boolean; cursor?: string; limit?: number }) =>
    apiClient.get<Page<Incident>>(`${t(slug)}/incidents`, params),
  createIncident: (slug: string, body: Partial<Incident>) => apiClient.post<Incident>(`${t(slug)}/incidents`, body),
  incident: (slug: string, id: string) => apiClient.get<Incident>(`${t(slug)}/incidents/${id}`),
};

export interface NoticeInput {
  property_id?: string;
  audience: { scope: 'estate' | 'block' | 'owners' | 'occupants'; block_id?: string };
  channels: string[];
  category?: string;
  priority: 'routine' | 'emergency';
  title: string;
  body: string;
  send_now?: boolean;
}

export const noticesApi = {
  list: (slug: string, params: { cursor?: string; limit?: number }) => apiClient.get<Page<Notice>>(`${t(slug)}/notices`, params),
  create: (slug: string, body: NoticeInput) => apiClient.post<Notice>(`${t(slug)}/notices`, body),
  send: (slug: string, id: string) => apiClient.post<Notice>(`${t(slug)}/notices/${id}/send`, {}),
  deliveries: (slug: string, id: string) => apiClient.get<{ data: NoticeDelivery[] }>(`${t(slug)}/notices/${id}/deliveries`),
};

export const reportsApi = {
  dashboard: (slug: string, params: { property_id?: string; period?: string }) =>
    apiClient.get<Dashboard>(`${t(slug)}/reports/dashboard`, params, { suppressErrorToast: true }),
};

export const settingsApi = {
  settings: (slug: string) => apiClient.get<Record<string, unknown>>(`${t(slug)}/settings`),
  updateSettings: (slug: string, body: Record<string, unknown>) => apiClient.put(`${t(slug)}/settings`, body),
  modules: (slug: string) => apiClient.get<ModulesState>(`${t(slug)}/settings/modules`),
  setModules: (slug: string, body: { modules: string[] } | { preset: string }) =>
    apiClient.put<ModulesState>(`${t(slug)}/settings/modules`, body),
  catalogue: (slug: string, kind: string) => apiClient.get<{ data: CatalogEntry[] }>(`${t(slug)}/catalogues/${kind}`),
  upsertCatalogue: (slug: string, kind: string, code: string, body: { name: string; active?: boolean; attrs?: Record<string, unknown> }) =>
    apiClient.put<{ data: CatalogEntry[] }>(`${t(slug)}/catalogues/${kind}/${encodeURIComponent(code)}`, body),
  users: (slug: string, kind?: string) => apiClient.get<{ data: StaffUser[] }>(`${t(slug)}/users`, { kind }),
  roles: (slug: string) => apiClient.get<{ data: Role[] }>(`${t(slug)}/roles`),
  setUserRoles: (slug: string, id: string, roles: string[]) => apiClient.put(`${t(slug)}/users/${id}/roles`, { roles }),
};

export const mediaApi = {
  upload: (slug: string, file: Blob, kind: string, filename = 'photo.jpg') => {
    const form = new FormData();
    form.append('file', file, filename);
    form.append('kind', kind);
    return apiClient.upload<MediaUpload>(`${t(slug)}/media/upload`, form);
  },
  sign: (slug: string, keys: string[]) => apiClient.post<{ urls: Record<string, string> }>(`${t(slug)}/media/sign`, { keys }),
};
