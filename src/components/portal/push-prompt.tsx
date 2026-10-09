'use client';

import { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/common/icon-button';
import { enablePush, pushState } from '@/lib/push';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'maskani-push-prompt-dismissed';

/**
 * Offers alerts on this device. Residents: when a guard rings, the request pops up and opens the
 * answer page in one tap. Staff (caretakers and managers): a new resident request pops up and opens
 * the work order. Hidden once alerts are on, when the browser cannot do push, or after "Not now".
 */
export function PushPrompt({ slug, staff = false, className }: { slug: string; staff?: boolean; className?: string }) {
  const [state, setState] = useState<'on' | 'off' | 'blocked' | 'unsupported' | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === '1'; } catch { /* storage blocked */ }
    if (dismissed) return;
    void pushState(slug).then(setState);
  }, [slug]);

  if (state !== 'off' && state !== 'blocked') return null;

  const enable = async () => {
    setBusy(true);
    const ok = await enablePush(slug);
    setBusy(false);
    if (ok) {
      setState('on');
      toast.success('Gate alerts are on for this phone');
    } else {
      setState(Notification.permission === 'denied' ? 'blocked' : 'off');
      toast.error('Alerts could not be turned on. Check that notifications are allowed for this site.');
    }
  };
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* storage blocked */ }
    setState(null);
  };

  return (
    <section className={cn('glass flex items-start gap-4 rounded-2xl p-4 sm:items-center', className)}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><BellRing className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{staff ? 'Get request alerts on this device' : 'Get gate alerts on this phone'}</p>
        <p className="text-sm text-muted-foreground">
          {state === 'blocked'
            ? 'Notifications are blocked for this site. Allow them in the browser settings, then come back.'
            : staff ? 'New resident requests for your properties pop up here and open the work order in one tap.'
            : 'When a visitor arrives without a pass, the guard\'s request pops up here and you answer in one tap.'}
        </p>
      </div>
      {state === 'off' && <Button onClick={() => void enable()} disabled={busy} className="shrink-0">{busy ? 'Turning on...' : 'Turn on'}</Button>}
      <IconButton label="Not now" onClick={dismiss}><X /></IconButton>
    </section>
  );
}
