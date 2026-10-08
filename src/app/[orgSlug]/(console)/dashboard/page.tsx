'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Building2, Droplets, FileSignature, Landmark, Truck, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { PeriodPicker } from '@/components/common/period-picker';
import { StatTile } from '@/components/common/stat-tile';
import { CollectionsChart } from '@/components/dashboard/collections-chart';
import { ArrearsAgeing } from '@/components/dashboard/arrears-ageing';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useDashboard, useTopArrears } from '@/hooks/use-reports';
import { currentPeriod, fmtDate, kes, num, periodLabel } from '@/lib/utils';
import { useSelectedPropertyId } from '@/store/property';
import { useAuthStore } from '@/store/auth';

export default function DashboardPage() {
  const slug = useSlug();
  const propertyId = useSelectedPropertyId(slug);
  const [period, setPeriod] = useState(currentPeriod);
  const { mod } = useAccess();
  const me = useAuthStore((s) => s.me);
  const { data, isLoading } = useDashboard(propertyId, period);
  const { data: arrears = [] } = useTopArrears(propertyId);
  const base = `/${slug}`;

  const billed = num(data?.billed);
  const collected = num(data?.collected);
  const month = periodLabel(period).split(' ')[0];
  const firstName = me?.user?.name?.split(' ')[0];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Dashboard"
        subtitle={firstName ? `Signed in as ${firstName}` : undefined}
        actions={<PeriodPicker value={period} onChange={setPeriod} />}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {mod('billing') && (
          <StatTile
            icon={Landmark}
            label={`${month} collections`}
            loading={isLoading}
            value={kes(collected)}
            detail={<>of {kes(billed)} billed{billed > 0 && <> ({Math.round((collected / billed) * 100)}%)</>}</>}
            progress={billed > 0 ? collected / billed : null}
            href={`${base}/billing/accounts`}
          />
        )}
        {mod('billing') && (
          <StatTile
            icon={AlertTriangle}
            label="Arrears over 60 days"
            loading={isLoading}
            tone={(data?.arrears_60_accounts ?? 0) > 0 ? 'warning' : 'default'}
            value={`${data?.arrears_60_accounts ?? 0} ${data?.arrears_60_accounts === 1 ? 'unit' : 'units'}`}
            detail={<>{kes(data?.arrears_60_amount)} outstanding. Total owing {kes(data?.outstanding)}</>}
            href={`${base}/collections?tab=arrears`}
          />
        )}
        {mod('maintenance') && (
          <StatTile
            icon={Wrench}
            label="Work orders"
            loading={isLoading}
            tone={(data?.past_sla ?? 0) > 0 ? 'danger' : 'default'}
            value={`${data?.open_work_orders ?? 0} open`}
            detail={`${data?.past_sla ?? 0} past their response time`}
            href={`${base}/works`}
          />
        )}
        {mod('utilities') && (
          <StatTile
            icon={Droplets}
            label="Water loss"
            loading={isLoading}
            value={data?.water_loss_pct == null ? 'No readings' : `${num(data.water_loss_pct).toFixed(1)}%`}
            detail={`Supplied but not billed, ${month}`}
            href={`${base}/utilities/water`}
          />
        )}
        <StatTile
          icon={Building2}
          label="Units"
          loading={isLoading}
          value={`${data?.occupied ?? 0} of ${data?.units ?? 0} occupied`}
          detail={mod('sales') ? `${data?.units_sold ?? 0} sold` : undefined}
          href={`${base}/units`}
        />
        {(mod('providers') || mod('maintenance')) && (
          <StatTile
            icon={Truck}
            label="Vendors due for renewal"
            loading={isLoading}
            tone={(data?.vendors_due_for_renewal ?? 0) > 0 ? 'warning' : 'default'}
            value={data?.vendors_due_for_renewal ?? 0}
            detail="Documents expiring in the next 30 days"
            href={`${base}/vendors`}
          />
        )}
        {mod('sales') && (
          <StatTile
            icon={FileSignature}
            label="Sales collected"
            loading={isLoading}
            value={kes(data?.sales_collected)}
            detail={<>of {kes(data?.sales_value)} contract value</>}
            progress={num(data?.sales_value) > 0 ? num(data?.sales_collected) / num(data?.sales_value) : null}
            href={`${base}/sales/contracts`}
          />
        )}
      </div>

      {mod('billing') && (
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Billed and collected by week</CardTitle>
              <CardDescription>{periodLabel(period)}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64 w-full" /> : data?.collections_by_week?.length ? (
                <CollectionsChart weeks={data.collections_by_week} />
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">No bills or payments in this month yet.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Arrears by age</CardTitle>
              <CardDescription>Owing balances by days since due</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-40 w-full" /> : data?.arrears_ageing?.length ? (
                <ArrearsAgeing buckets={data.arrears_ageing} />
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">No arrears.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {mod('billing') && arrears.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Largest balances</CardTitle>
            <CardDescription><Link href={`${base}/collections?tab=arrears`} className="text-primary hover:underline">See all arrears</Link></CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {arrears.map((a) => (
                <li key={a.account_id}>
                  <Link href={`${base}/billing/accounts/${a.account_id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 sm:px-6">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.account_ref} <span className="font-normal text-muted-foreground">{a.customer_name}</span></p>
                      <p className="text-xs text-muted-foreground">{a.last_payment_at ? `Last paid ${fmtDate(a.last_payment_at)}` : 'No payment yet'}</p>
                    </div>
                    <span className="shrink-0 font-medium tabular">{kes(a.balance)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
