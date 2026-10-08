'use client';

import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface AnchoredPortalProps {
  /** The trigger the panel hangs off (its bottom-left, or bottom-right when align="end"). */
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  /** Panel width in px, needed up front so the panel can be kept inside the viewport. */
  width: number;
  align?: 'start' | 'end';
  className?: string;
  children: ReactNode;
}

/**
 * Renders a dropdown panel on <body>, fixed under its trigger. Use it for any dropdown opened from
 * the app header or a sticky bar: an `absolute top-full` panel inside a header with overflow,
 * transform or backdrop-filter gets clipped at the header edge (treasury-ui and inventory-ui
 * regression, 2026-09-24). Copied from treasury-ui, the fleet's reference copy.
 */
export function AnchoredPortal({ anchorRef, open, onClose, width, align = 'start', className, children }: AnchoredPortalProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const place = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const raw = align === 'end' ? r.right - width : r.left;
    setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(raw, window.innerWidth - width - 8)) });
  }, [anchorRef, width, align]);

  // Measured before paint on every open, so a reopened panel never flashes at a stale spot.
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, place, onClose]);

  if (!open || !pos || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} aria-hidden />
      <div
        className={cn('fixed z-[91] flex flex-col rounded-xl border border-border bg-popover shadow-xl', className)}
        style={{ top: pos.top, left: pos.left, width, maxHeight: `calc(100vh - ${pos.top + 8}px)` }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
