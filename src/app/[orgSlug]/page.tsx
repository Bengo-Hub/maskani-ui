'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Smartphone } from 'lucide-react';
import { useTenantBranding } from '@bengo-hub/shared-ui-lib/tenant';
import { AppSplash } from '@/components/layout/app-splash';
import { buttonVariants } from '@/components/ui/button';
import { useSlug } from '@/hooks/use-access';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

/** Tenant home (also the installed app's start URL): send a signed-in user on, else ask who they are. */
export default function TenantHome() {
  const slug = useSlug();
  const router = useRouter();
  const restore = useAuthStore((s) => s.restore);
  const { tenant } = useTenantBranding();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    void restore(slug).then((ok) => {
      if (!alive) return;
      if (ok) {
        const { session, me } = useAuthStore.getState();
        const portal = session?.kind === 'portal' || (me?.is_portal_user && !me?.is_staff);
        router.replace(`/${slug}/${portal ? 'portal' : 'dashboard'}`);
      } else {
        setChecked(true);
      }
    });
    return () => { alive = false; };
  }, [slug, restore, router]);

  if (!checked) return <AppSplash />;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="flex flex-col items-center gap-3">
          {tenant?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logoUrl} alt={tenant.orgName} className="h-16 max-w-[70%] object-contain" />
          ) : (
            <Image src="/brand/maskani-logo-stacked.svg" alt="Maskani" width={140} height={106} priority />
          )}
          <h1 className="font-display text-xl font-semibold">{tenant?.orgName ?? 'Welcome'}</h1>
          <p className="text-sm text-muted-foreground">How would you like to sign in?</p>
        </div>
        <div className="space-y-3">
          <Link href={`/${slug}/portal/sign-in`} className={cn(buttonVariants({ size: 'lg' }), 'h-12 w-full text-base')}>
            <Smartphone /> Owner or resident
          </Link>
          <Link href={`/${slug}/login`} className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'h-12 w-full text-base')}>
            <Building2 /> Estate staff
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">Owners sign in with the phone number the estate has on file.</p>
      </div>
    </main>
  );
}
