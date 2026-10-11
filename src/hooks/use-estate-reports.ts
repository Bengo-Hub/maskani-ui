'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { estateReportsApi, type ReportParams } from '@/lib/api/estate-reports';
import { useAccess, useSlug } from './use-access';

/** The report catalog: every report the caller may run, grouped by module. */
export function useReportCatalog() {
  const slug = useSlug();
  const { can } = useAccess();
  return useQuery({
    queryKey: [slug, 'report-catalog'],
    queryFn: () => estateReportsApi.catalog(slug).then((r) => r.modules ?? []),
    enabled: can('reports.view'),
    staleTime: 10 * 60 * 1000,
  });
}

/** One estate report for a month range and property; kept on screen while the next one loads. */
export function useEstateReport(kind: string, params: ReportParams) {
  const slug = useSlug();
  const { can } = useAccess();
  return useQuery({
    queryKey: [slug, 'estate-report', kind, params.from ?? '', params.to ?? '', params.property_id ?? 'all'],
    queryFn: () => estateReportsApi.report(slug, kind, params),
    enabled: can('reports.view') && !!kind,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
