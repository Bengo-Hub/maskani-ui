'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { Check, Clock, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSlug } from '@/hooks/use-access';
import { portalApi } from '@/lib/api/portal';

type Outcome = 'approved' | 'declined' | 'timeout' | null;

/**
 * Opened from the WhatsApp "visitor at the gate" button (deep link contract in the UX spec). The
 * guard waits up to 5 minutes; after that the API records a timeout whatever the answer.
 */
export default function WalkInDecisionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const slug = useSlug();
  const [outcome, setOutcome] = useState<Outcome>(null);
  const decide = useMutation({
    mutationFn: (approve: boolean) => portalApi.decideWalkIn(slug, id, approve) as Promise<{ decision?: string }>,
    onSuccess: (ev, approve) => {
      const d = ev?.decision;
      setOutcome(d === 'timeout' ? 'timeout' : d === 'approved' || d === 'declined' ? d : approve ? 'approved' : 'declined');
    },
  });

  if (outcome) {
    const view = {
      approved: { icon: Check, tone: 'text-success', title: 'Visitor allowed in', body: 'The guard has been told to let them in.' },
      declined: { icon: X, tone: 'text-destructive', title: 'Visitor turned away', body: 'The guard has been told not to let them in.' },
      timeout: { icon: Clock, tone: 'text-warning', title: 'Too late to answer', body: 'More than 5 minutes passed, so the guard did not let them in. Call the gate if they are still there.' },
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
        <p className="text-sm text-muted-foreground">The guard is waiting for your answer. The request expires 5 minutes after the guard sent it.</p>
      </div>
      <div className="grid w-full gap-3 sm:grid-cols-2">
        <Button size="lg" className="h-14 text-base" onClick={() => decide.mutate(true)} disabled={decide.isPending}><Check /> Let them in</Button>
        <Button size="lg" variant="outline" className="h-14 text-base" onClick={() => decide.mutate(false)} disabled={decide.isPending}><X /> Turn them away</Button>
      </div>
    </Card>
  );
}
