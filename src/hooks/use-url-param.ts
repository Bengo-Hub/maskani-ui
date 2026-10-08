'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * One query-string value as page state (tabs, filters, the selected list), so a view can be linked,
 * reloaded and reached from the sidebar. `allowed` guards against a stale or hand-typed value.
 * Setting a value replaces the history entry and keeps every other parameter.
 */
export function useUrlParam<T extends string>(name: string, fallback: T, allowed?: readonly T[]): [T, (v: T | '', extra?: Record<string, string | null>) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = (params?.get(name) ?? '') as T;
  const value = raw && (!allowed || allowed.includes(raw)) ? raw : fallback;

  const set = useCallback((v: T | '', extra?: Record<string, string | null>) => {
    const next = new URLSearchParams(params?.toString() ?? '');
    if (v) next.set(name, v); else next.delete(name);
    for (const [k, val] of Object.entries(extra ?? {})) {
      if (val) next.set(k, val); else next.delete(k);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, name, router, pathname]);

  return [value, set];
}
