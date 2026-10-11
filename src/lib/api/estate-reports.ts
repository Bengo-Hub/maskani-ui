import { apiClient } from './client';
import { tenantBase as t } from '@/lib/config';
import type { ExportFormat } from './types';

/** How a report column is shown. */
export type ReportColumnKind = 'text' | 'money' | 'count' | 'pct' | 'hours' | 'qty';

export interface ReportColumn { key: string; label: string; kind: ReportColumnKind }

/** One estate report as the API builds it (GET /reports/estate/{kind}). */
export interface EstateReport {
  kind: string;
  title: string;
  subtitle: string;
  from: string;
  to: string;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  totals?: Record<string, string | number>;
  note?: string;
}

export interface EstateReportParams { from?: string; to?: string; property_id?: string }

export const estateReportsApi = {
  kinds: (slug: string) => apiClient.get<{ data: { kind: string; title: string }[] }>(`${t(slug)}/reports/estate`),
  report: (slug: string, kind: string, params: EstateReportParams) => apiClient.get<EstateReport>(`${t(slug)}/reports/estate/${kind}`, { ...params }),
  file: (slug: string, kind: string, params: EstateReportParams, format: ExportFormat) =>
    apiClient.getBlob(`${t(slug)}/reports/estate/${kind}/export`, `${kind}.${format}`, { ...params, format }),
};
