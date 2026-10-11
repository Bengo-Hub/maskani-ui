'use client';

import { useState } from 'react';
import { CalendarCheck, FileSignature, KeySquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { InstalmentSchedule } from '@/components/sales/instalment-schedule';
import { useSlug } from '@/hooks/use-access';
import { useAcceptPortalPlan, usePortalPurchase, usePortalUnits } from '@/hooks/use-portal';
import type { PlanVersion } from '@/lib/api/types';
import { fmtDate, kes, num } from '@/lib/utils';

export default function PortalPurchasePage() {
  const slug = useSlug();
  const { data: contracts = [], isLoading } = usePortalPurchase();
  const { data: units = [] } = usePortalUnits();
  const acceptPlan = useAcceptPortalPlan();
  const [accepting, setAccepting] = useState<PlanVersion | null>(null);

  return (
    <div>
      <PageHeader back={{ href: `/${slug}/portal`, label: 'Home' }} title="Purchase plan" />
      {isLoading && <Skeleton className="h-64" />}
      {!isLoading && contracts.length === 0 && <EmptyState icon={FileSignature} title="No purchase plan" description="You have no sale agreement with the developer." />}
      <div className="space-y-4">
        {contracts.map((c) => {
          const net = num(c.net_price);
          const paid = num(c.paid_total);
          const unit = units.find((u) => u.unit.id === c.unit_id)?.unit;
          return (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle>Unit {unit?.code ?? ''} <span className="font-mono text-xs font-normal text-muted-foreground">{c.contract_number}</span></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-muted-foreground">Paid</span>
                    <span className="font-display text-lg font-semibold tabular">{kes(paid)} <span className="text-sm font-normal text-muted-foreground">of {kes(net)}</span></span>
                  </div>
                  <Progress value={net > 0 ? Math.min(100, (paid / net) * 100) : 0} />
                  <p className="text-sm text-muted-foreground">Balance {kes(c.balance ?? net - paid)}</p>
                </div>
                {c.pending_plan && (
                  <div className="space-y-3 rounded-xl border border-warning/40 bg-warning/5 p-3">
                    <p className="flex items-center gap-2 font-medium"><CalendarCheck className="size-4" /> A new payment plan is ready for you</p>
                    {c.pending_plan.reason && <p className="text-sm text-muted-foreground">{c.pending_plan.reason}</p>}
                    <p className="text-sm">{kes(c.pending_plan.total)} over {c.pending_plan.instalments.length} payment{c.pending_plan.instalments.length === 1 ? '' : 's'}, from {fmtDate(c.pending_plan.instalments[0]?.due_date)}. Bills already sent stay as they are.</p>
                    <InstalmentSchedule instalments={c.pending_plan.instalments} />
                    <Button className="w-full sm:w-auto" onClick={() => setAccepting(c.pending_plan ?? null)}>Accept the new plan</Button>
                  </div>
                )}
                {c.handover && (
                  <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                    <KeySquare className="size-4 shrink-0" />
                    {c.handover.status === 'completed'
                      ? `Handed over on ${fmtDate(c.handover.completed_at)}.${(c.handover.snag_items ?? []).some((s) => s.status !== 'fixed') ? ' The estate is still fixing some snags.' : ''}`
                      : c.handover.scheduled_at ? `Handover booked for ${fmtDate(c.handover.scheduled_at)}.` : 'Your handover is being arranged.'}
                  </p>
                )}
                {c.instalments?.length ? <InstalmentSchedule instalments={c.instalments} /> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <ConfirmDialog
        open={!!accepting}
        onOpenChange={(o) => !o && setAccepting(null)}
        title="Accept the new payment plan?"
        description={accepting ? `It replaces the payments not yet billed: ${kes(accepting.total)} over ${accepting.instalments.length} payment${accepting.instalments.length === 1 ? '' : 's'}. Your acceptance is recorded with the time.` : undefined}
        confirmLabel="Accept"
        loading={acceptPlan.isPending}
        onConfirm={() => accepting && acceptPlan.mutate(accepting.id, { onSuccess: () => setAccepting(null) })}
      />
    </div>
  );
}
