'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect } from '@/components/common/field';
import { errorStatus, isNetworkError } from '@/lib/api/errors';
import { Keypad } from './keypad';

interface Badge { id: string; badge_number: string; name: string; has_pin: boolean }

/** Guard starts a shift: pick or type the badge, then the PIN set by the manager. */
export function GuardSignOn({ gateName, badges, onSignOn }: {
  gateName: string;
  badges: Badge[];
  onSignOn: (badge: string, pin: string) => Promise<unknown>;
}) {
  const withPin = badges.filter((b) => b.has_pin);
  const [badge, setBadge] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (p = pin) => {
    if (!badge.trim() || p.length < 4) return;
    setBusy(true);
    setError('');
    try {
      await onSignOn(badge.trim(), p);
    } catch (e) {
      setPin('');
      setError(isNetworkError(e) ? 'No connection. A guard can only sign on while the tablet is online.'
        : errorStatus(e) === 429 ? 'Too many tries. Wait a minute.' : 'Badge or PIN is not correct.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 py-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <ShieldCheck className="h-12 w-12 text-primary" />
        <h1 className="font-display text-2xl font-semibold">{gateName}</h1>
        <p className="text-muted-foreground">Guard on duty, sign on to start your shift.</p>
      </div>
      <Field label="Badge" htmlFor="g-badge" className="w-full max-w-xs">
        {withPin.length > 0 ? (
          <NativeSelect id="g-badge" value={badge} onChange={(e) => setBadge(e.target.value)} className="h-12 text-base">
            <option value="">Choose your name</option>
            {withPin.map((b) => <option key={b.id} value={b.badge_number}>{b.name} ({b.badge_number})</option>)}
          </NativeSelect>
        ) : (
          <Input id="g-badge" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Badge number" className="h-12 text-base" />
        )}
      </Field>
      <Keypad value={pin} masked length={6} disabled={busy || !badge} onChange={(v) => { setPin(v); if (v.length === 6) void submit(v); }} />
      {error && <p className="text-center text-sm font-medium text-destructive" role="alert">{error}</p>}
      <Button size="lg" className="h-14 w-full max-w-xs text-lg" onClick={() => void submit()} disabled={busy || !badge || pin.length < 4}>
        {busy ? 'Checking...' : 'Sign on'}
      </Button>
    </div>
  );
}
