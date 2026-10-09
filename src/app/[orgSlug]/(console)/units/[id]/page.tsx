'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Send, UserPlus, Wallet } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge, ToneBadge } from '@/components/common/status-badge';
import { LinkPartySheet, partyName } from '@/components/register/link-party-sheet';
import { UnitForm } from '@/components/register/unit-form';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useEndLink, useInviteParty, useUnit } from '@/hooks/use-register';
import type { UnitAccount, UnitParty } from '@/lib/api/types';
import { label, OCCUPANCY_STATUS, PARTY_ROLE, SALE_STATUS } from '@/lib/labels';
import { apiDate, fmtDate, kes, num, titleCase, todayInput } from '@/lib/utils';

const ACCOUNT_COLUMNS: DataTableColumn<UnitAccount>[] = [
  { key: 'fund', header: 'Fund', primary: true, accessor: (a) => a.edges?.fund?.name ?? 'Account', render: (a) => <span className="font-medium">{a.edges?.fund?.name ?? 'Account'}</span> },
  { key: 'ref', header: 'Account', accessor: (a) => a.account_ref, render: (a) => <span className="font-mono text-xs">{a.account_ref}</span> },
  { key: 'paid', header: 'Last paid', hideBelow: 'md', accessor: (a) => a.last_payment_at ?? '', render: (a) => (a.last_payment_at ? fmtDate(a.last_payment_at) : <span className="text-muted-foreground">No payments yet</span>) },
  {
    key: 'balance', header: 'Balance', align: 'right', mobileAction: true, accessor: (a) => num(a.balance),
    render: (a) => <span className={num(a.balance) > 0 ? 'font-semibold text-destructive tabular' : 'tabular'}>{kes(a.balance)}</span>,
  },
];

export default function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const slug = useSlug();
  const { can, mod } = useAccess();
  const { data: u, isLoading } = useUnit(id);
  const [edit, setEdit] = useState(false);
  const [linking, setLinking] = useState(false);
  const [ending, setEnding] = useState<UnitParty | null>(null);
  const endLink = useEndLink(id);
  const invite = useInviteParty();
  const router = useRouter();
  const manageParties = can('parties.manage');

  const peopleColumns = useMemo<DataTableColumn<UnitParty>[]>(() => [
    {
      key: 'name', header: 'Name', primary: true, accessor: (l) => partyName(l.edges?.party),
      render: (l) => <Link href={`/${slug}/parties/${l.party_id}`} className="font-medium hover:underline">{partyName(l.edges?.party)}</Link>,
    },
    {
      key: 'role', header: 'Role', accessor: (l) => label(PARTY_ROLE, l.role),
      render: (l) => <ToneBadge tone={l.role === 'owner' || l.role === 'joint_owner' ? 'primary' : 'neutral'}>{label(PARTY_ROLE, l.role)}</ToneBadge>,
    },
    { key: 'phone', header: 'Phone', hideBelow: 'md', accessor: (l) => l.edges?.party?.phone ?? '' },
    { key: 'since', header: 'Since', hideBelow: 'md', accessor: (l) => l.start_date ?? '', render: (l) => fmtDate(l.start_date) },
    { key: 'pays', header: 'Pays', hideBelow: 'lg', accessor: (l) => (l.bill_to ?? []).map((c) => titleCase(c)).join(', ') },
    ...(manageParties ? [{
      key: 'actions', header: '', mobileAction: true, exportable: false, accessor: () => '',
      render: (l: UnitParty) => (
        <div className="flex justify-end gap-2">
          {!l.edges?.party?.auth_user_id && l.edges?.party?.phone && (
            <Button size="sm" variant="outline" onClick={() => invite.mutate(l.party_id)} disabled={invite.isPending}><Send /> Invite to portal</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setEnding(l)}>End</Button>
        </div>
      ),
    }] : []),
  ], [slug, manageParties, invite]);

  if (isLoading || !u) return <div className="mx-auto max-w-7xl space-y-3"><Skeleton className="h-10 w-48" /><Skeleton className="h-48" /></div>;

  const current = (u.parties ?? []).filter((p) => !p.end_date);
  const past = (u.parties ?? []).filter((p) => !!p.end_date);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        back={{ href: `/${slug}/units`, label: 'Units' }}
        title={`Unit ${u.code}`}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            {[titleCase(u.unit_type), u.bedrooms != null ? `${u.bedrooms} bedrooms` : '', u.size_sqm ? `${num(u.size_sqm)} m2` : ''].filter(Boolean).join(' · ')}
            <StatusBadge status={u.occupancy_status} label={label(OCCUPANCY_STATUS, u.occupancy_status)} />
            {mod('sales') && <StatusBadge status={u.sale_status} label={label(SALE_STATUS, u.sale_status)} />}
          </span>
        }
        actions={can('units.manage') ? <Button variant="outline" onClick={() => setEdit(true)}><Pencil /> Edit</Button> : undefined}
      />

      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>People</CardTitle>
            {can('parties.manage') && <Button size="sm" variant="outline" onClick={() => setLinking(true)}><UserPlus /> Link a person</Button>}
          </CardHeader>
          <CardContent className="p-0">
            {current.length === 0 ? (
              <EmptyState icon={UserPlus} title="No one linked" description="Link the owner first. Occupants and household members can follow." className="py-10" />
            ) : (
              <div className="px-4 pb-4 sm:px-6">
                <DataTable columns={peopleColumns} rows={current} rowKey={(l) => l.id} storageKey="maskani-unit-people" maxBodyHeight={false} />
              </div>
            )}
            {past.length > 0 && (
              <details className="border-t px-4 py-3 text-sm sm:px-6">
                <summary className="cursor-pointer text-muted-foreground">Past links ({past.length})</summary>
                <ul className="mt-2 space-y-1">
                  {past.map((l) => (
                    <li key={l.id} className="text-muted-foreground">{partyName(l.edges?.party)}, {label(PARTY_ROLE, l.role)}, {fmtDate(l.start_date)} to {fmtDate(l.end_date)}</li>
                  ))}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>

        {mod('billing') && (
          <Card>
            <CardHeader><CardTitle>Accounts</CardTitle></CardHeader>
            <CardContent className="p-0">
              {(u.accounts ?? []).length === 0 ? (
                <EmptyState icon={Wallet} title="No accounts yet" description="Accounts open when the unit is first billed." className="py-10" />
              ) : (
                <div className="px-4 pb-4 sm:px-6">
                  <DataTable
                    columns={ACCOUNT_COLUMNS}
                    rows={u.accounts ?? []}
                    rowKey={(a) => a.id}
                    onRowClick={(a) => router.push(`/${slug}/billing/accounts/${a.id}`)}
                    maxBodyHeight={false}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <UnitForm open={edit} onOpenChange={setEdit} unit={u} />
      <LinkPartySheet open={linking} onOpenChange={setLinking} unitId={u.id} unitCode={u.code} />
      <ConfirmDialog
        open={!!ending}
        onOpenChange={(o) => !o && setEnding(null)}
        variant="warning"
        title={`End ${partyName(ending?.edges?.party)}'s link to ${u.code}?`}
        description="Their portal access and gate passes for this unit stop from today. History is kept."
        confirmLabel="End link"
        loading={endLink.isPending}
        onConfirm={() => ending && endLink.mutate({ linkId: ending.id, endDate: apiDate(todayInput()) }, { onSuccess: () => setEnding(null) })}
      />
    </div>
  );
}
