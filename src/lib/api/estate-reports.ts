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

/** One report in the catalog. */
export interface CatalogReport {
  id: string;
  name: string;
  description: string;
  module: string;
  /** estate: a table on screen; arrears: the arrears list; file: download only. */
  source: 'estate' | 'arrears' | 'file';
  filters: ('range' | 'property' | 'period' | 'min_owing')[];
  formats: ExportFormat[];
  export_path: string;
  needs_property?: boolean;
}

export interface CatalogModule { module: string; display_name: string; reports: CatalogReport[] }

export interface ReportParams { from?: string; to?: string; period?: string; property_id?: string }

export const estateReportsApi = {
  /** Every report grouped by module, already narrowed to the tenant's modules and the caller's rights. */
  catalog: (slug: string) => apiClient.get<{ modules: CatalogModule[] }>(`${t(slug)}/reports/catalog`),
  report: (slug: string, kind: string, params: ReportParams) => apiClient.get<EstateReport>(`${t(slug)}/reports/estate/${kind}`, { ...params }),
  /** Downloads any catalog report through its own export path. */
  file: (slug: string, r: CatalogReport, params: ReportParams, format: ExportFormat) =>
    apiClient.getBlob(`${t(slug)}${r.export_path}`, `${r.id}.${format}`, { ...params, format }),
};
