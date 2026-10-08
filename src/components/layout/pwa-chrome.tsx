'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { PwaInstallPrompt } from '@bengo-hub/shared-ui-lib/offline';
import { useTenantBranding } from '@bengo-hub/shared-ui-lib/tenant';

const MIN_VISIBLE_MS = 900;
const FADE_MS = 300;

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Brief branded overlay when launched from the home screen, so it opens like a native app. */
export function PwaLaunchSplash() {
  const [phase, setPhase] = useState<'hidden' | 'visible' | 'fading'>('hidden');
  useEffect(() => {
    if (!isStandalone()) return;
    setPhase('visible');
    const t1 = setTimeout(() => setPhase('fading'), MIN_VISIBLE_MS);
    const t2 = setTimeout(() => setPhase('hidden'), MIN_VISIBLE_MS + FADE_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  if (phase === 'hidden') return null;
  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-300 ${phase === 'fading' ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
      <Image src="/brand/maskani-logo-stacked.svg" alt="Maskani" width={168} height={128} priority />
    </div>
  );
}

/** Shared install prompt, named "{tenant first word} Maskani" so several installed apps stay distinct. */
export function MaskaniInstallPrompt() {
  const { tenant } = useTenantBranding();
  const first = tenant?.orgName?.trim().split(/\s+/)[0];
  const appName = first ? `${first} Maskani` : 'Maskani';
  return (
    <PwaInstallPrompt
      appName={appName}
      logoUrl={tenant?.logoUrl ?? '/icons/icon-192.png'}
      tagline="Bills, payments, visitors and requests on your phone."
      dismissKey="maskani_pwa_install_dismissed_until"
    />
  );
}
