'use client';

import { useMemo, useState } from 'react';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { Field } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { PageHeader } from '@/components/common/page-header';
import { PropertyRequired, usePropertyOrSingle } from '@/components/common/property-required';
import { StatusBadge } from '@/components/common/status-badge';
import { PartyPicker } from '@/components/register/party-picker';
import { ContractWizard } from '@/components/sales/contract-wizard';
import { useAccess } from '@/hooks/use-access';
import { useAvailability, useReserve, useSalesPosition } from '@/hooks/use-sales';
import type { AvailabilityUnit, Party } from '@/lib/api/types';
import { label, SALE_STATUS } from '@/lib/labels';
import { cn, kes, num, titleCase } from '@/lib/utils';

const TILE: Record<string, string> = {
  available: 'border-success/40 bg-success/10',
  reserved: 'border-gold/50 bg-gold/15',
  under_agreement: 'border-sky-300 bg-sky-50 dark:bg-sky-950',
  in_default: 'border-destructive/40 bg-destructive/10',
};

export default function AvailabilityPage() {
  const propertyId = usePropertyOrSingle();
  const { can } = useAccess();
  const { data: units = [], isLoading } = useAvailability(propertyId);
  const { data: position } = useSalesPosition(propertyId);
  const reserve = useReserve(propertyId);
  const [picked, setPicked] = useState<AvailabilityUnit | null>(null);
  const [contractFor, setContractFor] = useState<AvailabilityUnit | null>(null);
  const [reserving, setReserving] = useState(false);
  const [buyer, setBuyer] = useState<Party | null>(null);
  const [days, setDays] = useState('14');

  const blocks = useMemo(() => {
    const m = new Map<string, AvailabilityUnit[]>();
    for (const u of units) {
      const k = u.edges?.block?.name || u.edges?.block?.code || u.phase || 'Units';
      m.set(k, [...(m.get(k) ?? []), u]);
    }
    return [...m.entries()].map(([k, list]) => [k, list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))] as const);
  }, [units]);

  if (!propertyId) return <div className="mx-auto max-w-7xl"><PageHeader title="Availability" /><PropertyRequired what="Units for sale" /></div>;
  const free = picked?.sale_status === 'available';

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Availability" subtitle="Tap a unit to reserve it or start a sale" />
      {position && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="p-4"><p className="text-xs text-muted-foreground">Available</p><p className="font-display text-xl font-semibold tabular">{position.by_status?.available ?? 0}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">Reserved or under agreement</p><p className="font-display text-xl font-semibold tabular">{(position.by_status?.reserved ?? 0) + (position.by_status?.under_agreement ?? 0)}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">Contract value</p><p className="font-display text-xl font-semibold tabular">{kes(position.contract_value)}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">Collected</p><p className="font-display text-xl font-semibold tabular">{kes(position.collected)}</p></Card>
        </div>
      )}
      {isLoading ? <Skeleton className="h-64" /> : units.length === 0 ? <EmptyState icon={Home} title="No units" description="Add units and a price list to see availability." /> : (
        <div className="space-y-5">
          {blocks.map(([block, list]) => (
            <section key={block}>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{block}</h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
                {list.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setPicked(u)}
                    className={cn('flex flex-col items-start rounded-lg border p-2 text-left transition-colors hover:border-primary', TILE[u.sale_status ?? ''] ?? 'bg-muted/50')}
                  >
                    <span className="font-semibold">{u.code}</span>
                    <span className="text-[11px] text-muted-foreground">{u.bedrooms != null ? `${u.bedrooms} bed` : titleCase(u.unit_type)}</span>
                    {u.sale_status === 'available' && num(u.price) > 0 && <span className="text-[11px] font-medium tabular">{kes(u.price)}</span>}
                  </button>
                ))}
              </div>
            </section>
          ))}
          <p className="text-xs text-muted-foreground">Green: available. Gold: reserved. Blue: under agreement. Grey: sold or not for sale.</p>
        </div>
      )}

      <FormSheet
        open={!!picked && !reserving}
        onOpenChange={(o) => !o && setPicked(null)}
        size="sm"
        title={picked ? `Unit ${picked.code}` : ''}
        footer={picked && free && can('sales.manage') ? <>
          <Button variant="outline" onClick={() => { setBuyer(null); setDays('14'); setReserving(true); }}>Reserve</Button>
          <Button onClick={() => { setContractFor(picked); setPicked(null); }}>Start sale</Button>
        </> : undefined}
      >
        {picked && (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-muted-foreground">Status</dt><dd><StatusBadge status={picked.sale_status} label={label(SALE_STATUS, picked.sale_status)} /></dd></div>
            <div><dt className="text-xs text-muted-foreground">Type</dt><dd>{titleCase(picked.unit_type)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Price</dt><dd className="font-semibold tabular">{num(picked.price) > 0 ? kes(picked.price) : 'No price list'}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Reservation fee</dt><dd className="tabular">{kes(picked.reservation_fee ?? 0)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Deposit</dt><dd>{num(picked.deposit_pct) || 0}%</dd></div>
            <div><dt className="text-xs text-muted-foreground">Size</dt><dd>{picked.size_sqm ? `${num(picked.size_sqm)} m2` : ''}</dd></div>
          </dl>
        )}
      </FormSheet>

      <FormSheet
        open={reserving}
        onOpenChange={setReserving}
        size="md"
        title={`Reserve ${picked?.code ?? ''}`}
        footer={<>
          <Button variant="outline" onClick={() => setReserving(false)}>Cancel</Button>
          <Button
            disabled={!buyer || !picked || reserve.isPending}
            onClick={() => picked && buyer && reserve.mutate({ unit_id: picked.id, party_id: buyer.id, days: Number(days) || 14 }, { onSuccess: () => { setReserving(false); setPicked(null); } })}
          >
            {reserve.isPending ? 'Reserving...' : 'Reserve'}
          </Button>
        </>}
      >
        <div className="space-y-4">
          <Field label="Buyer"><PartyPicker value={buyer} onChange={setBuyer} /></Field>
          <Field label="Hold for (days)" htmlFor="rs-days"><Input id="rs-days" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} /></Field>
        </div>
      </FormSheet>

      <ContractWizard unit={contractFor} onClose={() => setContractFor(null)} />
    </div>
  );
}
