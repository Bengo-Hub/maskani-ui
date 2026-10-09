'use client';

import { use } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { PayAccount } from '@/components/billing/pay-account';
import { ExportButtons } from '@/components/common/export-buttons';
import { StatementView } from '@/components/billing/statement-view';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useStatement } from '@/hooks/use-billing';
import { billingApi } from '@/lib/api/billing';
import { qk } from '@/lib/query-keys';

export default function AccountStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const slug = useSlug();
  const { can } = useAccess();
  const { data, isLoading } = useStatement(id);

  if (isLoading || !data) return <div className="mx-auto max-w-4xl space-y-3"><Skeleton className="h-10 w-56" /><Skeleton className="h-64" /></div>;
  const a = data.account;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back={{ href: `/${slug}/billing/accounts`, label: 'Unit accounts' }}
        title={<span>Account <span className="font-mono">{a.account_ref}</span></span>}
        subtitle={<>{a.customer_name || 'No owner'} &middot; <Link href={`/${slug}/units/${a.unit_id}`} className="text-primary hover:underline">Open the unit</Link></>}
        actions={can('billing.collect') ? (
          <PayAccount
            tenantSlug={slug}
            accountId={a.id}
            accountRef={a.account_ref}
            balance={data.ledger?.balance ?? a.balance}
            label="Collect payment"
            createIntent={(accId, body) => billingApi.staffPay(slug, accId, body)}
            invalidate={[qk.statement(slug, a.id), qk.accounts(slug), qk.dashboard(slug)]}
          />
        ) : undefined}
      />
      <StatementView
        statement={data}
        actions={<ExportButtons name={`statement-${a.account_ref}`} title={`Statement for ${a.account_ref}`} pdfLabel="Statement PDF"
          fetchFile={(format) => billingApi.statementFile(slug, a.id, format)} />}
      />
    </div>
  );
}
