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
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Open your estate</h2>
      <p className="mt-1 text-sm text-muted-foreground">Enter the estate code your management gave you.</p>
      <form
        className="mt-5 space-y-4"
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
            placeholder="e.g. shaba-village"
            autoCapitalize="none"
            autoCorrect="off"
            className="h-11"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="submit" size="lg" className="h-11" disabled={!slug}>
            <Smartphone /> Owner or resident
          </Button>
          <Button type="button" size="lg" variant="outline" className="h-11" disabled={!slug} onClick={() => go('/dashboard')}>
            <Building2 /> Staff sign-in <ArrowRight />
          </Button>
        </div>
      </form>
    </div>
  );
}
