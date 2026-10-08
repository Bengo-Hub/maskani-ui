import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { fraunces } from '@/lib/fonts';
import { cn, estateName } from '@/lib/utils';

/**
 * Layout for the sign-in screens: the form on the left, a photo of estate life on the right (a short
 * photo band on phones). The tenant's own logo and name sit at the top of the form column.
 */
export function AuthShell({ logoUrl, orgName, title, subtitle, back, children, footer }: {
  logoUrl?: string | null;
  orgName?: string | null;
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  children: ReactNode;
  footer?: ReactNode;
}) {
  const name = estateName(orgName);
  return (
    <div className={cn(fraunces.variable, 'flex min-h-dvh bg-paper')}>
      <div className="flex w-full flex-col lg:w-[46%] lg:min-w-[30rem]">
        {/* Phones: a short photo band above the form. */}
        <div className="relative h-40 overflow-hidden rounded-b-[2rem] lg:hidden">
          <Image src="/images/estate-palms.webp" alt="" fill priority sizes="100vw" className="object-cover" />
        </div>

        <div className="flex flex-1 flex-col px-5 pb-safe pt-6 sm:px-10 lg:px-14 lg:pt-10">
          <div className="flex items-center justify-between gap-4">
            {back ? (
              <Link href={back.href} className="inline-flex items-center gap-1.5 rounded-full py-1.5 pr-3 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <ArrowLeft className="h-4 w-4" aria-hidden /> {back.label}
              </Link>
            ) : <span />}
            <Image src="/brand/maskani-logo.svg" alt="Maskani" width={110} height={26} className="h-6 w-auto opacity-80" />
          </div>

          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 py-10 animate-rise">
            <div className="space-y-4">
              {logoUrl ? (
                // Tenant logos are hosted by auth-api on varied hosts, so a plain img keeps next/image config simple.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={name ?? 'Estate logo'} className="h-14 max-w-[60%] object-contain" />
              ) : null}
              <div className="space-y-2">
                <h1 className="font-serif-soft text-[2rem] leading-tight">{title}</h1>
                {subtitle ? <div className="text-[0.95rem] leading-relaxed text-muted-foreground">{subtitle}</div> : null}
              </div>
            </div>
            {children}
          </div>

          <div className="pb-6 text-center text-xs text-muted-foreground lg:text-left">{footer ?? 'Maskani by Codevertex'}</div>
        </div>
      </div>

      {/* Wide screens: the photo panel. */}
      <div className="relative hidden flex-1 p-4 lg:block">
        <div className="relative h-full overflow-hidden rounded-[2rem]">
          <Image src="/images/estate-palms.webp" alt="An apartment block in Nairobi seen through palm trees" fill priority sizes="54vw" className="object-cover" />
          <div className="absolute bottom-6 left-6 right-6 max-w-sm rounded-3xl bg-card/95 p-6 shadow-lift backdrop-blur-sm">
            <p className="font-serif-soft text-xl leading-snug">{name ? `Welcome to ${name}.` : 'Welcome home.'}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">Your statement, payments, visitor passes and requests, all in one place.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
