'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Section<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** Short line under the label in the rail. */
  hint?: string;
  /** Small count shown after the label (open items, entries). */
  count?: number;
}

/**
 * Page sections for settings-style screens: a rail of sections on the left from md up, a
 * scrollable row of chips on phones. Pair with useUrlParam so the section is in the URL.
 */
export function SectionLayout<T extends string>({ sections, value, onChange, children, className }: {
  sections: Section<T>[];
  value: T;
  onChange: (v: T) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-5 md:grid-cols-[13.5rem_1fr]', className)}>
      <nav aria-label="Sections" className="md:sticky md:top-20 md:self-start">
        <ul className="scrollbar-hide -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0">
          {sections.map((s) => {
            const active = s.value === value;
            const Icon = s.icon;
            return (
              <li key={s.value} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onChange(s.value)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm transition-colors',
                    'border md:border-transparent',
                    active
                      ? 'border-primary/30 bg-primary/10 font-semibold text-primary md:border-transparent'
                      : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{s.label}</span>
                    {s.hint && <span className="hidden truncate text-xs font-normal text-muted-foreground md:block">{s.hint}</span>}
                  </span>
                  {s.count != null && s.count > 0 && (
                    <span className={cn('rounded-full px-2 text-xs tabular', active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground')}>
                      {s.count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
