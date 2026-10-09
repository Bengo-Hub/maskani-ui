'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { WithTooltip } from './icon-button';

/**
 * Search box that runs on Enter (or the clear button), never on blur or every keystroke, so typed
 * input does not fire half-finished lookups (scan-vs-type rule).
 */
export function SearchInput({ value, onSearch, placeholder = 'Search', className }: {
  value: string;
  onSearch: (q: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <form
      role="search"
      className={cn('relative w-full sm:w-72', className)}
      onSubmit={(e) => { e.preventDefault(); onSearch(draft.trim()); }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} className="h-10 pl-9 pr-9" enterKeyHint="search" />
      {draft && (
        <WithTooltip label="Clear search">
          <button
            type="button"
            onClick={() => { setDraft(''); onSearch(''); }}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        </WithTooltip>
      )}
    </form>
  );
}
