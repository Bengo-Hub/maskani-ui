'use client';

import { FileSignature } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { InstalmentSchedule } from '@/components/sales/instalment-schedule';
import { useSlug } from '@/hooks/use-access';
import { usePortalPurchase, usePortalUnits } from '@/hooks/use-portal';
import { kes, num } from '@/lib/utils';

export default function PortalPurchasePage() {
  const slug = useSlug();
  const { data: contracts = [], isLoading } = usePortalPurchase();
  const { data: units = [] } = usePortalUnits();

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
                {c.instalments?.length ? <InstalmentSchedule instalments={c.instalments} /> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
