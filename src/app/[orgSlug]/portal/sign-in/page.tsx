'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useTenantBranding } from '@bengo-hub/shared-ui-lib/tenant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppSplash } from '@/components/layout/app-splash';
import { Field } from '@/components/common/field';
import { useSlug } from '@/hooks/use-access';
import { AuthHttpError, normalisePhone, requestPhoneCode, verifyPhoneCode } from '@/lib/auth/api';
import { useAuthStore } from '@/store/auth';

export default function PortalSignInPage() {
  return <Suspense fallback={<AppSplash />}><PortalSignIn /></Suspense>;
}

/** Messages never say whether a phone is registered (SRDD 16.2): the same answer either way. */
function codeError(err: unknown): string {
  if (err instanceof AuthHttpError) {
    if (err.code?.endsWith('_locked')) return 'Too many wrong codes. Request a new code.';
    if (err.status === 429) return 'Too many attempts. Wait a few minutes and try again.';
    if (err.code === 'invalid_phone') return 'Enter the phone number with its country code, for example 0712 345 678.';
    if (err.code === 'mfa_required') return err.message;
    if (err.status === 400 || err.status === 401 || err.status === 404) return 'That code is not right or has expired. Request a new one.';
  }
  return 'We could not reach the server. Check your connection and try again.';
}

function PortalSignIn() {
  const slug = useSlug();
  const router = useRouter();
  const params = useSearchParams();
  const { tenant } = useTenantBranding();
  const signIn = useAuthStore((s) => s.signIn);
  const restore = useAuthStore((s) => s.restore);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  // Deep links (walk-in approval, purchase plan) come back to their own path after sign-in.
  const raw = params.get('next') ?? '';
  const next = raw.startsWith(`/${slug}/portal`) && !raw.startsWith('//') ? raw : `/${slug}/portal`;

  useEffect(() => {
    void restore(slug).then((ok) => {
      if (ok && useAuthStore.getState().me?.is_portal_user) router.replace(next);
    });
  }, [slug, restore, router, next]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const send = async () => {
    setError('');
    setBusy(true);
    try {
      await requestPhoneCode(slug, normalisePhone(phone));
      setStep('code');
      setResendIn(45);
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (e) {
      setError(codeError(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    if (value.length < 6) return;
    setError('');
    setBusy(true);
    try {
      const pair = await verifyPhoneCode(slug, normalisePhone(phone), value);
      const me = await signIn(slug, pair, 'portal');
      if (!me.is_portal_user) {
        setError('This phone is not linked to a unit here. Ask the estate office to add it.');
        useAuthStore.getState().clearLocal();
        return;
      }
      router.replace(next);
    } catch (e) {
      setError(codeError(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col bg-background px-4 pb-safe pt-safe">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 py-10">
        <div className="flex flex-col items-center gap-3 text-center">
          {tenant?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logoUrl} alt={tenant.orgName} className="h-16 max-w-[70%] object-contain" />
          ) : (
            <Image src="/brand/maskani-logo-stacked.svg" alt="Maskani" width={128} height={97} priority />
          )}
          <h1 className="font-display text-xl font-semibold">{tenant?.orgName ? `${tenant.orgName} residents` : 'Residents sign in'}</h1>
          <p className="text-sm text-muted-foreground">
            {step === 'phone' ? 'Use the phone number the estate office has for you.' : `We sent a 6-digit code to ${normalisePhone(phone)} on WhatsApp.`}
          </p>
        </div>

        {step === 'phone' ? (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <Field label="Phone number" htmlFor="ph" error={error || undefined}>
              <Input id="ph" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" className="h-12 text-lg" autoFocus />
            </Field>
            <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={busy || phone.replace(/\D/g, '').length < 9}>
              <MessageCircle /> {busy ? 'Sending...' : 'Send me a code'}
            </Button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void verify(); }}>
            <Field label="Code" htmlFor="code" error={error || undefined}>
              <Input
                id="code"
                ref={codeRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(v);
                  if (v.length === 6) void verify(v);
                }}
                className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
              />
            </Field>
            <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={busy || code.length < 6}>{busy ? 'Checking...' : 'Sign in'}</Button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" className="inline-flex items-center gap-1 text-muted-foreground" onClick={() => { setStep('phone'); setCode(''); setError(''); }}>
                <ArrowLeft className="h-4 w-4" /> Change number
              </button>
              <button type="button" className="font-medium text-primary disabled:text-muted-foreground" disabled={resendIn > 0 || busy} onClick={() => void send()}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}
      </div>
      <p className="pb-4 text-center text-xs text-muted-foreground">Maskani by Codevertex</p>
    </main>
  );
}
