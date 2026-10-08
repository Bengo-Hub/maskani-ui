'use client';

import Image from 'next/image';
import { Tablet } from 'lucide-react';
import { AppSplash } from '@/components/layout/app-splash';
import { GateConsole } from '@/components/gate/gate-console';
import { GuardSignOn } from '@/components/gate/guard-sign-on';
import { useSlug } from '@/hooks/use-access';
import { useGate } from '@/hooks/use-gate';

/**
 * Gate tablet (kiosk). Authenticated by the device key a manager registered on this tablet, then
 * the guard's badge and PIN. No staff sign-in, no console chrome.
 */
export default function GatePage() {
  const slug = useSlug();
  const gate = useGate(slug);

  if (!gate.ready) return <AppSplash label="Opening the gate" />;

  if (!gate.device) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background p-6 text-center">
        <Image src="/brand/maskani-logo-stacked.svg" alt="Maskani" width={128} height={97} priority />
        <Tablet className="h-10 w-10 text-muted-foreground" />
        <h1 className="font-display text-xl font-semibold">This tablet is not set up for a gate</h1>
        <p className="max-w-md text-muted-foreground">
          A manager signs in on this tablet, opens Security, then Gate tablets, and taps &quot;Set up this device&quot;.
          The tablet then opens straight to the gate screen.
        </p>
      </main>
    );
  }

  if (!gate.guard) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background p-4">
        <GuardSignOn gateName={gate.device.gateName} badges={gate.badges} onSignOn={gate.signOn} />
      </main>
    );
  }

  return <GateConsole gate={gate} device={gate.device} />;
}
