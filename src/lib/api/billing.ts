import { apiClient } from './client';
import { tenantBase as t } from '@/lib/config';
import type {
  ArrearsRow, BillingPreview, BillingRun, BillingRunLine, ChargeRate, ChargeType, Fund, Page, PayIntent,
  PayRequest, Statement, SuspenseRow, UnitAccount,
} from './types';

export interface RunInput {
  property_id: string;
  fund?: string;
  period: string;
  invoice_date?: string;
  due_date?: string;
}

export interface ChargeTypeInput {
  code: string;
  name: string;
  basis: string;
  frequency?: string;
  fund_code?: string;
  bill_to?: string;
  vat_rate?: number;
}

export interface RateInput {
  scope: ChargeRate['scope'];
  property_id?: string;
  unit_type?: string;
  unit_id?: string;
  amount?: number;
  tariff?: { from: number; to?: number | null; rate: number }[];
  fixed_meter_charge?: number;
  effective_from: string;
  notes?: string;
}

export const billingApi = {
  funds: (slug: string) => apiClient.get<{ data: Fund[] }>(`${t(slug)}/funds`),
  updateFund: (slug: string, id: string, body: Partial<Fund>) => apiClient.patch<Fund>(`${t(slug)}/funds/${id}`, body),

  chargeTypes: (slug: string, all = true) => apiClient.get<{ data: ChargeType[] }>(`${t(slug)}/charge-types`, { all }),
  createChargeType: (slug: string, body: ChargeTypeInput) => apiClient.post<ChargeType>(`${t(slug)}/charge-types`, body),
  enableChargeType: (slug: string, code: string) => apiClient.post(`${t(slug)}/charge-types/enable`, { code }),
  updateChargeType: (slug: string, id: string, body: Partial<ChargeTypeInput> & { status?: string }) =>
    apiClient.patch<ChargeType>(`${t(slug)}/charge-types/${id}`, body),
  addRate: (slug: string, chargeTypeId: string, body: RateInput) =>
    apiClient.post<ChargeRate>(`${t(slug)}/charge-types/${chargeTypeId}/rates`, body),

  preview: (slug: string, body: RunInput) => apiClient.post<BillingPreview>(`${t(slug)}/billing-runs/preview`, body, { timeout: 60000 }),
  issue: (slug: string, body: RunInput) => apiClient.post<BillingRun>(`${t(slug)}/billing-runs`, body),
  retry: (slug: string, id: string) => apiClient.post<BillingRun>(`${t(slug)}/billing-runs/${id}/retry`, {}),
  runs: (slug: string, params: { property_id?: string; cursor?: string; limit?: number }) =>
    apiClient.get<Page<BillingRun>>(`${t(slug)}/billing-runs`, params),
  run: (slug: string, id: string) => apiClient.get<BillingRun>(`${t(slug)}/billing-runs/${id}`),
  runLines: (slug: string, id: string) => apiClient.get<{ data: BillingRunLine[] }>(`${t(slug)}/billing-runs/${id}/lines`),

  accounts: (slug: string, params: { property_id?: string; owing?: boolean; cursor?: string; limit?: number }) =>
    apiClient.get<Page<UnitAccount>>(`${t(slug)}/unit-accounts`, params),
  statement: (slug: string, id: string) => apiClient.get<Statement>(`${t(slug)}/unit-accounts/${id}/statement`),
  staffPay: (slug: string, id: string, body: PayRequest) => apiClient.post<PayIntent>(`${t(slug)}/unit-accounts/${id}/pay`, body),

  suspense: (slug: string, days = 60) => apiClient.get<{ data: SuspenseRow[] }>(`${t(slug)}/collections/suspense`, { days }),
  assignSuspense: (slug: string, transId: string, unitAccountId: string) =>
    apiClient.post(`${t(slug)}/collections/suspense/${encodeURIComponent(transId)}/assign`, { unit_account_id: unitAccountId }),
  arrears: (slug: string, params: { property_id?: string; cursor?: string; limit?: number }) =>
    apiClient.get<Page<ArrearsRow>>(`${t(slug)}/reports/arrears`, params),
};
