import { apiClient } from './client';
import type { StatementFormat } from './billing';
import { tenantBase as t } from '@/lib/config';
import type { Notice, Page, PassInput, PayIntent, PayRequest, PortalUnit, SaleContract, Statement, VisitorPass, WorkOrder, WorkPriority } from './types';

const me = (slug: string) => `${t(slug)}/me`;

export const portalApi = {
  units: (slug: string) => apiClient.get<{ data: PortalUnit[] }>(`${me(slug)}/units`),
  statement: (slug: string, accountId: string) => apiClient.get<Statement>(`${me(slug)}/accounts/${accountId}/statement`),
  statementFile: (slug: string, accountId: string, format: StatementFormat) =>
    apiClient.getBlob(`${me(slug)}/accounts/${accountId}/statement/export`, `statement.${format}`, { format }),
  pay: (slug: string, accountId: string, body: PayRequest) => apiClient.post<PayIntent>(`${me(slug)}/accounts/${accountId}/pay`, body),
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
