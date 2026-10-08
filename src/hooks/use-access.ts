'use client';

import { useParams } from 'next/navigation';
import { useCallback } from 'react';
import { hasModule, hasPermission, useAuthStore } from '@/store/auth';

/** Tenant slug of the current route. */
export function useSlug(): string {
  const params = useParams<{ orgSlug: string }>();
  return params?.orgSlug ?? '';
}

/**
 * Module and permission checks from maskani /auth/me. Screens and queries gate on these so a
 * disabled module never fires a request that comes back 403.
 */
export function useAccess() {
  const me = useAuthStore((s) => s.me);
  const can = useCallback((perm: string) => hasPermission(me, perm), [me]);
  const mod = useCallback((m: string) => hasModule(me, m), [me]);
  const canAll = useCallback((m: string, perm: string) => hasModule(me, m) && hasPermission(me, perm), [me]);
  return { me, can, mod, canAll, ready: !!me };
}
