import { apiClient } from './client';
import { tenantBase as t } from '@/lib/config';
import type { BankCsvLine } from '@/lib/bank-csv';
import type {
  Adjustment, AdjustmentInput, BankLineResult, BillQuery,
  ArrearsRow, BillingPreview, CallRow, CollectionLadder, CollectionNote, ManualPayment, ManualPaymentInput, BillingRun, BillingRunLine, BillingSchedule, BillingScheduleInput, ChargeRate, ChargeType, ExportFormat, Fund, Page, PayIntent,
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
  code?: string;
  name?: string;
  description?: string;
  charge_group?: string;
  basis?: string;
  frequency?: string;
  fund_code?: string;
  bill_to?: string;
  vat_rate?: number;
  tax_exempt?: boolean;
  tariff_kind?: 'flat' | 'block';
  proration?: string;
  allocation_priority?: number;
  active?: boolean;
}

/** A standard platform charge the estate has not added yet (GET /charge-types/catalogue). */
export interface CatalogueCharge {
  code: string;
  name: string;
  charge_group: string;
  basis: string;
  frequency: string;
  bill_to: string;
  fund_code: string;
}

export interface FundInput {
  name?: string;
  paybill_shortcode?: string;
  account_prefix?: string;
  cost_center_code?: string;
  paybill_account_format?: string;
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
  updateFund: (slug: string, id: string, body: FundInput) => apiClient.patch<Fund>(`${t(slug)}/funds/${id}`, body),

  chargeTypes: (slug: string, all = true) => apiClient.get<{ data: ChargeType[] }>(`${t(slug)}/charge-types`, { all }),
  createChargeType: (slug: string, body: ChargeTypeInput) => apiClient.post<ChargeType>(`${t(slug)}/charge-types`, body),
  enableChargeType: (slug: string, code: string) => apiClient.post(`${t(slug)}/charge-types/enable`, { code }),
  chargeCatalogue: (slug: string) => apiClient.get<{ data: CatalogueCharge[] }>(`${t(slug)}/charge-types/catalogue`),
  updateChargeType: (slug: string, id: string, body: ChargeTypeInput) =>
    apiClient.patch<ChargeType>(`${t(slug)}/charge-types/${id}`, body),
  addRate: (slug: string, chargeTypeId: string, body: RateInput) =>
    apiClient.post<ChargeRate>(`${t(slug)}/charge-types/${chargeTypeId}/rates`, body),

  preview: (slug: string, body: RunInput) => apiClient.post<BillingPreview>(`${t(slug)}/billing-runs/preview`, body, { timeout: 60000 }),
  issue: (slug: string, body: RunInput) => apiClient.post<BillingRun>(`${t(slug)}/billing-runs`, body),
  retry: (slug: string, id: string) => apiClient.post<BillingRun>(`${t(slug)}/billing-runs/${id}/retry`, {}),
  runs: (slug: string, params: { property_id?: string; cursor?: string; limit?: number }) =>
    apiClient.get<Page<BillingRun>>(`${t(slug)}/billing-runs`, params),
  run: (slug: string, id: string) => apiClient.get<BillingRun>(`${t(slug)}/billing-runs/${id}`),
  schedule: (slug: string, propertyId: string) => apiClient.get<BillingSchedule>(`${t(slug)}/billing-schedule`, { property_id: propertyId }),
  saveSchedule: (slug: string, body: BillingScheduleInput) => apiClient.put<BillingSchedule>(`${t(slug)}/billing-schedule`, body),
  /** Run the period now without the readings still missing. */
  approveSchedule: (slug: string, body: { property_id: string; period: string }) => apiClient.post<BillingRun>(`${t(slug)}/billing-schedule/approve`, body),
  runLines: (slug: string, id: string, params: { status?: string; cursor?: string; limit?: number }) =>
    apiClient.get<Page<BillingRunLine>>(`${t(slug)}/billing-runs/${id}/lines`, params, { suppressErrorToast: true }),

  accounts: (slug: string, params: { property_id?: string; owing?: boolean; cursor?: string; limit?: number }) =>
    apiClient.get<Page<UnitAccount>>(`${t(slug)}/unit-accounts`, params),
  statement: (slug: string, id: string) => apiClient.get<Statement>(`${t(slug)}/unit-accounts/${id}/statement`),
  /** Branded statement download with the full history (pdf, csv or xlsx). */
  statementFile: (slug: string, id: string, format: ExportFormat) =>
    apiClient.getBlob(`${t(slug)}/unit-accounts/${id}/statement/export`, `statement.${format}`, { format }),
  staffPay: (slug: string, id: string, body: PayRequest) => apiClient.post<PayIntent>(`${t(slug)}/unit-accounts/${id}/pay`, body),

  suspense: (slug: string, days = 60) => apiClient.get<{ data: SuspenseRow[] }>(`${t(slug)}/collections/suspense`, { days }),
  submitManual: (slug: string, accountId: string, body: ManualPaymentInput) => apiClient.post<ManualPayment>(`${t(slug)}/unit-accounts/${accountId}/manual-payments`, body),
  manualPayments: (slug: string, params: { status?: string; property_id?: string; account_id?: string; cursor?: string; limit?: number }) =>
    apiClient.get<Page<ManualPayment>>(`${t(slug)}/collections/manual-payments`, params),
  approveManual: (slug: string, id: string, note?: string) => apiClient.post<ManualPayment>(`${t(slug)}/manual-payments/${id}/approve`, { note }),
  rejectManual: (slug: string, id: string, reason: string) => apiClient.post<ManualPayment>(`${t(slug)}/manual-payments/${id}/reject`, { reason }),
  requestAdjustment: (slug: string, accountId: string, body: AdjustmentInput) => apiClient.post<Adjustment>(`${t(slug)}/unit-accounts/${accountId}/adjustments`, body),
  adjustments: (slug: string, params: { status?: string; property_id?: string; account_id?: string; cursor?: string; limit?: number }) =>
    apiClient.get<Page<Adjustment>>(`${t(slug)}/collections/adjustments`, params),
  approveAdjustment: (slug: string, id: string, note?: string) => apiClient.post<Adjustment>(`${t(slug)}/adjustments/${id}/approve`, { note }),
  rejectAdjustment: (slug: string, id: string, reason: string) => apiClient.post<Adjustment>(`${t(slug)}/adjustments/${id}/reject`, { reason }),
  billQueries: (slug: string, params: { status?: string; property_id?: string; cursor?: string; limit?: number }) =>
    apiClient.get<Page<BillQuery>>(`${t(slug)}/collections/bill-queries`, params),
  answerBillQuery: (slug: string, id: string, body: { status: 'in_review' | 'resolved' | 'rejected'; resolution?: string }) =>
    apiClient.post<BillQuery>(`${t(slug)}/bill-queries/${id}/answer`, body),
  importBankLines: (slug: string, body: { fund: string; property_id?: string; lines: BankCsvLine[] }) =>
    apiClient.post<{ data: BankLineResult[] }>(`${t(slug)}/collections/bank-lines`, body),
  callList: (slug: string, propertyId?: string) => apiClient.get<{ data: CallRow[] }>(`${t(slug)}/collections/call-list`, { property_id: propertyId }),
  ladder: (slug: string, accountId: string) => apiClient.get<CollectionLadder>(`${t(slug)}/unit-accounts/${accountId}/collections`),
  addCollectionNote: (slug: string, accountId: string, body: { outcome: CollectionNote['outcome']; promise_date?: string; note?: string }) =>
    apiClient.post<CollectionLadder>(`${t(slug)}/unit-accounts/${accountId}/collection-notes`, body),
  assignSuspense: (slug: string, transId: string, unitAccountId: string) =>
    apiClient.post(`${t(slug)}/collections/suspense/${encodeURIComponent(transId)}/assign`, { unit_account_id: unitAccountId }),
  /** q matches the account reference prefix or the owner's name; min is the smallest balance kept. */
  arrears: (slug: string, params: { property_id?: string; q?: string; min?: string; cursor?: string; limit?: number }) =>
    apiClient.get<Page<ArrearsRow>>(`${t(slug)}/reports/arrears`, params),
  /** Every matching owing account with the ageing chart, as a document. */
  arrearsFile: (slug: string, params: { property_id?: string; q?: string; min?: string }, format: ExportFormat) =>
    apiClient.getBlob(`${t(slug)}/reports/arrears/export`, `arrears.${format}`, { ...params, format }),
};
