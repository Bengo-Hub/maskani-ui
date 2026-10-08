'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { MARKETPLACE_URL } from '@/lib/config';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '#features', label: 'What it does' },
  { href: '#how', label: 'How it works' },
  { href: '#people', label: 'Who uses it' },
];

/** Public top bar: transparent over the page, a soft white bar with a hairline once scrolled. */
export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 pt-safe transition-[background-color,border-color,backdrop-filter] duration-300',
        scrolled ? 'border-b border-border/70 bg-background/85 backdrop-blur-md' : 'border-b border-transparent',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6" aria-label="Main">
        <Link href="/" aria-label="Maskani home" className="shrink-0">
          <Image src="/brand/maskani-logo.svg" alt="Maskani by Codevertex" width={150} height={36} priority className="h-8 w-auto sm:h-9" />
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1 sm:gap-2">
          <a
            href={MARKETPLACE_URL}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary sm:px-3.5"
          >
            Marketplace <ArrowUpRight className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" aria-hidden />
          </a>
          <a href="#open" className={cn(buttonVariants({ size: 'lg' }), 'h-10 rounded-full px-4 sm:px-5')}>
            Sign in
          </a>
        </div>
      </nav>
    </header>
  );
}
