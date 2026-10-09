'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight, Droplets, FileSignature, Landmark, ShieldCheck, Wrench, type LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccess } from '@/hooks/use-access';
import { useRoleSummary } from '@/hooks/use-reports';
import type { RoleSummary } from '@/lib/api/insights';
import { cn, kes, num, periodLabel } from '@/lib/utils';

type Row = { label: string; value: ReactNode; href: string; attention?: boolean };

/**
 * What each role acts on today, from one GET /reports/role-summary. A panel shows only when the
 * caller holds its permission and the module is on, so a caretaker sees the reading round, a guard
 * the gate, finance its queues. Rows needing action carry the word "Needs action", not colour alone.
 */
type PanelKey = keyof Omit<RoleSummary, 'period'>;

/** The panels a caller sees: permission held and module switched on. */
export function rolePanels(can: (p: string) => boolean, mod: (m: string) => boolean): PanelKey[] {
  return ([
    mod('utilities') && can('utilities.read') && 'readings',
    mod('maintenance') && can('works.view') && 'works',
    mod('gate') && can('gate.view') && 'gate',
    mod('billing') && (can('billing.collect') || can('billing.view')) && 'finance',
    mod('sales') && can('sales.view') && 'sales',
  ] as const).filter((p): p is PanelKey => !!p);
}

export function RoleFocus({ propertyId, base }: { propertyId: string; base: string }) {
  const { can, mod } = useAccess();
  const panels = rolePanels(can, mod);
  const { data, isLoading } = useRoleSummary(propertyId, panels.length > 0);

  if (panels.length === 0) return null;

  return (
    <section aria-labelledby="today-heading" className="mb-5">
      <h2 id="today-heading" className="mb-2 text-sm font-medium text-muted-foreground">Your queues today</h2>
      <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', panels.length >= 3 && 'xl:grid-cols-3')}>
        {panels.map((p) => {
          const spec = data ? PANELS[p](data, base) : null;
          const meta = META[p];
          return (
            <FocusPanel key={p} icon={meta.icon} title={meta.title} loading={isLoading && !data} spec={spec} />
          );
        })}
      </div>
    </section>
  );
}

const META: Record<PanelKey, { icon: LucideIcon; title: string }> = {
  readings: { icon: Droplets, title: 'Meter reading round' },
  works: { icon: Wrench, title: 'Maintenance queue' },
  gate: { icon: ShieldCheck, title: 'At the gate today' },
  finance: { icon: Landmark, title: 'Finance queues' },
  sales: { icon: FileSignature, title: 'Sales follow-ups' },
};

type Spec = { headline: ReactNode; caption: ReactNode; href: string; progress?: number | null; rows: Row[] };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const PANELS: Record<PanelKey, (d: RoleSummary, base: string) => Spec> = {
  readings: ({ readings: r, period }, base) => {
    const left = Math.max(0, r.meters - r.read);
    return {
      headline: `${r.read} of ${r.meters}`,
      caption: r.meters === 0 ? 'No active unit meters' : left === 0 ? `All meters read for ${periodLabel(period)}` : `meters read, ${left} still to read for ${periodLabel(period)}`,
      href: `${base}/utilities/readings`,
      progress: r.meters > 0 ? r.read / r.meters : null,
      rows: [
        { label: 'Marked for a recheck', value: r.to_recheck, href: `${base}/utilities/readings`, attention: r.to_recheck > 0 },
        { label: 'Waiting for review', value: r.pending_review, href: `${base}/utilities/readings`, attention: r.pending_review > 0 },
      ],
    };
  },
  works: ({ works: w }, base) => ({
    headline: `${w.open} open`,
    caption: w.open === 0 ? 'Nothing waiting' : `${plural(w.urgent_open, 'urgent request')} among them`,
    href: `${base}/works`,
    rows: [
      { label: 'Past their due time', value: w.past_due, href: `${base}/works`, attention: w.past_due > 0 },
      { label: 'Urgent or emergency', value: w.urgent_open, href: `${base}/works`, attention: w.urgent_open > 0 },
      { label: 'Done, awaiting confirmation', value: w.awaiting_confirmation, href: `${base}/works` },
    ],
  }),
  gate: ({ gate: g }, base) => ({
    headline: plural(g.entries_today, 'entry', 'entries'),
    caption: `${plural(g.active_passes, 'visitor pass', 'visitor passes')} valid right now`,
    href: `${base}/security/log`,
    rows: [
      { label: 'Walk-ins waiting for a resident', value: g.walk_ins_pending, href: `${base}/security/log`, attention: g.walk_ins_pending > 0 },
      { label: 'Open incidents', value: g.open_incidents, href: `${base}/security/incidents`, attention: g.open_incidents > 0 },
      { label: 'Tablets not seen in 15 minutes', value: g.tablets_offline, href: `${base}/security/devices`, attention: g.tablets_offline > 0 },
    ],
  }),
  finance: ({ finance: f }, base) => ({
    headline: kes(f.owing),
    caption: `owed across ${plural(f.accounts_owing, 'unit account')}`,
    href: `${base}/collections?tab=arrears`,
    rows: [
      { label: 'Bill lines that failed to post', value: f.failed_bill_lines, href: `${base}/billing/runs`, attention: f.failed_bill_lines > 0 },
      { label: 'Accounts with a balance', value: f.accounts_owing, href: `${base}/collections?tab=arrears` },
    ],
  }),
  sales: ({ sales: s }, base) => ({
    headline: kes(s.overdue_amount),
    caption: num(s.overdue_amount) > 0 ? `overdue on ${plural(s.instalments_overdue, 'instalment')}` : 'No instalment overdue',
    href: `${base}/sales/contracts`,
    rows: [
      { label: 'Contracts in default', value: s.contracts_in_default, href: `${base}/sales/contracts`, attention: s.contracts_in_default > 0 },
      { label: 'Holds expiring within 3 days', value: s.holds_expiring_3d, href: `${base}/sales`, attention: s.holds_expiring_3d > 0 },
      { label: 'Overdue instalments', value: s.instalments_overdue, href: `${base}/sales/contracts` },
    ],
  }),
};

function FocusPanel({ icon: Icon, title, loading, spec }: { icon: LucideIcon; title: string; loading: boolean; spec: Spec | null }) {
  return (
    <div className="flex flex-col rounded-xl border bg-card">
      <Link href={spec?.href ?? '#'} className="group flex flex-col gap-2 rounded-t-xl p-4 hover:bg-muted/40">
        <span className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" aria-hidden /> {title}</span>
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
        {loading || !spec ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <>
            <span className="font-display text-2xl font-semibold tabular">{spec.headline}</span>
            <span className="text-xs text-muted-foreground">{spec.caption}</span>
            {typeof spec.progress === 'number' && (
              <span className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Share of meters read"
                aria-valuenow={Math.round(spec.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                <span className="block h-full rounded-full bg-gold" style={{ width: `${Math.min(100, spec.progress * 100)}%` }} />
              </span>
            )}
          </>
        )}
      </Link>
      <ul className="mt-auto divide-y border-t">
        {(spec?.rows ?? []).map((r) => (
          <li key={r.label}>
            <Link href={r.href} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-muted/40">
              <span className="min-w-0">
                <span className="block truncate">{r.label}</span>
                {r.attention && <span className="text-xs font-medium text-warning">Needs action</span>}
              </span>
              <span className={cn('shrink-0 font-medium tabular', r.attention ? 'text-foreground' : 'text-muted-foreground')}>{r.value}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
