'use client';

import { createContext, useContext, type ReactNode } from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';

/**
 * Modules the current page shows read only. A switched-off module keeps its data readable and
 * exportable (FR-09): the API still answers reads and marks them with X-Module-Read-Only, and
 * refuses changes. The console shell opens the page in this mode and `useAccess().canAll` lets its
 * queries run; buttons that change data stay visible but the API refuses them with a clear error.
 */
// A comma-joined string, not an array: a primitive keeps `canAll` stable between renders, so
// effects that depend on it never loop (React #185).
const ReadOnlyModules = createContext('');

/** The modules the current page shows read only, comma joined ('' outside such a page). */
export function useReadOnlyModules(): string {
  return useContext(ReadOnlyModules);
}

export function ModuleReadOnly({ modules, settingsHref, canManage, children }: {
  modules: readonly string[];
  settingsHref: string;
  canManage: boolean;
  children: ReactNode;
}) {
  return (
    <ReadOnlyModules.Provider value={modules.join(',')}>
      <div role="status" className="mx-auto mb-4 flex max-w-7xl flex-wrap items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
        <p className="min-w-0 flex-1">
          <span className="font-medium">Read only.</span>{' '}
          This module is switched off for your estate. Its records stay here to view and export, but nothing can be changed.
        </p>
        {canManage && (
          <Link href={settingsHref} className="shrink-0 font-medium text-primary hover:underline">Switch it back on</Link>
        )}
      </div>
      {children}
    </ReadOnlyModules.Provider>
  );
}
