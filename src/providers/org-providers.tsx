'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { OfflineBar, StaleChunkRecovery } from '@bengo-hub/shared-ui-lib/offline';
import { TenantBrandingProvider } from '@bengo-hub/shared-ui-lib/tenant';
import { LimitReachedModal, type LimitReachedInfo } from '@bengo-hub/shared-ui-lib/subscription';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MaskaniInstallPrompt, PwaLaunchSplash } from '@/components/layout/pwa-chrome';
import { apiClient } from '@/lib/api/client';
import { apiErrorMessage } from '@/lib/api/errors';
import { SSO_URL, SUBSCRIPTIONS_UI_URL } from '@/lib/config';
import { kes } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { MaskaniSubscriptionProvider } from './subscription-provider';
import { useMaskaniStream } from '@/hooks/use-maskani-stream';
import { getPendingGateCount, flushGateQueue } from '@/lib/gate/queue';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        // Auth and entitlement answers never change on retry, and each retry would re-fire the
        // client's 401/403 handlers (stacked toasts). Transient failures get two retries.
        retry: (count, err: unknown) => {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status && status >= 400 && status < 500) return false;
          return count < 2;
        },
      },
      mutations: {
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    },
  });
}

/** Keeps the manifest link on the tenant manifest across client navigation. */
function ManifestSync({ slug }: { slug: string }) {
  useEffect(() => {
    const href = `/${slug}/manifest.webmanifest`;
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
  }, [slug]);
  return null;
}

/** Wires the API client's global handlers: toasts, plan-limit modal and sign-out on a refused token. */
function ClientCallbacks({ slug, onLimit }: { slug: string; onLimit: (info: LimitReachedInfo) => void }) {
  const router = useRouter();
  useEffect(() => {
    apiClient.setOnServerError((_status, message) => toast.error(message));
    apiClient.setOnSubscription403((data) => {
      const body = data as { error?: string };
      toast.warning(body?.error || 'Your plan does not include this feature.', {
        action: { label: 'See plans', onClick: () => window.open(SUBSCRIPTIONS_UI_URL, '_blank', 'noopener') },
      });
    });
    apiClient.setOnLimitReached((data) => {
      const d = (data ?? {}) as Partial<LimitReachedInfo> & { metric?: string };
      if (d.metric) onLimit({ metric: d.metric, limit: Number(d.limit) || 0, used: Number(d.used) || 0, ...d } as LimitReachedInfo);
      else toast.warning('Your plan limit has been reached.');
    });
    apiClient.setOn401(() => {
      const kind = useAuthStore.getState().session?.kind;
      useAuthStore.getState().clearLocal();
      toast.info('Your session ended. Please sign in again.');
      router.replace(kind === 'portal' ? `/${slug}/portal/sign-in` : `/${slug}/login`);
    });
    return () => {
      apiClient.setOnServerError(null);
      apiClient.setOnSubscription403(null);
      apiClient.setOnLimitReached(null);
      apiClient.setOn401(null);
    };
  }, [slug, router, onLimit]);
  return null;
}

function RealtimeBridge({ slug }: { slug: string }) {
  const status = useAuthStore((s) => s.status);
  useMaskaniStream(status === 'authenticated' ? slug : '');
  return null;
}

export function OrgProviders({ children }: { children: ReactNode }) {
  const params = useParams<{ orgSlug: string }>();
  const slug = params?.orgSlug ?? '';
  const [queryClient] = useState(makeQueryClient);
  const [limit, setLimit] = useState<LimitReachedInfo | null>(null);

  return (
    <QueryClientProvider client={queryClient}>
      <TenantBrandingProvider slug={slug} authApiBase={SSO_URL} defaultPrimaryColor="#6E1A5A" applyCssVariables={false}>
        <TooltipProvider>
          <MaskaniSubscriptionProvider>
            <StaleChunkRecovery />
            <ManifestSync slug={slug} />
            <ClientCallbacks slug={slug} onLimit={setLimit} />
            <RealtimeBridge slug={slug} />
            <PwaLaunchSplash />
            <MaskaniInstallPrompt />
            <div className="flex min-h-dvh flex-col">
              <OfflineBar
                registerSW
                getPendingCount={getPendingGateCount}
                onSyncNow={() => void flushGateQueue()}
                availableOffline={['Gate pass checks from the device cache', 'Queued gate entries']}
                disabledOffline={['Payments', 'Billing', 'Live reports']}
              />
              <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            </div>
            <LimitReachedModal
              open={!!limit}
              info={limit}
              onClose={() => setLimit(null)}
              subscribeUrl={SUBSCRIPTIONS_UI_URL}
              formatCurrency={(v) => kes(v)}
            />
          </MaskaniSubscriptionProvider>
        </TooltipProvider>
      </TenantBrandingProvider>
    </QueryClientProvider>
  );
}
