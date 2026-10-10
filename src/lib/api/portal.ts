import { apiClient } from './client';
import { tenantBase as t } from '@/lib/config';
import type { BillQuery, BillQueryInput, ExportFormat, ManualPayment, ManualPaymentInput, Notice, Page, PassInput, PayIntent, PayRequest, PortalUnit, SaleContract, Statement, VisitorPass, WorkOrder, WorkPriority } from './types';

const me = (slug: string) => `${t(slug)}/me`;

export const portalApi = {
  units: (slug: string) => apiClient.get<{ data: PortalUnit[] }>(`${me(slug)}/units`),
  statement: (slug: string, accountId: string) => apiClient.get<Statement>(`${me(slug)}/accounts/${accountId}/statement`),
  statementFile: (slug: string, accountId: string, format: ExportFormat) =>
    apiClient.getBlob(`${me(slug)}/accounts/${accountId}/statement/export`, `statement.${format}`, { format }),
  pay: (slug: string, accountId: string, body: PayRequest) => apiClient.post<PayIntent>(`${me(slug)}/accounts/${accountId}/pay`, body),
  /** A bank or cheque reference for an amount an M-Pesa prompt cannot take; staff verify it. */
  submitManual: (slug: string, accountId: string, body: ManualPaymentInput) => apiClient.post<ManualPayment>(`${me(slug)}/accounts/${accountId}/manual-payments`, body),
  raiseBillQuery: (slug: string, accountId: string, body: BillQueryInput) => apiClient.post<BillQuery>(`${me(slug)}/accounts/${accountId}/bill-queries`, body),
  billQueries: (slug: string, cursor?: string) => apiClient.get<Page<BillQuery>>(`${me(slug)}/bill-queries`, { cursor, limit: 20 }),
  purchase: (slug: string) => apiClient.get<{ data: SaleContract[] }>(`${me(slug)}/purchase`),
  passes: (slug: string) => apiClient.get<{ data: VisitorPass[] }>(`${me(slug)}/passes`),
  createPass: (slug: string, body: Omit<PassInput, 'property_id'> & { property_id?: string }) =>
    apiClient.post<VisitorPass>(`${me(slug)}/passes`, body),
  cancelPass: (slug: string, id: string) => apiClient.post(`${me(slug)}/passes/${id}/cancel`, {}),
  requests: (slug: string, cursor?: string) => apiClient.get<Page<WorkOrder>>(`${me(slug)}/requests`, { cursor }),
  createRequest: (slug: string, body: { unit_id: string; category?: string; priority: WorkPriority; title: string; description?: string; photos?: string[] }) =>
    apiClient.post<WorkOrder>(`${me(slug)}/requests`, body),
  requestAction: (slug: string, id: string, body: { action: 'confirm' | 'reopen'; note?: string }) =>
    apiClient.post<WorkOrder>(`${me(slug)}/requests/${id}/actions`, body),
  notices: (slug: string) => apiClient.get<{ data: Notice[] }>(`${me(slug)}/notices`),
  acceptTerms: (slug: string, version: string) => apiClient.post(`${me(slug)}/terms/accept`, { version }),
  decideWalkIn: (slug: string, id: string, approve: boolean) => apiClient.post(`${me(slug)}/walk-ins/${id}/decide`, { approve }),
};
