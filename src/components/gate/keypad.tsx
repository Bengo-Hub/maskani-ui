'use client';

import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'];

/** Large keypad for gloved hands and bright sun: 64 px keys, high contrast, no hover reliance. */
export function Keypad({ value, onChange, length = 6, masked = false, disabled }: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  masked?: boolean;
  disabled?: boolean;
}) {
  const press = (k: string) => {
    if (disabled) return;
    if (k === 'clear') onChange('');
    else if (k === 'back') onChange(value.slice(0, -1));
    else if (value.length < length) onChange(value + k);
  };
  return (
    <div className="w-full max-w-xs space-y-4">
      <div className="flex justify-center gap-2" aria-live="polite">
        {Array.from({ length }).map((_, i) => (
          <div key={i} className={cn('flex h-14 w-11 items-center justify-center rounded-lg border-2 font-mono text-2xl font-semibold', i < value.length ? 'border-primary' : 'border-border')}>
            {value[i] ? (masked ? '•' : value[i]) : ''}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => press(k)}
            className={cn(
              'flex h-16 items-center justify-center rounded-xl border bg-card text-2xl font-semibold active:scale-95 active:bg-muted disabled:opacity-50',
              (k === 'clear' || k === 'back') && 'text-base text-muted-foreground',
            )}
            aria-label={k === 'back' ? 'Delete' : k === 'clear' ? 'Clear' : k}
          >
            {k === 'back' ? <Delete className="h-6 w-6" /> : k === 'clear' ? 'Clear' : k}
          </button>
        ))}
      </div>
    </div>
  );
}
