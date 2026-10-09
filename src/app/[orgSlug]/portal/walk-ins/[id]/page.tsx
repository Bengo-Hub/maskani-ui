'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { Check, Clock, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSlug } from '@/hooks/use-access';
import { useDecideWalkIn } from '@/hooks/use-portal';

type Outcome = 'approved' | 'declined' | 'timeout' | 'guard_approved' | 'guard_declined' | null;

/**
 * Opened from the gate alert on the phone or the WhatsApp "visitor at the gate" button. The answer
 * counts for 5 minutes after the guard's latest ask (a ring restarts them); the guard can also
 * decide at the gate, and then this page says so.
 */
export default function WalkInDecisionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const slug = useSlug();
  const [outcome, setOutcome] = useState<Outcome>(null);
  const decide = useDecideWalkIn(id);
  const answer = (approve: boolean) => decide.mutate(approve, {
    onSuccess: (ev) => {
      const d = ev?.decision;
      if (ev?.decided_by === 'guard' && (d === 'approved' || d === 'declined')) { setOutcome(`guard_${d}`); return; }
      setOutcome(d === 'timeout' ? 'timeout' : d === 'approved' || d === 'declined' ? d : approve ? 'approved' : 'declined');
    },
  });

  if (outcome) {
    const view = {
      approved: { icon: Check, tone: 'text-success', title: 'Visitor allowed in', body: 'The guard has been told to let them in.' },
      declined: { icon: X, tone: 'text-destructive', title: 'Visitor turned away', body: 'The guard has been told not to let them in.' },
      guard_approved: { icon: Check, tone: 'text-success', title: 'The guard already let them in', body: 'The guard decided at the gate before your answer arrived.' },
      guard_declined: { icon: X, tone: 'text-destructive', title: 'The guard already turned them away', body: 'The guard decided at the gate before your answer arrived. Call the gate if they should come in.' },
      timeout: { icon: Clock, tone: 'text-warning', title: 'Too late to answer', body: 'More than 5 minutes passed since the guard asked. Call the gate if they are still there.' },
    }[outcome];
    return (
      <Card className="items-center gap-3 p-8 text-center">
        <view.icon className={`h-12 w-12 ${view.tone}`} />
        <h1 className="font-display text-xl font-semibold">{view.title}</h1>
        <p className="text-sm text-muted-foreground">{view.body}</p>
        <Link href={`/${slug}/portal/visitors`} className="text-sm font-medium text-primary">Create a pass for next time</Link>
      </Card>
    );
  }

  return (
    <Card className="items-center gap-5 p-6 text-center sm:p-8">
      <ShieldCheck className="h-12 w-12 text-primary" />
      <div className="space-y-1">
        <h1 className="font-display text-xl font-semibold">Someone is at the gate for you</h1>
        <p className="text-sm text-muted-foreground">The guard is waiting for your answer. It counts for 5 minutes after the guard asked.</p>
      </div>
      <div className="grid w-full gap-3 sm:grid-cols-2">
        <Button size="lg" className="h-14 text-base" onClick={() => answer(true)} disabled={decide.isPending}><Check /> Let them in</Button>
        <Button size="lg" variant="outline" className="h-14 text-base" onClick={() => answer(false)} disabled={decide.isPending}><X /> Turn them away</Button>
      </div>
    </Card>
  );
}
