'use client';

import { Suspense, useMemo } from 'react';
import { BarChart3, Building2, CreditCard, Droplets, Landmark, Receipt, ShieldAlert, Truck, Wrench, type LucideIcon } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { ExportButtons } from '@/components/common/export-buttons';
import { NativeSelect } from '@/components/common/field';
import { PageHeader } from '@/components/common/page-header';
import { SectionLayout, type Section } from '@/components/common/section-nav';
import { useSlug } from '@/hooks/use-access';
import { useEstateReport } from '@/hooks/use-estate-reports';
import { useUrlParam } from '@/hooks/use-url-param';
import { estateReportsApi, type EstateReport, type ReportColumn } from '@/lib/api/estate-reports';
import { currentPeriod, kes } from '@/lib/utils';
import { useSelectedPropertyId } from '@/store/property';

const KINDS = ['collections_month', 'collections_block', 'collections_charge', 'payment_channels', 'maintenance', 'vendors', 'security', 'water'] as const;
type Kind = (typeof KINDS)[number];

const META: Record<Kind, { label: string; hint: string; icon: LucideIcon }> = {
  collections_month: { label: 'Collections by month', hint: 'Billed against collected', icon: Landmark },
  collections_block: { label: 'By block', hint: 'Billed, collected and owing', icon: Building2 },
  collections_charge: { label: 'By charge', hint: 'What was billed', icon: Receipt },
  payment_channels: { label: 'Payment channels', hint: 'How money came in', icon: CreditCard },
  maintenance: { label: 'Maintenance', hint: 'Work orders by category', icon: Wrench },
  vendors: { label: 'Vendors', hint: 'Jobs, timeliness, cost', icon: Truck },
  security: { label: 'Security', hint: 'Gate traffic and incidents', icon: ShieldAlert },
  water: { label: 'Water trend', hint: 'Supplied against billed', icon: Droplets },
};

/** The last n months ending now, newest first, for the range pickers. */
function months(n: number): string[] {
  const out: string[] = [];
  const [y, m] = currentPeriod().split('-').map(Number);
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

function monthName(p: string): string {
  const [y, m] = p.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-KE', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Formats one cell by its column kind; money in full KES, never rounded parts. */
function show(c: ReportColumn, v: unknown): string {
  if (v === null || v === undefined || v === '') return '-';
  switch (c.kind) {
    case 'money': return kes(String(v));
    case 'pct': return `${v}%`;
    case 'hours': return `${v} h`;
    case 'qty': return `${v} m3`;
    case 'count': return Number(v).toLocaleString('en-KE');
    default:
      if (c.key === 'period') return monthName(String(v));
      if (c.key === 'category') return String(v).replace(/_/g, ' ').replace(/^\w/, (x) => x.toUpperCase());
      return String(v);
  }
}

export default function ReportsPage() {
  return <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-7xl" />}><Reports /></Suspense>;
}

/**
 * Estate reports: collections by month, block and charge, payment channels, maintenance, vendors,
 * security and water. Each is the API's table for the chosen months and property, with a total row,
 * and downloads as PDF or a spreadsheet with the same figures.
 */
function Reports() {
  const slug = useSlug();
  const propertyId = useSelectedPropertyId(slug);
  const options = useMemo(() => months(36), []);
  const [kind, setKind] = useUrlParam<Kind>('report', 'collections_month', KINDS);
  const [to, setTo] = useUrlParam('to', options[0]);
  const [from, setFrom] = useUrlParam('from', options[11]);
  const params = { from, to, property_id: propertyId || undefined };
  const { data, isLoading, isError, error } = useEstateReport(kind, params);

  const columns = useMemo<DataTableColumn<Record<string, unknown>>[]>(() => (data?.columns ?? []).map((c, i) => ({
    key: c.key,
    header: c.label,
    primary: i === 0,
    align: c.kind === 'text' ? undefined : 'right',
    accessor: (r) => (c.kind === 'text' ? String(r[c.key] ?? '') : Number(r[c.key] ?? 0)),
    render: (r) => <span className={c.kind === 'text' ? (i === 0 ? 'font-medium' : '') : 'tabular'}>{show(c, r[c.key])}</span>,
  })), [data?.columns]);

  const sections: Section<Kind>[] = KINDS.map((k) => ({ value: k, label: META[k].label, icon: META[k].icon, hint: META[k].hint }));
  const needsProperty = kind === 'water' && !propertyId;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title="Reports" subtitle="Collections, payments, maintenance, vendors, security and water for the months you choose."
        actions={data && !needsProperty ? (
          <ExportButtons name={`${kind}-${from}-${to}`} title={data.title} perm="reports.export"
            fetchFile={(format) => estateReportsApi.file(slug, kind, params, format)} />
        ) : undefined} />
      <SectionLayout sections={sections} value={kind} onChange={(v) => setKind(v)}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect className="w-36" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From">
              {options.filter((m) => m <= to).map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
            </NativeSelect>
            <span className="text-sm text-muted-foreground">to</span>
            <NativeSelect className="w-36" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To">
              {options.filter((m) => m >= from).map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
            </NativeSelect>
            {!propertyId && <span className="text-xs text-muted-foreground">All your properties. Pick one at the top to narrow it.</span>}
          </div>
          {needsProperty ? (
            <EmptyState icon={Droplets} title="Choose a property" description="The water trend is per property; pick one at the top of the page." />
          ) : isError ? (
            <EmptyState icon={BarChart3} title="This report could not be built" description={(error as Error)?.message ?? 'Try again in a moment.'} />
          ) : (
            <ReportTable data={data} loading={isLoading} columns={columns} />
          )}
        </div>
      </SectionLayout>
    </div>
  );
}

function ReportTable({ data, loading, columns }: { data?: EstateReport; loading: boolean; columns: DataTableColumn<Record<string, unknown>>[] }) {
  if (loading && !data) return <Skeleton className="h-64" />;
  if (!data) return null;
  const totals = data.totals;
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{data.subtitle}</p>
      <DataTable columns={columns} rows={data.rows as Record<string, unknown>[]} rowKey={(r) => String(r[data.columns[0]?.key] ?? '')}
        emptyText="Nothing in these months." storageKey={`maskani-report-${data.kind}`} maxBodyHeight={false} />
      {totals && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-xl bg-muted/50 px-4 py-2 text-sm">
          <span className="font-semibold">Total</span>
          {data.columns.slice(1).filter((c) => totals[c.key] !== undefined).map((c) => (
            <span key={c.key}><span className="text-muted-foreground">{c.label}: </span><span className="font-medium tabular">{show(c, totals[c.key])}</span></span>
          ))}
        </div>
      )}
      {data.note && <p className="text-xs text-muted-foreground">{data.note}</p>}
    </div>
  );
}
