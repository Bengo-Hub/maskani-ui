'use client';

import { useState } from 'react';
import { Plus, Tags, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/common/empty-state';
import { CatalogueCombobox } from '@/components/common/catalogue-combobox';
import { Field } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { IconButton } from '@/components/common/icon-button';
import { PageHeader } from '@/components/common/page-header';
import { PropertyRequired, usePropertyOrSingle } from '@/components/common/property-required';
import { StatusBadge } from '@/components/common/status-badge';
import { useAccess } from '@/hooks/use-access';
import { useCreatePriceList, usePriceLists } from '@/hooks/use-sales';
import { useCatalogue } from '@/hooks/use-settings';
import { apiErrorMessage } from '@/lib/api/errors';
import type { PriceList, PriceListItem } from '@/lib/api/types';
import { apiDate, fmtDate, kes, num, titleCase, todayInput } from '@/lib/utils';

interface Row { unit_type: string; price: string; reservation_fee: string; deposit_pct: string; max_term_months: string }
const BLANK: Row = { unit_type: '', price: '', reservation_fee: '', deposit_pct: '20', max_term_months: '24' };
const itemsOf = (l: PriceList): PriceListItem[] => l.items ?? l.edges?.items ?? [];
const digits = (v: string) => v.replace(/[^\d.]/g, '');

/**
 * Price lists per property, by unit type. The active list prices the availability board, new
 * reservations and contracts; a new list put in force retires the old one (contracts keep their
 * price). Lists are never edited in place, so every price a buyer was quoted stays on record.
 */
export default function PriceListsPage() {
  const propertyId = usePropertyOrSingle();
  const { can } = useAccess();
  const { data: lists = [], isLoading } = usePriceLists(propertyId);
  // The estate's unit types (Settings, Lists): the same codes units carry, which is how a price
  // line finds its units.
  const { data: unitTypes = [] } = useCatalogue('unit_type');
  const typeName = (code?: string) => unitTypes.find((t) => t.code === code)?.name ?? titleCase(code);
  const create = useCreatePriceList(propertyId);
  const [form, setForm] = useState<{ name: string; phase: string; from: string; activate: boolean; rows: Row[] } | null>(null);
  const [error, setError] = useState('');

  if (!propertyId) return <div className="mx-auto max-w-7xl"><PageHeader title="Price lists" /><PropertyRequired what="Price lists" /></div>;
  const active = lists.find((l) => l.status === 'active');

  const startNew = () => {
    setError('');
    const rows = active ? itemsOf(active).filter((i) => i.unit_type).map((i) => ({
      unit_type: i.unit_type ?? '', price: String(num(i.price)), reservation_fee: String(num(i.reservation_fee)),
      deposit_pct: String(num(i.deposit_pct)), max_term_months: String(i.max_term_months ?? ''),
    })) : [];
    setForm({ name: '', phase: active?.phase ?? '', from: todayInput(), activate: true, rows: rows.length ? rows : [{ ...BLANK }] });
  };

  const setRow = (i: number, patch: Partial<Row>) => form && setForm({ ...form, rows: form.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  // The API takes a missing or zero deposit as 20%, so a deposit must be above 0 and at most 100.
  const rowProblem = (r: Row): string => {
    if (!r.unit_type.trim()) return 'Choose the unit type';
    if (form && form.rows.filter((x) => x.unit_type === r.unit_type).length > 1) return 'Each unit type appears once in a list';
    if (!(num(r.price) > 0)) return 'Give a price';
    if (num(r.reservation_fee) >= num(r.price)) return 'The reservation fee must be below the price';
    const dep = num(r.deposit_pct);
    if (!(dep > 0 && dep <= 100)) return 'Deposit is a percentage above 0, up to 100';
    const term = Number(r.max_term_months);
    if (r.max_term_months && !(term >= 1 && term <= 240)) return 'Longest term is 1 to 240 months';
    return '';
  };
  const valid = !!form && !!form.name.trim() && !!form.from && form.rows.length > 0 && form.rows.every((r) => !rowProblem(r));

  const submit = () => {
    if (!form || !valid) return;
    setError('');
    create.mutate({
      name: form.name.trim(), phase: form.phase.trim() || undefined, effective_from: apiDate(form.from), activate: form.activate,
      items: form.rows.map((r) => ({
        unit_type: r.unit_type.trim(), price: num(r.price), reservation_fee: num(r.reservation_fee),
        deposit_pct: num(r.deposit_pct), max_term_months: Number(r.max_term_months) || undefined,
      })),
    }, { onSuccess: () => setForm(null), onError: (e) => setError(apiErrorMessage(e)) });
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Price lists"
        subtitle="Prices by unit type. The list in force prices the availability board and new sales."
        actions={can('sales.manage') ? <Button onClick={startNew}><Plus /> New price list</Button> : undefined}
      />
      {isLoading ? <Skeleton className="h-64" /> : lists.length === 0 ? (
        <EmptyState icon={Tags} title="No price lists" description="Add a price list so units show a price and can be reserved." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {lists.map((l) => (
            <Card key={l.id}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle>{l.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{[l.phase && `Phase ${l.phase}`, `From ${fmtDate(l.effective_from)}`].filter(Boolean).join(', ')}</p>
                </div>
                <StatusBadge status={l.status} label={l.status === 'active' ? 'In force' : titleCase(l.status)} />
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr><th className="pb-1 text-left font-medium">Unit type</th><th className="pb-1 text-right font-medium">Price</th><th className="hidden pb-1 text-right font-medium sm:table-cell">Reservation fee</th><th className="pb-1 text-right font-medium">Deposit</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {itemsOf(l).map((i, k) => (
                      <tr key={k}>
                        <td className="py-1.5">{i.unit_type ? typeName(i.unit_type) : 'One unit'}</td>
                        <td className="py-1.5 text-right tabular">{kes(i.price)}</td>
                        <td className="hidden py-1.5 text-right tabular sm:table-cell">{kes(i.reservation_fee ?? 0)}</td>
                        <td className="py-1.5 text-right tabular">{num(i.deposit_pct)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FormSheet
        open={!!form}
        onOpenChange={(o) => !o && setForm(null)}
        size="xl"
        title="New price list"
        description={active ? `Starts from the prices in "${active.name}". Change what has changed.` : 'One line per unit type.'}
        footer={<>
          <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
          <Button onClick={submit} disabled={!valid || create.isPending}>{create.isPending ? 'Saving...' : form?.activate ? 'Save and put in force' : 'Save as draft'}</Button>
        </>}
      >
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Name" htmlFor="pl-name" required><Input id="pl-name" placeholder="2027 prices" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Phase" htmlFor="pl-phase"><Input id="pl-phase" value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })} /></Field>
              <Field label="Prices apply from" htmlFor="pl-from" required><Input id="pl-from" type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></Field>
            </div>
            <div className="space-y-2">
              <div className="hidden grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_2.25rem] gap-2 text-xs font-medium text-muted-foreground md:grid">
                <span>Unit type</span><span>Price (KES)</span><span>Reservation fee</span><span>Deposit %</span><span>Longest term (months)</span><span />
              </div>
              {form.rows.map((r, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border p-2 md:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_2.25rem] md:border-0 md:p-0">
                  <CatalogueCombobox kind="unit_type" className="col-span-2 md:col-span-1" value={r.unit_type} onChange={(code) => setRow(i, { unit_type: code })} placeholder="Choose a unit type" />
                  <Input aria-label="Price" inputMode="decimal" placeholder="Price" value={r.price} onChange={(e) => setRow(i, { price: digits(e.target.value) })} />
                  <Input aria-label="Reservation fee" inputMode="decimal" placeholder="Reservation fee" value={r.reservation_fee} onChange={(e) => setRow(i, { reservation_fee: digits(e.target.value) })} />
                  <Input aria-label="Deposit percent" inputMode="decimal" placeholder="Deposit %" value={r.deposit_pct} onChange={(e) => setRow(i, { deposit_pct: digits(e.target.value) })} />
                  <Input aria-label="Longest term in months" inputMode="numeric" placeholder="Months" value={r.max_term_months} onChange={(e) => setRow(i, { max_term_months: e.target.value.replace(/\D/g, '') })} />
                  <IconButton label="Remove this line" className="justify-self-end" disabled={form.rows.length === 1} onClick={() => setForm({ ...form, rows: form.rows.filter((_, j) => j !== i) })}><Trash2 /></IconButton>
                  {(r.unit_type || r.price) && rowProblem(r) && <p className="col-span-full text-xs text-destructive" role="alert">{rowProblem(r)}</p>}
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setForm({ ...form, rows: [...form.rows, { ...BLANK }] })}><Plus /> Add a unit type</Button>
            </div>
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={form.activate} onCheckedChange={(v) => setForm({ ...form, activate: !!v })} />
              Put it in force now{active ? ` (retires "${active.name}"; signed contracts keep their price)` : ''}
            </label>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </div>
        )}
      </FormSheet>
    </div>
  );
}
