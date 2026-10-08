'use client';

import { ExternalLink, Palette } from 'lucide-react';
import { useTenantBranding } from '@bengo-hub/shared-ui-lib/tenant';
import { buttonVariants } from '@/components/ui/button';
import { AUTH_UI_URL } from '@/lib/config';
import { cn, estateName } from '@/lib/utils';

function Swatch({ label, color }: { label: string; color?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-10 w-10 rounded-xl border shadow-inner" style={{ background: color || 'transparent' }} aria-hidden />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="font-mono text-xs uppercase text-muted-foreground">{color || 'Not set'}</p>
      </div>
    </div>
  );
}

/**
 * Branding is owned by Codevertex accounts (auth-api) and shared by every product, so Maskani shows
 * it and links to where it is changed rather than keeping its own copy.
 */
export function BrandingSettings() {
  const { tenant } = useTenantBranding();
  const name = estateName(tenant?.orgName) || tenant?.name || '';
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-5 flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Palette className="h-4 w-4" aria-hidden /></span>
          <div>
            <h2 className="text-base font-semibold">Your brand across Maskani</h2>
            <p className="text-sm text-muted-foreground">
              The logo and colours set in Codevertex accounts appear on the console, the owner portal, the gate tablet and
              documents. Change them there and every Codevertex product picks them up.
            </p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="grid h-24 w-40 place-items-center rounded-2xl border bg-background p-3">
            {tenant?.logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={tenant.logoUrl} alt={name || 'Logo'} className="max-h-full max-w-full object-contain" />
              : <span className="text-xs text-muted-foreground">No logo set</span>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Swatch label="Primary colour" color={tenant?.primaryColor} />
            <Swatch label="Secondary colour" color={tenant?.secondaryColor} />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-secondary/50 p-4">
          <span className="text-sm text-muted-foreground">Preview:</span>
          <span className={cn(buttonVariants(), 'pointer-events-none')}>Primary button</span>
          <span className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Selected menu item</span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Status badge</span>
        </div>
      </section>
      <a href={`${AUTH_UI_URL}/dashboard/my-tenant`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'outline' })}>
        Change branding in Codevertex accounts <ExternalLink />
      </a>
    </div>
  );
}
