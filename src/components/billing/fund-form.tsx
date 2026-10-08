'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { useUpdateFund } from '@/hooks/use-billing';
import type { Fund } from '@/lib/api/types';

/** Edits a fund's name, paybill and account prefix. A paybill change re-registers every account route. */
export function FundForm({ fund, onClose }: { fund: Fund | null; onClose: () => void }) {
  const save = useUpdateFund();
  const [f, setF] = useState({ name: '', paybill_shortcode: '', account_prefix: '' });
  useEffect(() => {
    if (fund) setF({ name: fund.name, paybill_shortcode: fund.paybill_shortcode ?? '', account_prefix: fund.account_prefix ?? '' });
  }, [fund]);

  return (
    <FormSheet
      open={!!fund}
      onOpenChange={(o) => !o && onClose()}
      size="sm"
      title={`Edit ${fund?.name ?? 'fund'}`}
      description="Residents pay this fund's bills to its paybill, with the unit's account code as the account number."
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          disabled={!f.name.trim() || save.isPending}
          onClick={() => fund && save.mutate({ id: fund.id, body: { name: f.name.trim(), paybill_shortcode: f.paybill_shortcode.trim(), account_prefix: f.account_prefix.trim() } }, { onSuccess: onClose })}
        >
          {save.isPending ? 'Saving...' : 'Save fund'}
        </Button>
      </>}
    >
      <div className="space-y-4">
        <Field label="Name" htmlFor="f-name" required><Input id="f-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Paybill number" htmlFor="f-paybill" hint="The M-Pesa paybill connected in Treasury for this fund">
          <Input id="f-paybill" inputMode="numeric" value={f.paybill_shortcode} onChange={(e) => setF({ ...f, paybill_shortcode: e.target.value })} />
        </Field>
        <Field label="Account prefix" htmlFor="f-prefix" hint={`Account numbers look like ${f.account_prefix || ''}B07`}>
          <Input id="f-prefix" value={f.account_prefix} onChange={(e) => setF({ ...f, account_prefix: e.target.value })} className="uppercase" />
        </Field>
      </div>
    </FormSheet>
  );
}
