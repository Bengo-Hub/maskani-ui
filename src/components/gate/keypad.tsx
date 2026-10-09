'use client';

import { useEffect, useRef } from 'react';
import { PinKeypad } from '@bengo-hub/shared-ui-lib/pin-login';
import { cn } from '@/lib/utils';

/**
 * The gate's digit entry: the platform's shared PIN keypad (same one as the POS PIN login) over a
 * row of digit slots, plus a hardware keyboard or USB keypad. Digits type, Backspace deletes,
 * Escape clears and Enter submits; typing inside a form field is left alone.
 */
export function Keypad({ value, onChange, onSubmit, length = 6, masked = false, disabled, busy, error, label }: {
  value: string;
  onChange: (v: string) => void;
  /** Enter on a hardware keyboard. Filling the last slot is the caller's own auto-submit. */
  onSubmit?: () => void;
  length?: number;
  masked?: boolean;
  disabled?: boolean;
  busy?: boolean;
  /** A rejected entry: the slots shake and turn red. */
  error?: boolean;
  label?: string;
}) {
  const ref = useRef({ value, onChange, onSubmit, length, disabled });
  ref.current = { value, onChange, onSubmit, length, disabled };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // An open sheet or dialog owns the keyboard.
      if (document.querySelector('[role="dialog"]')) return;
      const s = ref.current;
      if (s.disabled) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        if (s.value.length < s.length) s.onChange(s.value + e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        s.onChange(s.value.slice(0, -1));
      } else if (e.key === 'Escape') {
        s.onChange('');
      } else if (e.key === 'Enter' && s.onSubmit) {
        e.preventDefault();
        s.onSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex w-full max-w-xs flex-col gap-5 select-none">
      <div className={cn('flex justify-center gap-2', error && 'animate-shake')} aria-live="polite" aria-label={label}>
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length;
          return masked ? (
            <span
              key={i}
              className={cn(
                'h-4 w-4 rounded-full border-2 transition-all duration-200',
                error ? 'border-destructive bg-destructive' : filled ? 'scale-110 border-primary bg-primary shadow-[0_0_10px_2px_hsl(var(--primary)/0.35)]' : 'border-border',
              )}
            />
          ) : (
            <span
              key={i}
              className={cn(
                'flex h-14 w-11 items-center justify-center rounded-xl border-2 bg-card/70 font-mono text-2xl font-semibold tabular transition-colors',
                error ? 'border-destructive text-destructive' : filled ? 'border-primary' : i === value.length ? 'border-primary/40' : 'border-border',
              )}
            >
              {value[i] ?? ''}
            </span>
          );
        })}
      </div>
      <PinKeypad
        onDigit={(d) => { if (value.length < length) onChange(value + d); }}
        onBackspace={() => onChange(value.slice(0, -1))}
        onClear={() => onChange('')}
        disabled={!!disabled}
        isSubmitting={!!busy}
        digitsLength={value.length}
        pinLength={length}
        showToggle={false}
      />
    </div>
  );
}
