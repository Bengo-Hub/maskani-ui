'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { Pencil, Send, UserPlus, Wallet } from 'lucide-react';
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
import type { UnitParty } from '@/lib/api/types';
import { label, OCCUPANCY_STATUS, PARTY_ROLE, SALE_STATUS } from '@/lib/labels';
import { apiDate, fmtDate, kes, num, titleCase, todayInput } from '@/lib/utils';

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

  if (isLoading || !u) return <div className="mx-auto max-w-4xl space-y-3"><Skeleton className="h-10 w-48" /><Skeleton className="h-48" /></div>;

  const current = (u.parties ?? []).filter((p) => !p.end_date);
  const past = (u.parties ?? []).filter((p) => !!p.end_date);

  return (
    <div className="mx-auto max-w-4xl">
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
              <ul className="divide-y">
                {current.map((l) => (
                  <li key={l.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="min-w-0">
                      <Link href={`/${slug}/parties/${l.party_id}`} className="font-medium hover:underline">{partyName(l.edges?.party)}</Link>
                      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <ToneBadge tone={l.role === 'owner' || l.role === 'joint_owner' ? 'primary' : 'neutral'}>{label(PARTY_ROLE, l.role)}</ToneBadge>
                        {l.edges?.party?.phone} {l.start_date && <>since {fmtDate(l.start_date)}</>}
                        {l.bill_to?.length ? <>pays {l.bill_to.map((c) => titleCase(c)).join(', ')}</> : null}
                      </p>
                    </div>
                    {can('parties.manage') && (
                      <div className="flex gap-2">
                        {!l.edges?.party?.auth_user_id && l.edges?.party?.phone && (
                          <Button size="sm" variant="outline" onClick={() => invite.mutate(l.party_id)} disabled={invite.isPending}><Send /> Invite to portal</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setEnding(l)}>End</Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
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
                <ul className="divide-y">
                  {(u.accounts ?? []).map((a) => (
                    <li key={a.id}>
                      <Link href={`/${slug}/billing/accounts/${a.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 sm:px-6">
                        <div>
                          <p className="font-medium">{a.edges?.fund?.name ?? 'Account'} <span className="font-mono text-xs text-muted-foreground">{a.account_ref}</span></p>
                          <p className="text-xs text-muted-foreground">{a.last_payment_at ? `Last paid ${fmtDate(a.last_payment_at)}` : 'No payments yet'}</p>
                        </div>
                        <span className={num(a.balance) > 0 ? 'font-semibold text-destructive tabular' : 'tabular'}>{kes(a.balance)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
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
