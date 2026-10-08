'use client';

import { useRef, useState } from 'react';
import { Building2, Check, ChevronDown } from 'lucide-react';
import { AnchoredPortal } from '@/components/common/anchored-portal';
import { useSlug } from '@/hooks/use-access';
import { useProperties } from '@/hooks/use-register';
import { cn } from '@/lib/utils';
import { usePropertyStore, useSelectedPropertyId } from '@/store/property';

/** Header property filter. Portalled through AnchoredPortal so the header never clips it. */
export function PropertySwitcher() {
  const slug = useSlug();
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const { data: properties = [] } = useProperties();
  const selected = useSelectedPropertyId(slug);
  const select = usePropertyStore((s) => s.select);
  const current = properties.find((p) => p.id === selected);

  if (properties.length === 0) return null;
  // One property: nothing to switch, just show its name.
  if (properties.length === 1) {
    return (
      <span className="hidden min-w-0 items-center gap-2 truncate text-sm font-medium sm:flex">
        <Building2 className="h-4 w-4 shrink-0 text-primary" /> {properties[0].name}
      </span>
    );
  }

  return (
    <>
      <button
        ref={anchor}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 min-w-0 max-w-[14rem] items-center gap-2 rounded-lg border bg-background px-3 text-sm hover:bg-muted"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Building2 className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate">{current?.name ?? 'All properties'}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      <AnchoredPortal anchorRef={anchor} open={open} onClose={() => setOpen(false)} width={260}>
        <ul role="listbox" className="max-h-80 overflow-y-auto p-1">
          {[{ id: '', name: 'All properties' }, ...properties].map((p) => (
            <li key={p.id || 'all'}>
              <button
                type="button"
                role="option"
                aria-selected={p.id === selected}
                onClick={() => { select(slug, p.id); setOpen(false); }}
                className={cn('flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted', p.id === selected && 'font-semibold text-primary')}
              >
                <span className="truncate">{p.name}</span>
                {p.id === selected && <Check className="h-4 w-4 shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      </AnchoredPortal>
    </>
  );
}
