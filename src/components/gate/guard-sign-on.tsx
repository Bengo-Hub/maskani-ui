'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, ShieldCheck, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconButton } from '@/components/common/icon-button';
import { errorStatus, isNetworkError } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import { Keypad } from './keypad';

interface Badge { id: string; badge_number: string; name: string; role?: string; has_pin: boolean }

const PIN_LENGTH = 6;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/**
 * A guard starts a shift, the way staff sign in on the POS: tap your name, then the PIN the
 * manager set. A hardware keyboard works throughout (digits, Backspace, Escape, Enter).
 */
export function GuardSignOn({ gateName, badges, online, onSignOn }: {
  gateName: string;
  badges: Badge[];
  online: boolean;
  onSignOn: (badge: string, pin: string) => Promise<unknown>;
}) {
  const withPin = badges.filter((b) => b.has_pin);
  const [badge, setBadge] = useState<Badge | null>(null);
  const [typed, setTyped] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const now = useClock();
  const badgeNumber = badge?.badge_number ?? typed.trim();
  const choosing = withPin.length > 0 && !badge;

  const submit = async (p = pin) => {
    if (!badgeNumber || p.length < 4 || busy) return;
    setBusy(true);
    setError('');
    try {
      await onSignOn(badgeNumber, p);
    } catch (e) {
      setPin('');
      setError(isNetworkError(e) ? 'No connection. A guard can only sign on while the tablet is online.'
        : errorStatus(e) === 429 ? 'Too many tries. Wait a minute and try again.' : 'That PIN is not correct.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background lg:flex-row">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
      </div>

      {/* Brand and clock: a band on phones, a side panel on tablets in landscape. */}
      <section className="relative flex items-center justify-between gap-4 bg-primary-dark px-5 py-4 text-primary-foreground lg:w-[38%] lg:flex-col lg:items-start lg:justify-between lg:p-10">
        <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-6">
          <Image src="/brand/maskani-logo-stacked.svg" alt="Maskani" width={64} height={48} className="h-10 w-auto brightness-0 invert lg:h-16" priority />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">Gate</p>
            <h1 className="font-display text-xl font-semibold lg:text-3xl">{gateName}</h1>
          </div>
        </div>
        {now && (
          <div className="text-right lg:text-left">
            <p className="font-display text-3xl font-semibold tabular lg:text-6xl">
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-primary-foreground/70 lg:text-sm">
              {now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        )}
        <p className="hidden max-w-xs text-sm text-primary-foreground/70 lg:block">
          Sign on at the start of your shift. Every entry and exit you record carries your name.
        </p>
      </section>

      <section className="relative flex flex-1 items-center justify-center p-5 pb-safe lg:p-10">
        <div className="glass-strong w-full max-w-md rounded-3xl p-6 sm:p-8">
          {!online && (
            <p className="mb-4 flex items-center gap-2 rounded-xl bg-warning/15 px-3 py-2 text-sm text-warning-foreground">
              <WifiOff className="h-4 w-4 shrink-0" /> Offline. Signing on needs a connection.
            </p>
          )}

          {choosing ? (
            <>
              <h2 className="font-display text-2xl font-semibold">Who is on duty?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Tap your name.</p>
              <ul className="mt-5 grid max-h-[55dvh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
                {withPin.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => { setBadge(b); setPin(''); setError(''); }}
                      className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border bg-card/70 p-4 text-center transition active:scale-95 hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 font-display text-lg font-semibold text-primary">{initials(b.name)}</span>
                      <span className="line-clamp-2 text-sm font-medium leading-tight">{b.name}</span>
                      <span className="text-xs text-muted-foreground">#{b.badge_number}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="flex flex-col items-center gap-5">
              {badge ? (
                <div className="flex w-full items-center gap-3">
                  <IconButton label="Choose another name" onClick={() => { setBadge(null); setPin(''); setError(''); }}>
                    <ArrowLeft />
                  </IconButton>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 font-display font-semibold text-primary">{initials(badge.name)}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{badge.name}</p>
                    <p className="text-xs text-muted-foreground">Badge #{badge.badge_number}</p>
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                    <h2 className="font-display text-xl font-semibold">Sign on</h2>
                  </div>
                  <label htmlFor="g-badge" className="text-sm font-medium">Badge number</label>
                  <Input id="g-badge" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="e.g. 0142"
                    inputMode="numeric" autoComplete="off" className="h-12 text-base" />
                </div>
              )}
              <p className="text-sm text-muted-foreground">Enter your PIN</p>
              <Keypad
                value={pin}
                masked
                length={PIN_LENGTH}
                label="PIN"
                busy={busy}
                error={!!error}
                disabled={busy || !badgeNumber}
                onChange={(v) => { setPin(v); if (error) setError(''); if (v.length === PIN_LENGTH) void submit(v); }}
                onSubmit={() => void submit()}
              />
              <p role="alert" className={cn('min-h-5 text-center text-sm font-medium text-destructive')}>{error}</p>
              {pin.length >= 4 && pin.length < PIN_LENGTH && (
                <Button size="lg" className="h-12 w-full" onClick={() => void submit()} disabled={busy}>
                  {busy ? 'Checking...' : 'Sign on'}
                </Button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
