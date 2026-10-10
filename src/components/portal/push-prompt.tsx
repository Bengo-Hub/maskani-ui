'use client';

import { useEffect, useState } from 'react';
import { BellRing, Share, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/common/icon-button';
import { enablePush, pushState, refreshPush, type PushState } from '@/lib/push';
import { cn } from '@/lib/utils';

const SNOOZE_KEY = 'maskani-push-prompt-snoozed';
const SNOOZE_DAYS = 7;

function snoozed(): boolean {
  try {
    const at = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
    return at > 0 && Date.now() - at < SNOOZE_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/**
 * Offers alerts on this device. Residents: when a guard rings, the request pops up and opens the
 * answer page in one tap. Staff (caretakers and managers): a new resident request pops up and opens
 * the work order. On an iPhone not yet opened from the Home Screen it says how to add it, since
 * iOS only allows web push there. "Not now" hides it for a week. When alerts are already on, the
 * device's registration is quietly sent again so the server always has it for this account.
 */
export function PushPrompt({ slug, staff = false, className }: { slug: string; staff?: boolean; className?: string }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void pushState(slug).then((s) => {
      if (s === 'on') void refreshPush(slug);
      setState(snoozed() && s !== 'on' ? null : s);
    });
  }, [slug]);

  if (state !== 'off' && state !== 'blocked' && state !== 'install') return null;

  const enable = async () => {
    setBusy(true);
    const ok = await enablePush(slug);
    setBusy(false);
    if (ok) {
      setState('on');
      toast.success(staff ? 'Request alerts are on for this device' : 'Gate alerts are on for this phone');
    } else {
      setState(Notification.permission === 'denied' ? 'blocked' : 'off');
      toast.error('Alerts could not be turned on. Check that notifications are allowed for this site.');
    }
  };
  const dismiss = () => {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now())); } catch { /* storage blocked */ }
    setState(null);
  };

  const text = state === 'blocked'
    ? 'Notifications are blocked for this site. Allow them in the browser settings, then come back.'
    : state === 'install'
      ? 'On iPhone, alerts work once Maskani is on your Home Screen: tap Share, then "Add to Home Screen", open Maskani from there and turn alerts on.'
      : staff ? 'New resident requests for your properties pop up here and open the work order in one tap.'
        : 'When a visitor is at the gate, the guard\'s ring pops up here and you answer in one tap.';

  return (
    <section className={cn('glass flex items-start gap-4 rounded-2xl p-4 sm:items-center', className)}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        {state === 'install' ? <Share className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{staff ? 'Get request alerts on this device' : 'Get gate alerts on this phone'}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
      {state === 'off' && <Button onClick={() => void enable()} disabled={busy} className="shrink-0">{busy ? 'Turning on...' : 'Turn on'}</Button>}
      <IconButton label="Not now" onClick={dismiss}><X /></IconButton>
    </section>
  );
}
