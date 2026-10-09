'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { currentPeriod, periodLabel, shiftPeriod } from '@/lib/utils';
import { IconButton } from './icon-button';

/** Month stepper for YYYY-MM periods. Never goes past the current month. */
export function PeriodPicker({ value, onChange }: { value: string; onChange: (p: string) => void }) {
  const atCurrent = value >= currentPeriod();
  return (
    <div className="flex h-9 items-center rounded-lg border bg-background">
      <IconButton label="Previous month" onClick={() => onChange(shiftPeriod(value, -1))}>
        <ChevronLeft />
      </IconButton>
      <span className="min-w-32 px-1 text-center text-sm font-medium">{periodLabel(value)}</span>
      <IconButton label="Next month" disabled={atCurrent} onClick={() => onChange(shiftPeriod(value, 1))}>
        <ChevronRight />
      </IconButton>
    </div>
  );
}
