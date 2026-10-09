'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { PeriodPicker } from '@/components/common/period-picker';
import { useSlug } from '@/hooks/use-access';
import { useFunds, useIssueRun, usePreviewRun } from '@/hooks/use-billing';
import { useProperties } from '@/hooks/use-register';
import type { BillingPreview } from '@/lib/api/types';
import { apiDate, currentPeriod, kes, num, periodLabel } from '@/lib/utils';
import { useSelectedPropertyId } from '@/store/property';

/** Due date default: the 10th of the period month (SRDD billing cycle), as a date input value. */
function defaultDue(period: string): string {
  return `${period}-10`;
}

export function RunWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const slug = useSlug();
  const router = useRouter();
  const selected = useSelectedPropertyId(slug);
  const { data: properties = [] } = useProperties();
  const { data: funds = [] } = useFunds();
  const [propertyId, setPropertyId] = useState('');
  const [fund, setFund] = useState('estate');
  const [period, setPeriod] = useState(currentPeriod);
  const [due, setDue] = useState(defaultDue(currentPeriod()));
  const [preview, setPreview] = useState<BillingPreview | null>(null);
  const previewRun = usePreviewRun();
  const issue = useIssueRun();

  // Effects depend on primitives only: a `= []` default is a new array each render (React #185).
  const onlyPropertyId = properties.length === 1 ? properties[0].id : '';
  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setPropertyId('');
  }, [open]);
  useEffect(() => {
    if (open) setPropertyId((cur) => cur || selected || onlyPropertyId);
  }, [open, selected, onlyPropertyId]);
  useEffect(() => { setDue(defaultDue(period)); setPreview(null); }, [period]);

  const billable = useMemo(() => preview?.lines.filter((l) => !l.skip_reason) ?? [], [preview]);
  const skipped = useMemo(() => preview?.lines.filter((l) => !!l.skip_reason) ?? [], [preview]);
  const input = { property_id: propertyId, fund, period, due_date: due ? apiDate(due) : undefined };

  const runPreview = () => previewRun.mutate(input, { onSuccess: setPreview });
  const runIssue = () => issue.mutate(input, {
    onSuccess: (run) => { onOpenChange(false); router.push(`/${slug}/billing/runs/${run.id}`); },
  });

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      size={preview ? 'xl' : 'md'}
      title={preview ? `Bills for ${periodLabel(period)}` : 'New billing run'}
      description={preview ? `${preview.billable} units to bill, ${preview.skipped} skipped. Total ${kes(preview.total)}.` : 'Choose the property, fund and month, then check the preview before issuing.'}
      footer={preview ? <>
        <Button variant="outline" onClick={() => setPreview(null)}>Back</Button>
        <Button onClick={runIssue} disabled={issue.isPending || billable.length === 0}>
          {issue.isPending ? 'Issuing...' : `Issue ${billable.length} bills`}
        </Button>
      </> : <>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={runPreview} disabled={!propertyId || previewRun.isPending}>{previewRun.isPending ? 'Calculating...' : 'Preview bills'}</Button>
      </>}
    >
      {!preview ? (
        <div className="space-y-4">
          <Field label="Property" htmlFor="r-prop" required>
            <NativeSelect id="r-prop" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              <option value="">Choose a property</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Fund" htmlFor="r-fund" hint="Each fund has its own paybill and account">
            <NativeSelect id="r-fund" value={fund} onChange={(e) => setFund(e.target.value)}>
              {(funds.length ? funds : [{ id: 'estate', code: 'estate', name: 'Estate fund' }]).map((f) => (
                <option key={f.id} value={f.code ?? 'estate'}>{f.name}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Month">
            <PeriodPicker value={period} onChange={setPeriod} />
          </Field>
          <Field label="Due date" htmlFor="r-due">
            <Input id="r-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
        </div>
      ) : (
        <div className="space-y-4">
          {skipped.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
              <p className="flex items-center gap-2 font-medium text-warning"><AlertTriangle className="h-4 w-4" /> {skipped.length} units will not be billed</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {skipped.slice(0, 8).map((l) => <li key={l.unit_id}>{l.unit_code}: {l.skip_reason}</li>)}
                {skipped.length > 8 && <li>and {skipped.length - 8} more</li>}
              </ul>
            </div>
          )}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr><th className="px-3 py-2">Unit</th><th className="px-3 py-2">Bill to</th><th className="px-3 py-2">Lines</th><th className="px-3 py-2 text-right">Total</th></tr>
              </thead>
              <tbody className="divide-y">
                {billable.map((l) => (
                  <tr key={l.unit_id} className="align-top">
                    <td className="px-3 py-2 font-medium">{l.unit_code}<div className="font-mono text-[11px] text-muted-foreground">{l.account_ref}</div></td>
                    <td className="px-3 py-2">{l.customer_name || <span className="text-muted-foreground">No owner</span>}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{l.lines.map((x) => `${x.description} ${kes(x.amount)}`).join(', ')}</td>
                    <td className="px-3 py-2 text-right font-medium tabular">{kes(l.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/30 font-semibold">
                <tr><td className="px-3 py-2" colSpan={3}>Total</td><td className="px-3 py-2 text-right tabular">{kes(billable.reduce((s, l) => s + num(l.total), 0))}</td></tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </FormSheet>
  );
}
