'use client';

import { useSyncExternalStore } from 'react';

/** Subscribes to a CSS media query. Server render and first paint assume `fallback`. */
export function useMediaQuery(query: string, fallback = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

/** Tailwind `sm` and up. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 640px)', true);
}
