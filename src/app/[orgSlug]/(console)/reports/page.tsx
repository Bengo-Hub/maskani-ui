'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Building2, Droplets, Eye, LayoutGrid, Landmark, ShieldAlert, Truck, Wrench, type LucideIcon } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { ExportButtons } from '@/components/common/export-buttons';
import { NativeSelect } from '@/components/common/field';
import { PageHeader } from '@/components/common/page-header';
import { SectionLayout, type Section } from '@/components/common/section-nav';
import { useSlug } from '@/hooks/use-access';
import { useEstateReport, useReportCatalog } from '@/hooks/use-estate-reports';
import { useUrlParam } from '@/hooks/use-url-param';
import { estateReportsApi, type CatalogReport, type EstateReport, type ReportColumn, type ReportParams } from '@/lib/api/estate-reports';
import { currentPeriod, kes } from '@/lib/utils';
import { useSelectedPropertyId } from '@/store/property';

const MODULE_ICONS: Record<string, LucideIcon> = {
  billing: Landmark, utilities: Droplets, maintenance: Wrench, providers: Truck, gate: ShieldAlert, register: Building2,
};

/** The last n months ending now, newest first, for the range pickers. */
function months(n: number): string[] {
  const out: string[] = [];
  const [y, m] = currentPeriod().split('-').map(Number);
  for (let i = 0; i < n; i++) out.push(new Date(Date.UTC(y, m - 1 - i, 1)).toISOString().slice(0, 7));
  return out;
}

function monthName(p: string): string {
  const [y, m] = p.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-KE', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Formats one cell by its column kind; money in full KES. */
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
 * The one Reports module: every report Maskani offers, grouped by module (the API's catalog, already
 * narrowed to the modules the estate runs and the caller's rights), the same pattern as TruLoad's
 * reporting page. Pick a module, open a report to see its table, or download it as PDF, Excel or CSV
 * for the months and property chosen.
 */
function Reports() {
  const slug = useSlug();
  const propertyId = useSelectedPropertyId(slug);
  const { data: modules = [], isLoading } = useReportCatalog();
  const options = useMemo(() => months(36), []);
  const [module, setModule] = useUrlParam('module', 'all');
  const [reportId, setReportId] = useUrlParam('report', '');
  const [to, setTo] = useUrlParam('to', options[0]);
  const [from, setFrom] = useUrlParam('from', options[11]);
  const [period, setPeriod] = useUrlParam('period', options[1]);

  const all = useMemo(() => modules.flatMap((m) => m.reports), [modules]);
  const open = all.find((r) => r.id === reportId);
  const shown = module === 'all' ? all : all.filter((r) => r.module === module);
  const sections: Section<string>[] = [
    { value: 'all', label: 'All reports', icon: LayoutGrid, count: all.length },
    ...modules.map((m) => ({ value: m.module, label: m.display_name, icon: MODULE_ICONS[m.module] ?? BarChart3, count: m.reports.length })),
  ];
  const params = (r: CatalogReport): ReportParams => ({
    property_id: propertyId || undefined,
    ...(r.filters.includes('range') ? { from, to } : {}),
    ...(r.filters.includes('period') ? { period } : {}),
  });

  const rangePickers = (
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
  );

  if (open) {
    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <PageHeader title={open.name} subtitle={open.description}
          back={{ href: `/${slug}/reports?module=${open.module}`, label: 'Reports' }}
          actions={!(open.needs_property && !propertyId) ? (
            <ExportButtons name={`${open.id}-${from}-${to}`} title={open.name} perm="reports.export"
              fetchFile={(format) => estateReportsApi.file(slug, open, params(open), format)} />
          ) : undefined} />
        {rangePickers}
        {open.needs_property && !propertyId
          ? <EmptyState icon={Droplets} title="Choose a property" description="This report is per property; pick one at the top of the page." />
          : <EstateReportView kind={open.id} params={params(open)} />}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title="Reports" subtitle="Every report in one place: open it on screen or download it for the board, auditors or owners." />
      <SectionLayout sections={sections} value={module} onChange={(v) => setModule(v, { report: null })}>
        <div className="space-y-4">
          {rangePickers}
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
          ) : shown.length === 0 ? (
            <EmptyState icon={BarChart3} title="No reports here" description="Reports appear for the modules your estate runs." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((r) => {
                const Icon = MODULE_ICONS[r.module] ?? BarChart3;
                const blocked = r.needs_property && !propertyId;
                return (
                  <Card key={r.id} className="flex flex-col gap-3 p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" aria-hidden /></span>
                      <div className="min-w-0">
                        <p className="font-semibold">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{modules.find((m) => m.module === r.module)?.display_name}</p>
                      </div>
                    </div>
                    <p className="flex-1 text-sm text-muted-foreground">{r.description}</p>
                    {r.filters.includes('period') && (
                      <NativeSelect className="w-40" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Month">
                        {options.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
                      </NativeSelect>
                    )}
                    {blocked && <p className="text-xs text-muted-foreground">Pick a property at the top to run this one.</p>}
                    <div className="flex flex-wrap items-center gap-2">
                      {r.source === 'estate' && (
                        <Button size="sm" variant="outline" disabled={blocked} onClick={() => setReportId(r.id)}><Eye /> Open</Button>
                      )}
                      {r.source === 'arrears' && (
                        <Link href={`/${slug}/collections?tab=arrears`} className={buttonVariants({ size: 'sm', variant: 'outline' })}><Eye /> Open</Link>
                      )}
                      {!blocked && (
                        <ExportButtons name={`${r.id}`} title={r.name} perm="reports.export"
                          fetchFile={(format) => estateReportsApi.file(slug, r, params(r), format)} />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </SectionLayout>
    </div>
  );
}

/** An estate report's table with its total row and note. */
function EstateReportView({ kind, params }: { kind: string; params: ReportParams }) {
  const { data, isLoading, isError, error } = useEstateReport(kind, params);
  const columns = useMemo<DataTableColumn<Record<string, unknown>>[]>(() => (data?.columns ?? []).map((c, i) => ({
    key: c.key,
    header: c.label,
    primary: i === 0,
    align: c.kind === 'text' ? undefined : 'right',
    accessor: (r) => (c.kind === 'text' ? String(r[c.key] ?? '') : Number(r[c.key] ?? 0)),
    render: (r) => <span className={c.kind === 'text' ? (i === 0 ? 'font-medium' : '') : 'tabular'}>{show(c, r[c.key])}</span>,
  })), [data?.columns]);
  if (isError) return <EmptyState icon={BarChart3} title="This report could not be built" description={(error as Error)?.message ?? 'Try again in a moment.'} />;
  if (isLoading && !data) return <Skeleton className="h-64" />;
  if (!data) return null;
  return <ReportTable data={data} columns={columns} />;
}

function ReportTable({ data, columns }: { data: EstateReport; columns: DataTableColumn<Record<string, unknown>>[] }) {
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
