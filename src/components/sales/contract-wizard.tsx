'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { PartyPicker } from '@/components/register/party-picker';
import { useSlug } from '@/hooks/use-access';
import { useCreateContract } from '@/hooks/use-sales';
import type { AvailabilityUnit, ContractInput, Party } from '@/lib/api/types';
import { kes, num } from '@/lib/utils';

type Option = ContractInput['payment_option'];

/**
 * Draft sale contract: buyer, price and discount, deposit, payment option and term. The API builds
 * the schedule on activation (the last instalment absorbs rounding so the total equals net price).
 */
export function ContractWizard({ unit, onClose }: { unit: AvailabilityUnit | null; onClose: () => void }) {
  const slug = useSlug();
  const router = useRouter();
  const create = useCreateContract();
  const [buyer, setBuyer] = useState<Party | null>(null);
  const [f, setF] = useState({ price: '', discount: '', discount_reason: '', deposit: '', option: 'instalments' as Option, term: '24', frequency: 'monthly' });

  useEffect(() => {
    if (!unit) return;
    const price = num(unit.price);
    const pct = num(unit.deposit_pct) || 20;
    setBuyer(null);
    setF({ price: price ? String(price) : '', discount: '', discount_reason: '', deposit: price ? String(Math.round((price * pct) / 100)) : '', option: 'instalments', term: '24', frequency: 'monthly' });
  }, [unit]);

  const net = useMemo(() => Math.max(0, (Number(f.price) || 0) - (Number(f.discount) || 0)), [f.price, f.discount]);
  const perInstalment = useMemo(() => {
    const months = Number(f.term) || 0;
    if (f.option !== 'instalments' || months <= 0) return null;
    const count = f.frequency === 'quarterly' ? Math.ceil(months / 3) : months;
    return count > 0 ? (net - (Number(f.deposit) || 0)) / count : null;
  }, [f.option, f.term, f.frequency, net, f.deposit]);

  if (!unit) return null;
  const valid = buyer && Number(f.price) > 0 && net > 0 && (f.option !== 'instalments' || Number(f.term) > 0);

  const submit = () => {
    if (!valid || !buyer) return;
    create.mutate({
      unit_id: unit.id, buyer_id: buyer.id, price: Number(f.price),
      discount: Number(f.discount) || undefined, discount_reason: f.discount_reason.trim() || undefined,
      deposit_amount: Number(f.deposit) || undefined, payment_option: f.option,
      ...(f.option === 'instalments' ? { term_months: Number(f.term), frequency: f.frequency } : {}),
    }, { onSuccess: (c) => { onClose(); router.push(`/${slug}/sales/contracts/${c.id}`); } });
  };

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={`Sale of unit ${unit.code}`}
      description="Creates a draft. Activate it once the agreement is signed."
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={!valid || create.isPending}>{create.isPending ? 'Saving...' : 'Create draft'}</Button>
      </>}
    >
      <div className="space-y-5">
        <Field label="Buyer"><PartyPicker value={buyer} onChange={setBuyer} /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Price (KES)" htmlFor="cw-price" required><Input id="cw-price" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field>
          <Field label="Discount (KES)" htmlFor="cw-disc"><Input id="cw-disc" inputMode="decimal" value={f.discount} onChange={(e) => setF({ ...f, discount: e.target.value })} /></Field>
          {Number(f.discount) > 0 && <Field label="Reason for discount" htmlFor="cw-dr" className="sm:col-span-2"><Input id="cw-dr" value={f.discount_reason} onChange={(e) => setF({ ...f, discount_reason: e.target.value })} /></Field>}
          <Field label="Deposit (KES)" htmlFor="cw-dep"><Input id="cw-dep" inputMode="decimal" value={f.deposit} onChange={(e) => setF({ ...f, deposit: e.target.value })} /></Field>
          <Field label="How they pay" htmlFor="cw-opt">
            <NativeSelect id="cw-opt" value={f.option} onChange={(e) => setF({ ...f, option: e.target.value as Option })}>
              <option value="instalments">Instalments</option>
              <option value="outright">Outright</option>
              <option value="milestone">By construction milestone</option>
              <option value="financed">Mortgage or SACCO</option>
            </NativeSelect>
          </Field>
          {f.option === 'instalments' && (
            <>
              <Field label="Term (months)" htmlFor="cw-term" hint={unit.price_list_item_id ? 'Price list maximum applies' : undefined}><Input id="cw-term" inputMode="numeric" value={f.term} onChange={(e) => setF({ ...f, term: e.target.value })} /></Field>
              <Field label="Every" htmlFor="cw-freq">
                <NativeSelect id="cw-freq" value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })}>
                  <option value="monthly">Month</option>
                  <option value="quarterly">Quarter</option>
                </NativeSelect>
              </Field>
            </>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-3 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-muted-foreground">Net price</dt><dd className="font-semibold tabular">{kes(net)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Deposit</dt><dd className="font-semibold tabular">{kes(Number(f.deposit) || 0)}</dd></div>
          {perInstalment != null && <div><dt className="text-xs text-muted-foreground">About each instalment</dt><dd className="font-semibold tabular">{kes(Math.max(0, Math.round(perInstalment)))}</dd></div>}
        </dl>
      </div>
    </FormSheet>
  );
}
