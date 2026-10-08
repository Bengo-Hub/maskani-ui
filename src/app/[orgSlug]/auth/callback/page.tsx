'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SSOCallbackError } from '@bengo-hub/shared-ui-lib/auth';
import { AppSplash } from '@/components/layout/app-splash';
import { useSlug } from '@/hooks/use-access';
import { useAuthStore } from '@/store/auth';

export default function SSOCallbackPage() {
  return (
    <Suspense fallback={<AppSplash label="Completing sign-in" />}>
      <SSOCallback />
    </Suspense>
  );
}

function SSOCallback() {
  const slug = useSlug();
  const router = useRouter();
  const params = useSearchParams();
  const completeSSO = useAuthStore((s) => s.completeSSO);
  const startSSO = useAuthStore((s) => s.startSSO);
  const ran = useRef(false);
  const [error, setError] = useState<{ error: string; description?: string } | null>(null);

  useEffect(() => {
    if (ran.current || !slug) return;
    ran.current = true;
    const silent = sessionStorage.getItem('sso_silent_probe') === '1';
    sessionStorage.removeItem('sso_silent_probe');
    const returnTo = sessionStorage.getItem('sso_return_to') || `/${slug}/dashboard`;
    sessionStorage.removeItem('sso_return_to');

    const err = params.get('error');
    const code = params.get('code');
    if (err || !code) {
      if (silent) {
        // A silent probe that finds no session is never retried this browser session.
        sessionStorage.setItem('sso_silent_done', '1');
        router.replace(`/${slug}`);
        return;
      }
      setError({ error: err ?? 'missing_code', description: params.get('error_description') ?? undefined });
      return;
    }

    completeSSO(slug, code, params.get('state'))
      .then((me) => {
        const target = !me.is_staff && me.is_portal_user ? `/${slug}/portal` : returnTo;
        router.replace(target.startsWith(`/${slug}`) ? target : `/${slug}/dashboard`);
      })
      .catch((e: Error) => setError({ error: 'exchange_failed', description: e.message }));
  }, [slug, params, completeSSO, router]);

  if (error) {
    return (
      <SSOCallbackError
        error={error.error}
        errorDescription={error.description}
        orgSlug={slug}
        onRetry={() => void startSSO(slug, `/${slug}/dashboard`)}
        onSwitchTenant={(other) => router.replace(`/${other}/login`)}
      />
    );
  }
  return <AppSplash label="Completing sign-in" />;
}
