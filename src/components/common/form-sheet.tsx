'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsDesktop } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

export type FormSheetSize = 'sm' | 'md' | 'lg' | 'xl';

// Pick the size from what the form holds and re-pick it whenever fields are added:
// sm = confirm or a field or two, md = a standard form, lg = two-column or multi-section, xl = tables.
const WIDTH: Record<FormSheetSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
};

/**
 * The one form container. Phones get a shadcn bottom sheet (thumb reach, scrolls inside, safe-area
 * padding); `sm` and up get a shadcn dialog whose width follows `size`.
 */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  footer,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  size?: FormSheetSize;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const desktop = useIsDesktop();
  const footerEl = footer ? (
    <div className="flex flex-col-reverse gap-2 border-t bg-muted/40 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-5 sm:pb-3">
      {footer}
    </div>
  ) : null;

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn('flex max-h-[88dvh] w-full flex-col gap-0 p-0', WIDTH[size])}>
          <DialogHeader className="border-b px-5 py-4 pr-12">
            <DialogTitle className="font-display text-base font-semibold">{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footerEl}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] gap-0 rounded-t-2xl p-0">
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted" aria-hidden />
        <SheetHeader className="border-b px-4 py-3 pr-12">
          <SheetTitle className="font-display text-base font-semibold">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footerEl}
      </SheetContent>
    </Sheet>
  );
}
