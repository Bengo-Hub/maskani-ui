'use client';

import { use } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { PayAccount } from '@/components/billing/pay-account';
import { StatementView } from '@/components/billing/statement-view';
import { useSlug } from '@/hooks/use-access';
import { usePortalStatement } from '@/hooks/use-portal';
import { portalApi } from '@/lib/api/portal';
import { qk } from '@/lib/query-keys';
import { num } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

export default function PortalStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const slug = useSlug();
  const email = useAuthStore((s) => s.me?.email);
  const { data, isLoading } = usePortalStatement(id);
  if (isLoading || !data) return <div className="space-y-3"><Skeleton className="h-8 w-40" /><Skeleton className="h-64" /></div>;
  const balance = data.ledger?.balance ?? data.account.balance;
  return (
    <div>
      <PageHeader
        back={{ href: `/${slug}/portal`, label: 'Home' }}
        title={<span>Account <span className="font-mono">{data.account.account_ref}</span></span>}
        actions={num(balance) > 0 ? (
          <PayAccount
            tenantSlug={slug}
            accountId={id}
            accountRef={data.account.account_ref}
            balance={balance}
            email={email}
            createIntent={(accId, body) => portalApi.pay(slug, accId, body)}
            invalidate={[qk.portal(slug)]}
          />
        ) : undefined}
      />
      <StatementView statement={data} />
    </div>
  );
}
