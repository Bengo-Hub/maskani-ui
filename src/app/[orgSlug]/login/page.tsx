'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppSplash } from '@/components/layout/app-splash';
import { useSlug } from '@/hooks/use-access';
import { useAuthStore } from '@/store/auth';

/** Staff sign-in: straight to SSO with PKCE, returning to `?return_to=` (a same-app path). */
export default function StaffLoginPage() {
  return (
    <Suspense fallback={<AppSplash />}>
      <StaffLogin />
    </Suspense>
  );
}

function StaffLogin() {
  const slug = useSlug();
  const params = useSearchParams();
  const startSSO = useAuthStore((s) => s.startSSO);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !slug) return;
    started.current = true;
    const raw = params.get('return_to') ?? '';
    // Only same-app paths are honoured, never an absolute URL.
    const returnTo = raw.startsWith(`/${slug}/`) && !raw.startsWith('//') ? raw : `/${slug}/dashboard`;
    void startSSO(slug, returnTo);
  }, [slug, params, startSSO]);

  return <AppSplash label="Redirecting to sign-in" />;
}
