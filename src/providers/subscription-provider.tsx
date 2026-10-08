'use client';

import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SubscriptionProvider } from '@bengo-hub/shared-ui-lib/subscription';
import { SUBSCRIPTIONS_UI_URL } from '@/lib/config';
import { qk } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth';

export interface SubscriptionInfo {
  status: string;
  planCode: string;
  planName: string;
  tierOrder?: number;
  features: string[];
  limits: Record<string, number>;
  currentPeriodEnd?: string;
  activeProducts: string[];
}

/** null means the lookup failed. Callers must treat that as "unknown", never as "no plan". */
async function fetchSubscription(tenantId: string): Promise<SubscriptionInfo | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`/api/subscription?tenantId=${encodeURIComponent(tenantId)}`, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return null;
    const sub = data.subscription ?? data;
    return {
      status: String(sub.status ?? 'none').toLowerCase(),
      planCode: sub.plan_code ?? sub.planCode ?? '',
      planName: sub.plan_name ?? sub.planName ?? '',
      tierOrder: sub.tier_order ?? sub.tierOrder,
      features: sub.features ?? [],
      limits: sub.limits ?? {},
      currentPeriodEnd: sub.current_period_end ?? sub.currentPeriodEnd,
      activeProducts: sub.active_products ?? sub.activeProducts ?? [],
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Subscription state for the shared gates. Fails open: a failed lookup keeps the last good answer
 * (TanStack keeps previous data) and otherwise marks the tenant exempt, so a subscriptions-api
 * restart never locks an active estate out. The API still enforces on every request.
 */
export function useSubscription() {
  const me = useAuthStore((s) => s.me);
  const tenantId = me?.tenant_id ?? '';
  const query = useQuery({
    queryKey: qk.subscription(tenantId),
    queryFn: async () => {
      const info = await fetchSubscription(tenantId);
      if (!info) throw new Error('subscription lookup failed');
      return info;
    },
    enabled: !!tenantId && !!me?.is_staff,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 15000,
  });
  return { info: query.data ?? null, isLoading: query.isLoading, failed: query.isError && !query.data };
}

export function MaskaniSubscriptionProvider({ children }: { children: ReactNode }) {
  const me = useAuthStore((s) => s.me);
  const { info, isLoading, failed } = useSubscription();
  const value = useMemo(
    () => ({
      features: info?.features ?? [],
      limits: info?.limits ?? {},
      // Unknown (failed or not yet loaded) and privileged callers are never gated in the UI.
      isExempt: !info || failed || !!me?.bypass || !!me?.is_platform_owner,
      status: info?.status ?? null,
      isLoading,
      planCode: info?.planCode ?? null,
      tierOrder: info?.tierOrder ?? null,
      activeServiceTags: info?.activeProducts,
      upgradeBaseUrl: SUBSCRIPTIONS_UI_URL,
    }),
    [info, failed, isLoading, me?.bypass, me?.is_platform_owner],
  );
  return <SubscriptionProvider value={value}>{children}</SubscriptionProvider>;
}
