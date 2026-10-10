'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Bell, ChevronRight, Droplets, FileSignature, Receipt, ShieldCheck, Wrench, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PayAccount } from '@/components/billing/pay-account';
import { PayInstructionNote } from '@/components/billing/pay-instruction';
import { portalApi } from '@/lib/api/portal';
import type { PortalUnit, VisitorPass, WorkOrder, Notice } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';
import { label, PARTY_ROLE } from '@/lib/labels';
import { fmtDate, kes, num, periodLabel, titleCase } from '@/lib/utils';

/**
 * The greeting band: an estate photograph under a glass panel holding the one number an owner
 * opens the app for, what is owed across every account, with a way straight to paying it.
 */
export function HomeHero({ name, estate, units }: { name?: string; estate?: string; units: PortalUnit[] }) {
  const accounts = units.flatMap((u) => u.accounts);
  const due = accounts.reduce((s, a) => s + Math.max(0, num(a.balance)), 0);
  const credit = accounts.reduce((s, a) => s + Math.max(0, -num(a.balance)), 0);
  const firstOwing = accounts.find((a) => num(a.balance) > 0);
  const today = new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <section aria-labelledby="home-greeting" className="relative isolate overflow-hidden rounded-[1.75rem]">
      <Image src="/images/estate-palms.webp" alt="" fill priority sizes="(min-width: 1024px) 70vw, 100vw" className="-z-10 object-cover" />
      {/* A solid tint over the photo keeps the white text at full contrast. */}
      <div className="absolute inset-0 -z-10 bg-primary-dark/70" />
      <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_minmax(18rem,22rem)] lg:items-end lg:gap-8 lg:p-9">
        <div className="text-white">
          <p className="text-sm text-white/80">{today}</p>
          <h1 id="home-greeting" className="mt-1 font-serif-soft text-3xl leading-tight sm:text-4xl">{name ? `Hello, ${name}` : 'Welcome home'}</h1>
          {estate && <p className="mt-2 text-white/85">{estate}</p>}
        </div>
        <div className="rounded-2xl border border-white/30 bg-white/15 p-5 text-white backdrop-blur-xl">
          <p className="text-sm text-white/85">{due > 0 ? 'Total to pay' : 'Your accounts'}</p>
          <p className="mt-1 font-display text-3xl font-semibold tabular sm:text-4xl">{due > 0 ? kes(due) : 'All paid'}</p>
          <p className="mt-1 text-sm text-white/80">
            {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}, {units.length} {units.length === 1 ? 'unit' : 'units'}
            {credit > 0 && <>, {kes(credit)} in credit</>}
          </p>
          {firstOwing && (
            <a href={`#account-${firstOwing.id}`} className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-white font-semibold text-primary transition-colors hover:bg-white/90">
              Pay now
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/** Quick actions as large glass tiles. */
export function QuickActions({ base }: { base: string }) {
  const items: { href: string; icon: LucideIcon; label: string; hint: string }[] = [
    { href: `${base}/portal/visitors?new=1`, icon: ShieldCheck, label: 'Add a visitor', hint: 'Send a gate pass' },
    { href: `${base}/portal/requests?new=1`, icon: Wrench, label: 'Report a problem', hint: 'Leaks, faults, repairs' },
    { href: `${base}/portal/notices`, icon: Bell, label: 'Notices', hint: 'From the estate office' },
    { href: `${base}/portal/purchase`, icon: FileSignature, label: 'Purchase plan', hint: 'Instalments and balance' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((i) => (
        <Link key={i.href} href={i.href}
          className="glass group flex min-h-18 items-center gap-3 rounded-2xl p-3.5 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transform-none">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <i.icon className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{i.label}</span>
            <span className="block truncate text-xs text-muted-foreground">{i.hint}</span>
          </span>
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
      <div className="border-b border-border/60 px-5 py-4">
        <p className="font-display text-lg font-semibold">Unit {unit.code}</p>
        <p className="text-xs text-muted-foreground">{[property?.name, titleCase(unit.unit_type), label(PARTY_ROLE, link.role)].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="divide-y divide-border/60">
        {accounts.length === 0 && <p className="px-5 py-4 text-sm text-muted-foreground">No bills yet.</p>}
        {accounts.map((a) => {
          const due = num(a.balance);
          const fund = a.edges?.fund;
          return (
            <div key={a.id} id={`account-${a.id}`} className="scroll-mt-24 space-y-3 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{fund?.name ?? 'Account'} · {a.account_ref}</p>
                  <p className={due > 0 ? 'font-display text-2xl font-semibold tabular' : 'font-display text-2xl font-semibold text-success tabular'}>
                    {due > 0 ? kes(due) : due < 0 ? `${kes(-due)} credit` : 'All paid'}
                  </p>
                  {a.last_payment_at && <p className="text-xs text-muted-foreground">Last paid {fmtDate(a.last_payment_at)}</p>}
                </div>
                <Link href={`/${slug}/portal/statement/${a.id}`} className="flex min-h-11 items-center gap-1 text-sm font-medium text-primary">
                  <Receipt className="h-4 w-4" aria-hidden /> Statement
                </Link>
              </div>
              {due > 0 && (
                <PayAccount tenantSlug={slug} accountId={a.id} accountRef={a.account_ref} balance={a.balance} size="lg" email={email}
                  createIntent={(id, body) => portalApi.pay(slug, id, body)} submitManual={(id, body) => portalApi.submitManual(slug, id, body)}
                  invalidate={[qk.portal(slug)]} />
              )}
              <PayInstructionNote pay={data.pay?.[a.id]} prefix="Or pay by M-Pesa" />
            </div>
          );
        })}
        {read && (
          <div className="flex items-center gap-3 px-5 py-3.5">
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
    <Link href={href} className="glass group block rounded-2xl p-4 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transform-none">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="flex items-center gap-2.5 text-sm font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" aria-hidden /></span>
          {title}
        </p>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
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
      <Card className="gap-3 p-5 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-semibold"><FileSignature className="h-4 w-4 text-primary" aria-hidden /> Purchase plan{unitCode ? ` for ${unitCode}` : ''}</p>
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
