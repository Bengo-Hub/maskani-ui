'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { KeysetTable } from '@/components/common/keyset-table';
import { PageHeader } from '@/components/common/page-header';
import { SearchInput } from '@/components/common/search-input';
import { ToneBadge } from '@/components/common/status-badge';
import { partyName } from '@/components/register/link-party-sheet';
import { PartyForm } from '@/components/register/party-form';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useParties } from '@/hooks/use-register';
import type { Party } from '@/lib/api/types';

export default function PartiesPage() {
  const slug = useSlug();
  const router = useRouter();
  const { can } = useAccess();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const list = useParties(q);

  const columns = useMemo<DataTableColumn<Party>[]>(() => [
    {
      key: 'name', header: 'Name', primary: true, accessor: (p) => partyName(p),
      render: (p) => (
        <div className="min-w-0">
          <p className="font-medium">{partyName(p)}</p>
          <p className="text-xs text-muted-foreground">{p.kind === 'company' ? 'Company' : 'Person'}{p.is_diaspora ? ' · abroad' : ''}</p>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', accessor: (p) => p.phone ?? '' },
    { key: 'email', header: 'Email', hideBelow: 'lg', accessor: (p) => p.email ?? '' },
    {
      key: 'portal', header: 'Portal', mobileAction: true, accessor: (p) => (p.auth_user_id ? 'active' : 'not invited'),
      render: (p) => (p.auth_user_id ? <ToneBadge tone="success">Signed up</ToneBadge> : <ToneBadge>Not yet</ToneBadge>),
    },
  ], []);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Owners and residents"
        subtitle="Owners, buyers, occupants and household members"
        actions={can('parties.manage') ? <Button onClick={() => setOpen(true)}><Plus /> Add a person</Button> : undefined}
      />
      <div className="mb-3"><SearchInput value={q} onSearch={setQ} placeholder="Name or phone" /></div>
      <KeysetTable
        columns={columns}
        rows={list.rows}
        rowKey={(p) => p.id}
        loading={list.isLoading}
        error={list.isError}
        onRetry={() => void list.refetch()}
        hasMore={list.hasMore}
        loadMore={() => void list.loadMore()}
        loadingMore={list.loadingMore}
        emptyText={q ? 'Nobody matches that search.' : 'No owners or residents yet.'}
        onRowClick={(p) => router.push(`/${slug}/parties/${p.id}`)}
        storageKey="maskani-parties"
      />
      <PartyForm open={open} onOpenChange={setOpen} onSaved={(p) => router.push(`/${slug}/parties/${p.id}`)} />
    </div>
  );
}
