'use client';

import { useParams } from 'next/navigation';
import { useCallback } from 'react';
import { useReadOnlyModules } from '@/components/layout/module-read-only';
import { hasModule, hasPermission, useAuthStore } from '@/store/auth';

/** Tenant slug of the current route. */
export function useSlug(): string {
  const params = useParams<{ orgSlug: string }>();
  return params?.orgSlug ?? '';
}

/**
 * Module and permission checks from maskani /auth/me. Screens and queries gate on these so a
 * disabled module never fires a request it does not need. Inside a page the shell opened read only
 * (module switched off, FR-09), `canAll` also passes for that module so the page can load its data.
 */
export function useAccess() {
  const me = useAuthStore((s) => s.me);
  const readOnly = useReadOnlyModules();
  const can = useCallback((perm: string) => hasPermission(me, perm), [me]);
  const mod = useCallback((m: string) => hasModule(me, m), [me]);
  const canAll = useCallback(
    (m: string, perm: string) => (hasModule(me, m) || (readOnly !== '' && readOnly.split(',').includes(m))) && hasPermission(me, perm),
    [me, readOnly],
  );
  return { me, can, mod, canAll, ready: !!me };
}
