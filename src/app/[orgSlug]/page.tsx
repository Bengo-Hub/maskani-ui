'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, Smartphone } from 'lucide-react';
import { useTenantBranding } from '@bengo-hub/shared-ui-lib/tenant';
import { AuthShell } from '@/components/auth/auth-shell';
import { AppSplash } from '@/components/layout/app-splash';
import { useSlug } from '@/hooks/use-access';
import { estateName } from '@/lib/utils';
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

  const choices = [
    {
      href: `/${slug}/portal/sign-in`,
      icon: Smartphone,
      title: 'I live or own here',
      body: 'Sign in with the phone number the estate office has for you.',
    },
    {
      href: `/${slug}/login`,
      icon: Building2,
      title: 'Estate staff',
      body: 'Management, accounts, caretakers and security.',
    },
  ];

  return (
    <AuthShell
      logoUrl={tenant?.logoUrl}
      orgName={tenant?.orgName}
      title={estateName(tenant?.orgName) ?? 'Welcome'}
      subtitle="How would you like to sign in?"
      back={{ href: '/', label: 'Maskani' }}
    >
      <div className="space-y-3">
        {choices.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group flex items-center gap-4 rounded-3xl border border-border/70 bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <c.icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">{c.title}</span>
              <span className="block text-sm text-muted-foreground">{c.body}</span>
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ))}
      </div>
    </AuthShell>
  );
}
