'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { estateReportsApi, type EstateReportParams } from '@/lib/api/estate-reports';
import { useAccess, useSlug } from './use-access';

/** One estate report for a month range and property; kept on screen while the next one loads. */
export function useEstateReport(kind: string, params: EstateReportParams) {
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
