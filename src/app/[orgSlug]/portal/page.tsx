'use client';

import Link from 'next/link';
import { ChevronRight, FileSignature, Home, Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { PayAccount } from '@/components/billing/pay-account';
import { useSlug } from '@/hooks/use-access';
import { usePortalPurchase, usePortalUnits } from '@/hooks/use-portal';
import { portalApi } from '@/lib/api/portal';
import { qk } from '@/lib/query-keys';
import { label, PARTY_ROLE } from '@/lib/labels';
import { kes, num, titleCase } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

export default function PortalHome() {
  const slug = useSlug();
  const me = useAuthStore((s) => s.me);
  const { data: units = [], isLoading } = usePortalUnits();
  const { data: contracts = [] } = usePortalPurchase();
  const first = me?.user?.name?.split(' ')[0];

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">{first ? `Hello, ${first}` : 'Your home'}</h1>

      {isLoading && <Skeleton className="h-48 rounded-xl" />}
      {!isLoading && units.length === 0 && (
        <EmptyState icon={Home} title="No unit linked yet" description="Ask the estate office to link your phone number to your unit." />
      )}

      {units.map(({ unit, property, accounts, link }) => (
        <Card key={unit.id} className="gap-0 py-0">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold">Unit {unit.code}</p>
              <p className="text-xs text-muted-foreground">
                {[property?.name, titleCase(unit.unit_type), label(PARTY_ROLE, link.role)].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <CardContent className="divide-y p-0">
            {accounts.length === 0 && <p className="px-4 py-4 text-sm text-muted-foreground">No bills yet.</p>}
            {accounts.map((a) => {
              const due = num(a.balance);
              const fund = a.edges?.fund;
              return (
                <div key={a.id} className="space-y-3 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{fund?.name ?? 'Account'} balance</p>
                      <p className={due > 0 ? 'font-display text-2xl font-semibold tabular' : 'font-display text-2xl font-semibold text-success tabular'}>
                        {due > 0 ? kes(due) : due < 0 ? `${kes(-due)} credit` : 'All paid'}
                      </p>
                    </div>
                    <Link href={`/${slug}/portal/statement/${a.id}`} className="flex items-center gap-1 text-sm font-medium text-primary">
                      <Receipt className="h-4 w-4" /> Statement
                    </Link>
                  </div>
                  {due > 0 && (
                    <PayAccount
                      tenantSlug={slug}
                      accountId={a.id}
                      accountRef={a.account_ref}
                      balance={a.balance}
                      size="lg"
                      email={me?.email}
                      createIntent={(id, body) => portalApi.pay(slug, id, body)}
                      invalidate={[qk.portal(slug)]}
                    />
                  )}
                  {fund?.paybill_shortcode && (
                    <p className="rounded-lg bg-muted px-3 py-2 text-sm">
                      Or pay by M-Pesa: Paybill <strong className="tabular">{fund.paybill_shortcode}</strong>, account <strong className="font-mono">{a.account_ref}</strong>
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {contracts.map((c) => {
        const net = num(c.net_price);
        const paid = num(c.paid_total);
        const unitCode = units.find((u) => u.unit.id === c.unit_id)?.unit.code;
        return (
          <Link key={c.id} href={`/${slug}/portal/purchase`} className="block">
            <Card className="gap-3 p-4 hover:border-primary/40">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-medium"><FileSignature className="h-4 w-4 text-primary" /> Purchase plan{unitCode ? ` for ${unitCode}` : ''}</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <Progress value={net > 0 ? Math.min(100, (paid / net) * 100) : 0} />
              <p className="text-sm text-muted-foreground">{kes(paid)} of {kes(net)} paid{c.next_due ? `. Next ${kes(c.next_due.amount)} due ${new Date(c.next_due.due_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}` : ''}</p>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
