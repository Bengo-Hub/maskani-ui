'use client';

import { useQuery } from '@tanstack/react-query';
import { billingApi } from '@/lib/api/billing';
import { insightsApi } from '@/lib/api/insights';
import { reportsApi } from '@/lib/api/operations';
import { qk } from '@/lib/query-keys';
import { useAccess, useSlug } from './use-access';

export function useDashboard(propertyId: string, period: string) {
  const slug = useSlug();
  const { can } = useAccess();
  return useQuery({
    queryKey: qk.dashboardFor(slug, propertyId || undefined, period),
    queryFn: () => reportsApi.dashboard(slug, { property_id: propertyId || undefined, period }),
    enabled: can('reports.view'),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

/** Business insights for the staff dashboard. Lives under the dashboard key, so a payment or
 *  billing run (realtime) refreshes it with the tiles. */
export function useInsights(propertyId: string, period: string) {
  const slug = useSlug();
  const { can } = useAccess();
  return useQuery({
    queryKey: [...qk.dashboardFor(slug, propertyId || undefined, period), 'insights'],
    queryFn: () => insightsApi.get(slug, { property_id: propertyId || undefined, period }),
    enabled: can('reports.view'),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

/** Top owing accounts for the dashboard list (first page of the arrears report). */
export function useTopArrears(propertyId: string) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useQuery({
    queryKey: [...qk.arrears(slug, propertyId || undefined), 'top'],
    queryFn: () => billingApi.arrears(slug, { property_id: propertyId || undefined, limit: 6 }).then((r) => r.data ?? []),
    enabled: canAll('billing', 'reports.view'),
    staleTime: 60_000,
  });
}
