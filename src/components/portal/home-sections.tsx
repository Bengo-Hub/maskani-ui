'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Bell, ChevronRight, Droplets, FileSignature, Receipt, ShieldCheck, Wrench, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PayAccount } from '@/components/billing/pay-account';
import { portalApi } from '@/lib/api/portal';
import type { PortalUnit, VisitorPass, WorkOrder, Notice } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';
import { label, PARTY_ROLE } from '@/lib/labels';
import { fmtDate, kes, num, periodLabel, titleCase } from '@/lib/utils';

/** The one number an owner opens the app for: what is owed across every account, or "all paid". */
export function DueSummary({ units }: { units: PortalUnit[] }) {
  const accounts = units.flatMap((u) => u.accounts);
  const due = accounts.reduce((s, a) => s + Math.max(0, num(a.balance)), 0);
  const credit = accounts.reduce((s, a) => s + Math.max(0, -num(a.balance)), 0);
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{due > 0 ? 'Total to pay' : 'Your accounts'}</p>
      <p className={due > 0 ? 'font-display text-3xl font-semibold tabular' : 'font-display text-3xl font-semibold text-success tabular'}>
        {due > 0 ? kes(due) : 'All paid'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} across {units.length} {units.length === 1 ? 'unit' : 'units'}
        {credit > 0 && <>. {kes(credit)} in credit</>}
      </p>
    </div>
  );
}

/** Quick actions, large touch targets. */
export function QuickActions({ base }: { base: string }) {
  const items: { href: string; icon: LucideIcon; label: string }[] = [
    { href: `${base}/portal/visitors?new=1`, icon: ShieldCheck, label: 'Add a visitor' },
    { href: `${base}/portal/requests?new=1`, icon: Wrench, label: 'Report a problem' },
    { href: `${base}/portal/notices`, icon: Bell, label: 'Notices' },
    { href: `${base}/portal/purchase`, icon: FileSignature, label: 'Purchase plan' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="flex min-h-[44px] items-center gap-2 rounded-xl border bg-card px-3 py-3 text-sm font-medium hover:border-primary/40">
          <i.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden /> {i.label}
        </Link>
      ))}
    </div>
  );
}

/** One unit: its accounts with pay and statement, and how to pay by paybill. */
export function UnitCard({ data, slug, email }: { data: PortalUnit; slug: string; email?: string }) {
  const { unit, property, accounts, link, last_reading: read } = data;
  return (
    <Card className="gap-0 py-0">
      <div className="border-b px-4 py-3">
        <p className="font-display text-lg font-semibold">Unit {unit.code}</p>
        <p className="text-xs text-muted-foreground">{[property?.name, titleCase(unit.unit_type), label(PARTY_ROLE, link.role)].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="divide-y">
        {accounts.length === 0 && <p className="px-4 py-4 text-sm text-muted-foreground">No bills yet.</p>}
        {accounts.map((a) => {
          const due = num(a.balance);
          const fund = a.edges?.fund;
          return (
            <div key={a.id} className="space-y-3 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{fund?.name ?? 'Account'} · {a.account_ref}</p>
                  <p className={due > 0 ? 'font-display text-2xl font-semibold tabular' : 'font-display text-2xl font-semibold text-success tabular'}>
                    {due > 0 ? kes(due) : due < 0 ? `${kes(-due)} credit` : 'All paid'}
                  </p>
                  {a.last_payment_at && <p className="text-xs text-muted-foreground">Last paid {fmtDate(a.last_payment_at)}</p>}
                </div>
                <Link href={`/${slug}/portal/statement/${a.id}`} className="flex min-h-[44px] items-center gap-1 text-sm font-medium text-primary">
                  <Receipt className="h-4 w-4" aria-hidden /> Statement
                </Link>
              </div>
              {due > 0 && (
                <PayAccount tenantSlug={slug} accountId={a.id} accountRef={a.account_ref} balance={a.balance} size="lg" email={email}
                  createIntent={(id, body) => portalApi.pay(slug, id, body)} invalidate={[qk.portal(slug)]} />
              )}
              {fund?.paybill_shortcode && (
                <p className="rounded-lg bg-muted px-3 py-2 text-sm">
                  Or pay by M-Pesa: Paybill <strong className="tabular">{fund.paybill_shortcode}</strong>, account <strong className="font-mono">{a.account_ref}</strong>
                </p>
              )}
            </div>
          );
        })}
        {read && (
          <div className="flex items-center gap-3 px-4 py-3">
            <Droplets className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p className="text-sm">
              Water, {periodLabel(read.period)}: <span className="font-medium tabular">{num(read.consumption)} m³</span>
              <span className="text-muted-foreground"> (meter at {num(read.reading)}{read.estimated ? ', estimated' : ''})</span>
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

/** A small titled panel linking to its full page. */
function Panel({ href, icon: Icon, title, children }: { href: string; icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <Link href={href} className="block rounded-xl border bg-card p-4 hover:border-primary/40">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-primary" aria-hidden /> {title}</p>
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
      {children}
    </Link>
  );
}

export function VisitorsPanel({ base, passes }: { base: string; passes: VisitorPass[] }) {
  const now = Date.now();
  const active = passes.filter((p) => p.status === 'active' && new Date(p.valid_to).getTime() > now);
  return (
    <Panel href={`${base}/portal/visitors`} icon={ShieldCheck} title="Visitors">
      {active.length ? (
        <p className="text-sm"><span className="font-semibold">{active.length}</span> active {active.length === 1 ? 'pass' : 'passes'}. Next: {active[0].visitor_name}, until {fmtDate(active[0].valid_to)}</p>
      ) : <p className="text-sm text-muted-foreground">No active passes. Add one before a guest arrives.</p>}
    </Panel>
  );
}

export function RequestsPanel({ base, requests }: { base: string; requests: WorkOrder[] }) {
  const open = requests.filter((r) => !['completed', 'confirmed', 'closed', 'cancelled'].includes(String(r.status)));
  const latest = requests[0];
  return (
    <Panel href={`${base}/portal/requests`} icon={Wrench} title="Requests">
      {open.length ? (
        <p className="text-sm"><span className="font-semibold">{open.length}</span> open. Latest: {latest?.title} ({titleCase(String(latest?.status).replace(/_/g, ' '))})</p>
      ) : <p className="text-sm text-muted-foreground">Nothing open. Report a leak, a fault or anything that needs fixing.</p>}
    </Panel>
  );
}

export function NoticesPanel({ base, notices }: { base: string; notices: Notice[] }) {
  const top = notices.slice(0, 2);
  return (
    <Panel href={`${base}/portal/notices`} icon={Bell} title="Notices">
      {top.length ? (
        <ul className="space-y-1">
          {top.map((n) => (
            <li key={n.id} className="truncate text-sm">
              {n.priority === 'emergency' && <span className="mr-1 font-semibold">Urgent:</span>}{n.title}
              <span className="text-muted-foreground"> · {fmtDate(n.sent_at ?? n.created_at)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">No notices in the last three months.</p>}
    </Panel>
  );
}

/** Purchase progress for a buyer. */
export function PurchaseCard({ base, contract, unitCode }: {
  base: string; unitCode?: string;
  contract: { id: string; net_price?: string; paid_total?: string; next_due?: { amount: string; due_date: string } | null };
}) {
  const net = num(contract.net_price);
  const paid = num(contract.paid_total);
  return (
    <Link href={`${base}/portal/purchase`} className="block">
      <Card className="gap-3 p-4 hover:border-primary/40">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-medium"><FileSignature className="h-4 w-4 text-primary" aria-hidden /> Purchase plan{unitCode ? ` for ${unitCode}` : ''}</p>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
        <Progress value={net > 0 ? Math.min(100, (paid / net) * 100) : 0} />
        <p className="text-sm text-muted-foreground">
          {kes(paid)} of {kes(net)} paid{contract.next_due ? `. Next ${kes(contract.next_due.amount)} due ${fmtDate(contract.next_due.due_date)}` : ''}
        </p>
      </Card>
    </Link>
  );
}
