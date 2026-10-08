'use client';

import { useState } from 'react';
import { Check, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/common/search-input';
import { useParties } from '@/hooks/use-register';
import type { Party } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { PartyForm } from './party-form';

export function partyName(p?: Party | null): string {
  if (!p) return '';
  return p.display_name || p.company_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.phone || 'Unnamed';
}

/**
 * Find a person by name or phone (search runs on Enter) or add a new one inline. The single picker
 * for linking owners, reserving units and naming buyers.
 */
export function PartyPicker({ value, onChange }: { value: Party | null; onChange: (p: Party | null) => void }) {
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const results = useParties(q);

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput value={q} onSearch={setQ} placeholder="Name or phone, then Enter" className="sm:flex-1" />
        <Button type="button" variant="outline" onClick={() => setAdding(true)}><UserPlus /> New person</Button>
      </div>
      {q && (
        <ul className="max-h-56 divide-y overflow-y-auto rounded-lg border">
          {results.isLoading && <li className="px-3 py-2 text-sm text-muted-foreground">Searching...</li>}
          {!results.isLoading && results.rows.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Nobody found. Add them as a new person.</li>}
          {results.rows.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onChange(p)} className={cn('flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted', value?.id === p.id && 'bg-primary/5')}>
                <span className="min-w-0"><span className="block truncate font-medium">{partyName(p)}</span><span className="text-xs text-muted-foreground">{p.phone}</span></span>
                {value?.id === p.id && <Check className="h-4 w-4 text-primary" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {value && <p className="rounded-lg bg-muted px-3 py-2 text-sm">Selected: <strong>{partyName(value)}</strong> {value.phone}</p>}
      <PartyForm open={adding} onOpenChange={setAdding} onSaved={(p) => { onChange(p); setQ(p.phone ?? ''); }} />
    </div>
  );
}
