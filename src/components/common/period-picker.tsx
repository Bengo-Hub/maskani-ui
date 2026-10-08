'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { currentPeriod, periodLabel, shiftPeriod } from '@/lib/utils';

/** Month stepper for YYYY-MM periods. Never goes past the current month. */
export function PeriodPicker({ value, onChange }: { value: string; onChange: (p: string) => void }) {
  const atCurrent = value >= currentPeriod();
  return (
    <div className="flex h-9 items-center rounded-lg border bg-background">
      <Button variant="ghost" size="icon" onClick={() => onChange(shiftPeriod(value, -1))} aria-label="Previous month">
        <ChevronLeft />
      </Button>
      <span className="min-w-32 px-1 text-center text-sm font-medium">{periodLabel(value)}</span>
      <Button variant="ghost" size="icon" disabled={atCurrent} onClick={() => onChange(shiftPeriod(value, 1))} aria-label="Next month">
        <ChevronRight />
      </Button>
    </div>
  );
}
