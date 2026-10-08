'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const LAST_SLUG_KEY = 'maskani-last-estate';

function toSlug(v: string): string {
  return v.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Opens an estate by its code (tenant slug) as staff or as an owner. */
export function EstateLauncher() {
  const router = useRouter();
  const [estate, setEstate] = useState('');

  useEffect(() => {
    try {
      const last = localStorage.getItem(LAST_SLUG_KEY);
      if (last) setEstate(last);
    } catch { /* storage blocked */ }
  }, []);

  const slug = toSlug(estate);
  const go = (path: string) => {
    if (!slug) return;
    try { localStorage.setItem(LAST_SLUG_KEY, slug); } catch { /* storage blocked */ }
    router.push(`/${slug}${path}`);
  };

  return (
    <div id="open" className="scroll-mt-24 rounded-3xl border border-border/70 bg-card p-6 shadow-lift sm:p-7">
      <h2 className="font-serif-soft text-2xl">Open your estate</h2>
      <p className="mt-1 text-sm text-muted-foreground">Use the estate code from your management office.</p>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          go('/portal');
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="estate">Estate code</Label>
          <Input
            id="estate"
            value={estate}
            onChange={(e) => setEstate(e.target.value)}
            placeholder="for example shaba-village"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-12 rounded-xl bg-background px-4 text-base"
          />
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Button type="submit" size="lg" className="h-12 rounded-full text-[0.95rem]" disabled={!slug}>
            <Smartphone /> I live or own here
          </Button>
          <Button type="button" size="lg" variant="outline" className="h-12 rounded-full text-[0.95rem]" disabled={!slug} onClick={() => go('/dashboard')}>
            <Building2 /> Estate staff <ArrowRight />
          </Button>
        </div>
      </form>
    </div>
  );
}
