import { apiClient } from './client';
import { tenantBase as t } from '@/lib/config';
import type {
  ApprovalRequest, ApprovalRule, ApprovalRuleInput, AuditEntry, PrivacyKind, PrivacyRequest, PrivacyStatus,
  AvailabilityGroup, ContractInput, Dashboard, ErpEmployee, MaintenanceSchedule, MaintenanceScheduleInput,
  ServiceSchedule, ServiceScheduleInput, ServiceVisit, TreasurySupplier, VendorContract, VendorContractInput,
  VendorInvoice, VendorInvoiceCheck, VendorInvoiceInput, DashboardFilters, ExportFormat, GateDevice, GateDeviceView, GateEvent, GateEventKind, Incident,
  InsidePerson, MediaUpload, Meter, MeterReading,
  Handover, HandoverInput, Instalment, Notice, NoticeDelivery, Page, PassInput, PlanVersion, PriceItemInput, PriceList, ReadingRound, Reservation, RestructureInput, SaleContract,
  TitleStage, TitleStageInput,
  SalesPosition, Vendor, VendorDocument, VendorPersonnel, VisitorPass, WaterBalanceRow, WorkAction, WorkOrder,
  WorkPriority, CatalogEntry, StaffUser, Role, Permission, ModulesState,
} from './types';

export const utilitiesApi = {
  meters: (slug: string, propertyId: string) => apiClient.get<{ data: Meter[] }>(`${t(slug)}/meters`, { property_id: propertyId }),
  createMeter: (slug: string, body: Partial<Meter>) => apiClient.post<Meter>(`${t(slug)}/meters`, body),
  round: (slug: string, period: string, propertyId: string) =>
    apiClient.get<ReadingRound>(`${t(slug)}/reading-rounds/${period}`, { property_id: propertyId }),
  saveReading: (slug: string, meterId: string, body: { period: string; reading: number; photo_key?: string; read_at?: string; notes?: string }) =>
    apiClient.post<MeterReading>(`${t(slug)}/meters/${meterId}/readings`, body),
  estimate: (slug: string, meterId: string, period: string) =>
    apiClient.post<MeterReading>(`${t(slug)}/meters/${meterId}/estimate`, { period }),
  replaceMeter: (slug: string, meterId: string, body: { period: string; closing_reading: number; new_serial: string; new_make?: string; opening_reading: number; notes?: string }) =>
    apiClient.post<Meter>(`${t(slug)}/meters/${meterId}/replace`, body),
  verifyReading: (slug: string, readingId: string, action: 'accept' | 'reject' | 'recheck') =>
    apiClient.post<MeterReading>(`${t(slug)}/meter-readings/${readingId}/verify`, { action }),
  waterBalance: (slug: string, propertyId: string, period?: string) =>
    apiClient.get<{ data: WaterBalanceRow[] }>(`${t(slug)}/water-balance`, { property_id: propertyId, period }),
  waterBalanceFile: (slug: string, propertyId: string, period: string | undefined, format: ExportFormat) =>
    apiClient.getBlob(`${t(slug)}/water-balance/export`, `water-balance.${format}`, { property_id: propertyId, period, format }),
};

export const salesApi = {
  priceLists: (slug: string, propertyId: string) => apiClient.get<{ data: PriceList[] }>(`${t(slug)}/price-lists`, { property_id: propertyId }),
  createPriceList: (slug: string, body: { property_id: string; name: string; phase?: string; effective_from: string; activate?: boolean; items: PriceItemInput[] }) =>
    apiClient.post<PriceList>(`${t(slug)}/price-lists`, body),
  availability: (slug: string, propertyId: string, status?: string) =>
    apiClient.get<{ groups: AvailabilityGroup[] }>(`${t(slug)}/availability`, { property_id: propertyId, status }),
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
  releaseMilestone: (slug: string, instalmentId: string, evidenceKey?: string) =>
    apiClient.post<Instalment>(`${t(slug)}/instalments/${instalmentId}/release`, { evidence_key: evidenceKey ?? '' }),
  /** Every plan version, newest first. */
  plans: (slug: string, contractId: string) => apiClient.get<{ data: PlanVersion[] }>(`${t(slug)}/sale-contracts/${contractId}/schedules`),
  restructure: (slug: string, contractId: string, body: RestructureInput) =>
    apiClient.post<PlanVersion>(`${t(slug)}/sale-contracts/${contractId}/restructure`, body),
  sendPlanCode: (slug: string, planId: string) => apiClient.post<{ status: string }>(`${t(slug)}/schedules/${planId}/send-code`, {}),
  acceptPlanWithCode: (slug: string, planId: string, code: string) => apiClient.post<PlanVersion>(`${t(slug)}/schedules/${planId}/accept`, { code }),
  startHandover: (slug: string, contractId: string, scheduledAt?: string) =>
    apiClient.post<Handover>(`${t(slug)}/sale-contracts/${contractId}/handover`, { scheduled_at: scheduledAt || null }),
  updateHandover: (slug: string, id: string, body: HandoverInput) => apiClient.patch<Handover>(`${t(slug)}/handovers/${id}`, body),
  completeHandover: (slug: string, id: string, body: { handed_over_at?: string; readings: { meter_id: string; reading: number }[] }) =>
    apiClient.post<Handover>(`${t(slug)}/handovers/${id}/complete`, body),
  title: (slug: string, contractId: string) => apiClient.get<{ data: TitleStage[] }>(`${t(slug)}/sale-contracts/${contractId}/title`),
  setTitleStage: (slug: string, contractId: string, code: string, body: TitleStageInput) =>
    apiClient.put<{ data: TitleStage[] }>(`${t(slug)}/sale-contracts/${contractId}/title/${code}`, body),
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
  /** The name the ERP staff picker showed, kept on the work order. */
  erp_employee_name?: string;
  assigned_user_id?: string;
  quote_amount?: number;
  cost_amount?: number;
  recharge?: boolean;
  photos?: string[];
  minutes_on_site?: number;
  note?: string;
}

export const worksApi = {
  workOrders: (slug: string, params: { property_id?: string; status?: string; priority?: string; source?: string; overdue?: boolean; cursor?: string; limit?: number }) =>
    apiClient.get<Page<WorkOrder>>(`${t(slug)}/work-orders`, params),
  workOrder: (slug: string, id: string) => apiClient.get<WorkOrder>(`${t(slug)}/work-orders/${id}`),
  create: (slug: string, body: WorkOrderInput) => apiClient.post<WorkOrder>(`${t(slug)}/work-orders`, body),
  action: (slug: string, id: string, body: WorkActionInput) => apiClient.post<WorkOrder>(`${t(slug)}/work-orders/${id}/actions`, body),

  vendors: (slug: string, params: { cursor?: string; limit?: number; q?: string }) =>
    apiClient.get<Page<Vendor>>(`${t(slug)}/vendors`, params),
  vendor: (slug: string, id: string) => apiClient.get<Vendor>(`${t(slug)}/vendors/${id}`),
  treasurySuppliers: (slug: string, search: string) =>
    apiClient.get<{ data: TreasurySupplier[] }>(`${t(slug)}/vendors/treasury-lookup`, { search }),
  linkTreasury: (slug: string, vendorId: string, body: { treasury_vendor_id: string; name: string }) =>
    apiClient.put<Vendor>(`${t(slug)}/vendors/${vendorId}/treasury`, body),
  createContract: (slug: string, vendorId: string, body: VendorContractInput) =>
    apiClient.post<VendorContract>(`${t(slug)}/vendors/${vendorId}/contracts`, body),
  updateContract: (slug: string, id: string, body: VendorContractInput) =>
    apiClient.put<VendorContract>(`${t(slug)}/vendor-contracts/${id}`, body),
  terminateContract: (slug: string, id: string, reason: string) =>
    apiClient.post<VendorContract>(`${t(slug)}/vendor-contracts/${id}/terminate`, { reason }),
  visitPlans: (slug: string, contractId: string) =>
    apiClient.get<{ data: ServiceSchedule[] }>(`${t(slug)}/vendor-contracts/${contractId}/schedules`),
  createVisitPlan: (slug: string, contractId: string, body: ServiceScheduleInput) =>
    apiClient.post<ServiceSchedule>(`${t(slug)}/vendor-contracts/${contractId}/schedules`, body),
  updateVisitPlan: (slug: string, id: string, body: ServiceScheduleInput) =>
    apiClient.put<ServiceSchedule>(`${t(slug)}/service-schedules/${id}`, body),
  /** Visits by due date; from and to are YYYY-MM-DD, at most 62 days apart. */
  visits: (slug: string, params: { property_id: string; from: string; to: string; contract_id?: string; status?: string }) =>
    apiClient.get<{ data: ServiceVisit[] }>(`${t(slug)}/service-visits`, params),
  recordVisit: (slug: string, id: string, body: { status: 'completed' | 'partial'; photos?: string[]; checklist_result?: { item: string; done: boolean }[] }) =>
    apiClient.post<ServiceVisit>(`${t(slug)}/service-visits/${id}/record`, body),
  maintenancePlans: (slug: string, propertyId: string) =>
    apiClient.get<{ data: MaintenanceSchedule[] }>(`${t(slug)}/maintenance-schedules`, { property_id: propertyId }),
  createMaintenancePlan: (slug: string, body: MaintenanceScheduleInput) =>
    apiClient.post<MaintenanceSchedule>(`${t(slug)}/maintenance-schedules`, body),
  updateMaintenancePlan: (slug: string, id: string, body: MaintenanceScheduleInput) =>
    apiClient.put<MaintenanceSchedule>(`${t(slug)}/maintenance-schedules/${id}`, body),
  vendorInvoices: (slug: string, params: { vendor_id?: string; property_id?: string; status?: string }) =>
    apiClient.get<{ data: VendorInvoice[] }>(`${t(slug)}/vendor-invoices`, params),
  createVendorInvoice: (slug: string, body: VendorInvoiceInput) => apiClient.post<VendorInvoice>(`${t(slug)}/vendor-invoices`, body),
  checkVendorInvoice: (slug: string, id: string) => apiClient.get<VendorInvoiceCheck>(`${t(slug)}/vendor-invoices/${id}/check`),
  decideVendorInvoice: (slug: string, id: string, body: { decision: 'approve' | 'reject'; note?: string }) =>
    apiClient.post<VendorInvoice>(`${t(slug)}/vendor-invoices/${id}/decide`, body),
  cancelVendorInvoice: (slug: string, id: string, reason: string) =>
    apiClient.post<VendorInvoice>(`${t(slug)}/vendor-invoices/${id}/cancel`, { reason }),
  /** Active ERP staff for the pickers; 403 feature_not_available when the plan has no ERP. */
  erpEmployees: (slug: string, q: string) =>
    apiClient.get<{ data: ErpEmployee[] }>(`${t(slug)}/erp/employees`, { q }),
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
  pass: (slug: string, id: string) => apiClient.get<VisitorPass>(`${t(slug)}/visitor-passes/${id}`),
  /** 409 when the pass is no longer active (used, expired or already cancelled). */
  cancelPass: (slug: string, id: string) => apiClient.post<void>(`${t(slug)}/visitor-passes/${id}/cancel`),
  events: (slug: string, params: { property_id: string; kind?: GateEventKind; cursor?: string; limit?: number }) =>
    apiClient.get<Page<GateEvent>>(`${t(slug)}/gate/events`, params),
  inside: (slug: string, propertyId: string) =>
    apiClient.get<{ data: InsidePerson[] | null }>(`${t(slug)}/gate/inside`, { property_id: propertyId }),
  registerDevice: (slug: string, body: { property_id: string; name: string; gate_name?: string }) =>
    apiClient.post<{ device: GateDevice; device_key: string; tenant_slug: string }>(`${t(slug)}/gate/devices`, body),
  devices: (slug: string, propertyId: string) =>
    apiClient.get<{ data: GateDeviceView[] | null }>(`${t(slug)}/gate/devices`, { property_id: propertyId }),
  revokeDevice: (slug: string, id: string) => apiClient.post<void>(`${t(slug)}/gate/devices/${id}/revoke`),
  incidents: (slug: string, params: { property_id: string; open?: boolean; cursor?: string; limit?: number }) =>
    apiClient.get<Page<Incident>>(`${t(slug)}/incidents`, params),
  createIncident: (slug: string, body: Partial<Incident>) => apiClient.post<Incident>(`${t(slug)}/incidents`, body),
  incident: (slug: string, id: string) => apiClient.get<Incident>(`${t(slug)}/incidents/${id}`),
};

export interface NoticeInput {
  property_id?: string;
  /** roles: owner, occupant (default both); narrow with block_ids or unit_ids. */
  audience: { scope?: 'estate'; roles?: ('owner' | 'occupant')[]; block_ids?: string[]; unit_ids?: string[] };
  /** Active channels only: WhatsApp and email (SMS is not an active channel). */
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
  dashboard: (slug: string, params: { property_id?: string } & DashboardFilters) =>
    apiClient.get<Dashboard>(`${t(slug)}/reports/dashboard`, { ...params }, { suppressErrorToast: true }),
};

export interface TenantOption { id: string; slug: string; name: string }

export const settingsApi = {
  /** Tenants that use Maskani, for the platform owner's tenant switcher (403 for anyone else). */
  platformTenants: (slug: string) => apiClient.get<{ data: TenantOption[] }>(`${t(slug)}/platform/tenants`),
  settings: (slug: string) => apiClient.get<Record<string, unknown>>(`${t(slug)}/settings`),
  updateSettings: (slug: string, body: Record<string, unknown>) => apiClient.put(`${t(slug)}/settings`, body),
  auditLogs: (slug: string, params: { target_type?: string; from?: string; to?: string; cursor?: string; limit?: number }) =>
    apiClient.get<Page<AuditEntry>>(`${t(slug)}/audit-logs`, params),
  privacyRequests: (slug: string, params: { status?: PrivacyStatus; overdue?: boolean; cursor?: string; limit?: number }) =>
    apiClient.get<Page<PrivacyRequest>>(`${t(slug)}/privacy/requests`, { ...params, overdue: params.overdue ? 'true' : undefined }),
  createPrivacyRequest: (slug: string, body: { party_id: string; kind: PrivacyKind; notes?: string }) =>
    apiClient.post<PrivacyRequest>(`${t(slug)}/privacy/requests`, body),
  sendPrivacyCode: (slug: string, id: string) => apiClient.post(`${t(slug)}/privacy/requests/${id}/send-code`, {}),
  verifyPrivacyRequest: (slug: string, id: string, body: { code?: string; in_person?: boolean; note?: string }) =>
    apiClient.post<PrivacyRequest>(`${t(slug)}/privacy/requests/${id}/verify`, body),
  closePrivacyRequest: (slug: string, id: string, action: 'complete' | 'reject' | 'anonymise', text?: string) =>
    apiClient.post<PrivacyRequest>(`${t(slug)}/privacy/requests/${id}/${action}`, { text }),
  privacyExport: (slug: string, id: string) => apiClient.getBlob(`${t(slug)}/privacy/requests/${id}/export`, 'personal-data.zip'),
  approvalRules: (slug: string) => apiClient.get<{ data: ApprovalRule[] }>(`${t(slug)}/approvals/rules`),
  createApprovalRule: (slug: string, body: ApprovalRuleInput) => apiClient.post<ApprovalRule>(`${t(slug)}/approvals/rules`, body),
  updateApprovalRule: (slug: string, id: string, body: ApprovalRuleInput) => apiClient.put<ApprovalRule>(`${t(slug)}/approvals/rules/${id}`, body),
  deleteApprovalRule: (slug: string, id: string) => apiClient.delete<void>(`${t(slug)}/approvals/rules/${id}`),
  approvals: (slug: string, params: { status?: string; module?: string; property_id?: string; mine?: boolean; cursor?: string; limit?: number }) =>
    apiClient.get<Page<ApprovalRequest>>(`${t(slug)}/approvals`, { ...params, mine: params.mine ? 'true' : undefined }),
  decideApproval: (slug: string, id: string, decision: 'approve' | 'reject', comment?: string) =>
    apiClient.post<ApprovalRequest>(`${t(slug)}/approvals/${id}/${decision}`, { comment }),
  modules: (slug: string) => apiClient.get<ModulesState>(`${t(slug)}/settings/modules`),
  setModules: (slug: string, body: { modules: string[] } | { preset: string }) =>
    apiClient.put<ModulesState>(`${t(slug)}/settings/modules`, body),
  catalogue: (slug: string, kind: string) => apiClient.get<{ data: CatalogEntry[] }>(`${t(slug)}/catalogues/${kind}`),
  upsertCatalogue: (slug: string, kind: string, code: string, body: { name: string; active?: boolean; attrs?: Record<string, unknown> }) =>
    apiClient.put<{ data: CatalogEntry[] }>(`${t(slug)}/catalogues/${kind}/${encodeURIComponent(code)}`, body),
  users: (slug: string, kind?: string) => apiClient.get<{ data: StaffUser[] }>(`${t(slug)}/users`, { kind }),
  roles: (slug: string) => apiClient.get<{ data: Role[] }>(`${t(slug)}/roles`),
  permissions: (slug: string) => apiClient.get<{ data: Permission[] }>(`${t(slug)}/permissions`),
  setUserRoles: (slug: string, id: string, roles: string[]) => apiClient.put(`${t(slug)}/users/${id}/roles`, { roles }),
  setUserStatus: (slug: string, id: string, status: 'active' | 'suspended') => apiClient.put<StaffUser>(`${t(slug)}/users/${id}/status`, { status }),
  /** Adds the person in Codevertex accounts (S2S) and gives them Maskani roles; temp_password only for a new account. */
  inviteStaff: (slug: string, body: StaffInviteInput) =>
    apiClient.post<{ user: StaffUser; auth_user_id: string; new_account: boolean; temp_password?: string }>(`${t(slug)}/users/invite`, body),
  createRole: (slug: string, body: { code: string; name: string; description?: string; permissions: string[] }) => apiClient.post<Role>(`${t(slug)}/roles`, body),
  customizeRole: (slug: string, code: string) => apiClient.post<{ id: string }>(`${t(slug)}/roles/customize`, { code }),
  updateRole: (slug: string, id: string, body: { name?: string; description?: string; permissions?: string[] }) => apiClient.put(`${t(slug)}/roles/${id}`, body),
  deleteRole: (slug: string, id: string) => apiClient.delete(`${t(slug)}/roles/${id}`),
};

export interface StaffInviteInput {
  email: string;
  name?: string;
  phone?: string;
  roles: string[];
  property_ids?: string[];
}

export const mediaApi = {
  upload: (slug: string, file: Blob, kind: string, filename = 'photo.jpg') => {
    const form = new FormData();
    form.append('file', file, filename);
    form.append('kind', kind);
    return apiClient.upload<MediaUpload>(`${t(slug)}/media/upload`, form);
  },
  sign: (slug: string, keys: string[]) => apiClient.post<{ urls: Record<string, string> }>(`${t(slug)}/media/sign`, { keys }),
};
