'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Field } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { InstalmentSchedule } from '@/components/sales/instalment-schedule';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useActivateContract, useContract } from '@/hooks/use-sales';
import { apiDate, fmtDate, kes, num, titleCase, todayInput } from '@/lib/utils';

export default function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const slug = useSlug();
  const { can } = useAccess();
  const { data: c, isLoading } = useContract(id);
  const activate = useActivateContract(id);
  const [signing, setSigning] = useState(false);
  const [signedAt, setSignedAt] = useState(todayInput);

  if (isLoading || !c) return <div className="mx-auto max-w-7xl space-y-3"><Skeleton className="h-10 w-56" /><Skeleton className="h-64" /></div>;
  const net = num(c.net_price);
  const paid = num(c.paid_total);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        back={{ href: `/${slug}/sales/contracts`, label: 'Sale contracts' }}
        title={<span className="font-mono">{c.contract_number}</span>}
        subtitle={<span className="inline-flex flex-wrap items-center gap-2"><StatusBadge status={c.status} /> {titleCase(c.payment_option)} <Link href={`/${slug}/units/${c.unit_id}`} className="text-primary hover:underline">Open the unit</Link></span>}
        actions={c.status === 'draft' && can('sales.manage') ? <Button onClick={() => setSigning(true)}><FileCheck /> Mark signed and activate</Button> : undefined}
      />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-muted-foreground">Paid</span>
              <span className="font-display text-xl font-semibold tabular">{kes(paid)} <span className="text-sm font-normal text-muted-foreground">of {kes(net)}</span></span>
            </div>
            <Progress value={net > 0 ? Math.min(100, (paid / net) * 100) : 0} />
            <dl className="grid grid-cols-2 gap-3 pt-1 text-sm sm:grid-cols-4 lg:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">Price</dt><dd className="tabular">{kes(c.price)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Discount</dt><dd className="tabular">{kes(c.discount ?? 0)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Deposit</dt><dd className="tabular">{kes(c.deposit_amount ?? 0)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Signed</dt><dd>{fmtDate(c.signed_at) || 'Not yet'}</dd></div>
            </dl>
            {c.next_due && <p className="rounded-lg bg-muted px-3 py-2 text-sm">Next: {kes(c.next_due.amount)} due {fmtDate(c.next_due.due_date)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Payment schedule</CardTitle></CardHeader>
          <CardContent>
            {c.instalments?.length ? <InstalmentSchedule instalments={c.instalments} /> : <p className="text-sm text-muted-foreground">The schedule is created when the contract is activated.</p>}
          </CardContent>
        </Card>
      </div>
      <FormSheet
        open={signing}
        onOpenChange={setSigning}
        size="sm"
        title="Activate the contract"
        description="Builds the payment schedule from the signing date. Each instalment is billed when it falls due."
        footer={<>
          <Button variant="outline" onClick={() => setSigning(false)}>Cancel</Button>
          <Button onClick={() => activate.mutate(apiDate(signedAt), { onSuccess: () => setSigning(false) })} disabled={!signedAt || activate.isPending}>{activate.isPending ? 'Activating...' : 'Activate'}</Button>
        </>}
      >
        <Field label="Signed on" htmlFor="ct-signed"><Input id="ct-signed" type="date" value={signedAt} onChange={(e) => setSignedAt(e.target.value)} /></Field>
      </FormSheet>
    </div>
  );
}
