'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { useUpdateFund } from '@/hooks/use-billing';
import type { Fund } from '@/lib/api/types';

/**
 * Edits a fund's name, paybill, account prefix and paybill account format. A paybill or format
 * change re-registers every account route. A bank paybill (Lockwood: Paybill 222111) takes the
 * estate's bank account as the account number, with or without the unit reference after a '#'.
 */
export function FundForm({ fund, onClose }: { fund: Fund | null; onClose: () => void }) {
  const save = useUpdateFund();
  const [f, setF] = useState({ name: '', paybill_shortcode: '', account_prefix: '', format: '' });
  useEffect(() => {
    if (fund) {
      const format = typeof fund.metadata?.paybill_account_format === 'string' ? fund.metadata.paybill_account_format : '';
      setF({ name: fund.name, paybill_shortcode: fund.paybill_shortcode ?? '', account_prefix: fund.account_prefix ?? '', format });
    }
  }, [fund]);
  const sample = `${f.account_prefix}B07`;
  const format = f.format.trim();
  const formatOk = format.length <= 40 && format.split('{ref}').length <= 2;
  const preview = !format || format === '{ref}' ? `account ${sample}`
    : format.includes('{ref}') ? `account ${format.replace('{ref}', sample)}` : `account ${format}, reference ${sample}`;

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
          disabled={!f.name.trim() || !formatOk || save.isPending}
          onClick={() => fund && save.mutate({ id: fund.id, body: { name: f.name.trim(), paybill_shortcode: f.paybill_shortcode.trim(), account_prefix: f.account_prefix.trim(), paybill_account_format: format } }, { onSuccess: onClose })}
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
        <Field label="Paybill account number" htmlFor="f-format" error={formatOk ? undefined : 'Use the bank account, with {ref} at most once'}
          hint={`Leave empty when each unit's account code is the account number. For a bank paybill, enter the bank account (2362010), or 2362010#{ref} when the bank takes the unit after a #. Owners will see: Paybill ${f.paybill_shortcode || '...'}, ${preview}`}>
          <Input id="f-format" value={f.format} placeholder="{ref}" onChange={(e) => setF({ ...f, format: e.target.value })} className="font-mono" />
        </Field>
      </div>
    </FormSheet>
  );
}
