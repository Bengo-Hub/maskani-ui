'use client';

import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Side = 'top' | 'bottom' | 'left' | 'right';

/**
 * Gives any icon-only control a tooltip with the same text as its accessible name. Use it for
 * custom buttons and links; plain icon buttons use `IconButton` below.
 */
export function WithTooltip({ label, side = 'top', children }: { label: string; side?: Side; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * The one icon-only button: `label` is both the aria-label and the tooltip, so a control that shows
 * only an icon always says what it does.
 */
export function IconButton({ label, side, size = 'icon', variant = 'ghost', children, ...props }:
  Omit<ComponentProps<typeof Button>, 'aria-label' | 'children'> & { label: string; side?: Side; children: ReactNode }) {
  return (
    <WithTooltip label={label} side={side}>
      <Button size={size} variant={variant} aria-label={label} {...props}>{children}</Button>
    </WithTooltip>
  );
}
