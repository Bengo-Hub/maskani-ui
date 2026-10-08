'use client';

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Fades a block up as it scrolls into view. The server renders it visible; only a block that starts
 * below the fold is hidden after hydration, so nothing flickers and pages work without JavaScript.
 * `delay` staggers siblings; reduced motion is handled in the `reveal` utility.
 */
export function Reveal({ as: Tag = 'div', delay = 0, className, children }: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<'idle' | 'false' | 'true'>('idle');

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return; // already on screen
    setState('false');
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setState('true');
        io.disconnect();
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-shown={state === 'idle' ? undefined : state}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
      className={cn('reveal', className)}
    >
      {children}
    </Tag>
  );
}
