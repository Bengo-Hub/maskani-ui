import { tenantBase as t } from '@/lib/config';
import { apiClient } from './client';
import type { DashboardFilters, ExportFormat, Money } from './types';

/** GET /reports/insights: trends, comparisons and forecasts for the staff dashboard. */

export interface MonthPoint {
  period: string;
  billed: Money;
  collected: Money;
  collection_rate?: Money;
  work_opened: number;
  work_closed: number;
  contracts_signed: number;
  sales_value: Money;
}

/** A figure for the chosen months, with the same number of months just before and the same months a year earlier. */
export interface Kpi {
  value: Money;
  previous?: Money;
  last_year?: Money;
}

export interface InsightKpis {
  collection_rate: Kpi;
  billed: Kpi;
  collected: Kpi;
  outstanding: Money;
  days_sales_outstanding?: Money;
  units: number;
  occupied: number;
  occupancy_pct?: Money;
  available_for_sale: number;
  open_work_orders: number;
  avg_resolve_hours_90d?: Money;
}

export interface ForecastRow {
  period: string;
  instalments: Money;
  recurring: Money;
  total: Money;
}

export interface Insights {
  from: string;
  to: string;
  period: string;
  months: MonthPoint[];
  kpis: InsightKpis;
  forecast: ForecastRow[];
  forecast_basis: { avg_monthly_billed_3m: Money; collection_rate_6m: Money; overdue_instalments: Money; method: string };
  sales: {
    signed_last_6m: number;
    monthly_rate: Money;
    available: number;
    months_to_sell_out?: Money;
    contract_value: Money;
    contract_collected: Money;
  };
  revenue_mix: { charge_code: string; amount: Money }[];
  blocks: { block_id: string; name: string; units: number; billed: Money; owing: Money }[];
  work_by_category: { category: string; opened: number; completed: number; breached: number; avg_resolve_hours?: Money }[];
}

/** GET /reports/role-summary: what each kind of staff acts on today. Open to all staff; the
 *  screen shows only the panels the caller's role and modules allow. */
export interface RoleSummary {
  period: string;
  readings: { meters: number; read: number; to_recheck: number; pending_review: number };
  works: { open: number; urgent_open: number; past_due: number; awaiting_confirmation: number };
  gate: { entries_today: number; walk_ins_pending: number; active_passes: number; open_incidents: number; tablets_offline: number };
  finance: { failed_bill_lines: number; accounts_owing: number; owing: Money };
  sales: { holds_expiring_3d: number; instalments_overdue: number; overdue_amount: Money; contracts_in_default: number };
}

/** The dashboard's filters, which insights follow. */
export type InsightsParams = { property_id?: string; from: string; to: string; block_id?: string; fund?: string };

export function insightsParams(propertyId: string, f: DashboardFilters): InsightsParams {
  return { property_id: propertyId || undefined, from: f.from, to: f.to, block_id: f.block_id || undefined, fund: f.fund || undefined };
}

export const insightsApi = {
  get: (slug: string, params: InsightsParams) =>
    apiClient.get<Insights>(`${t(slug)}/reports/insights`, params, { suppressErrorToast: true }),
  /** The performance report behind the dashboard, as a document. */
  file: (slug: string, params: InsightsParams, format: ExportFormat) =>
    apiClient.getBlob(`${t(slug)}/reports/insights/export`, `performance.${format}`, { ...params, format }),
  roleSummary: (slug: string, params: { property_id?: string }) =>
    apiClient.get<RoleSummary>(`${t(slug)}/reports/role-summary`, params, { suppressErrorToast: true }),
};
