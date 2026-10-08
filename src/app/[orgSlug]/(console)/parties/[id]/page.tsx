'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { Home, Mail, Pencil, Phone, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { ToneBadge } from '@/components/common/status-badge';
import { partyName } from '@/components/register/link-party-sheet';
import { PartyForm } from '@/components/register/party-form';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useInviteParty, useParty } from '@/hooks/use-register';
import { label, PARTY_ROLE } from '@/lib/labels';
import { fmtDate } from '@/lib/utils';

export default function PartyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const slug = useSlug();
  const { can } = useAccess();
  const { data: p, isLoading } = useParty(id);
  const [edit, setEdit] = useState(false);
  const invite = useInviteParty();

  if (isLoading || !p) return <div className="mx-auto max-w-4xl space-y-3"><Skeleton className="h-10 w-56" /><Skeleton className="h-40" /></div>;

  const units = p.units ?? [];
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back={{ href: `/${slug}/parties`, label: 'Owners and residents' }}
        title={partyName(p)}
        subtitle={p.auth_user_id ? <ToneBadge tone="success">Signed up to the portal</ToneBadge> : <ToneBadge>Not signed up yet</ToneBadge>}
        actions={can('parties.manage') ? <>
          {!p.auth_user_id && p.phone && (
            <Button variant="outline" onClick={() => invite.mutate(p.id)} disabled={invite.isPending}><Send /> Invite to portal</Button>
          )}
          <Button variant="outline" onClick={() => setEdit(true)}><Pencil /> Edit</Button>
        </> : undefined}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {p.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {p.phone}</p>}
            {p.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {p.email}</p>}
            <dl className="grid grid-cols-2 gap-3 border-t pt-3">
              <div><dt className="text-xs text-muted-foreground">ID</dt><dd>{p.national_id_masked || 'Not on file'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">KRA PIN</dt><dd>{p.kra_pin_masked || 'Not on file'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Prefers</dt><dd className="capitalize">{p.preferred_channel ?? 'whatsapp'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Abroad</dt><dd>{p.is_diaspora ? 'Yes' : 'No'}</dd></div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Units</CardTitle></CardHeader>
          <CardContent className="p-0">
            {units.length === 0 ? (
              <EmptyState icon={Home} title="Not linked to a unit" description="Link them from the unit page." className="py-10" />
            ) : (
              <ul className="divide-y">
                {units.map((u) => (
                  <li key={`${u.unit_id}-${u.role}`}>
                    <Link href={`/${slug}/units/${u.unit_id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 sm:px-6">
                      <span className="font-medium">{u.unit_code}</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ToneBadge tone={u.end_date ? 'neutral' : 'primary'}>{label(PARTY_ROLE, u.role)}</ToneBadge>
                        {u.end_date ? `ended ${fmtDate(u.end_date)}` : u.start_date ? `since ${fmtDate(u.start_date)}` : ''}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      <PartyForm open={edit} onOpenChange={setEdit} party={p} />
    </div>
  );
}
