'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, NativeSelect, TextArea } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { PhotoPicker, type PickedPhoto } from '@/components/common/photo-picker';
import { StatusBadge } from '@/components/common/status-badge';
import { useSlug } from '@/hooks/use-access';
import { useCancelVendorInvoice, useCreateVendorInvoice, useDecideVendorInvoice, useVendorInvoiceCheck, useVendorInvoices } from '@/hooks/use-vendor-ops';
import type { Vendor, VendorInvoice } from '@/lib/api/types';
import { apiDate, cn, fmtDate, kes, num, titleCase } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Waiting for approval', approved: 'Approved, to be paid', rejected: 'Sent back', cancelled: 'Cancelled', paid: 'Paid',
};

const blank = { contract_id: '', invoice_number: '', etims_number: '', invoice_date: '', period_start: '', period_end: '', amount: '', vat_amount: '' };

/**
 * A vendor's invoices: recorded exactly as the vendor issued them (with the eTIMS number), checked
 * against the contract fee, the visits done and missed and the credit due, then approved and paid
 * in Books. A credit is never taken off the bill here: send the invoice back for a corrected one, so
 * the bill matches the vendor's own eTIMS invoice.
 */
export function VendorInvoices({ vendor, manage }: { vendor: Vendor; manage: boolean }) {
  const slug = useSlug();
  const sp = useSearchParams();
  const list = useVendorInvoices(vendor.id);
  const create = useCreateVendorInvoice();
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState(blank);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [open, setOpen] = useState<VendorInvoice | null>(null);
  const contracts = useMemo(() => (vendor.contracts ?? []).filter((c) => c.status === 'active' || c.status === 'expired'), [vendor.contracts]);
  const rows = useMemo(() => list.data?.data ?? [], [list.data]);

  // The approvals inbox links here with ?invoice=<id>: open that invoice's review once.
  const wanted = sp.get('invoice');
  const [seen, setSeen] = useState('');
  useEffect(() => {
    if (!wanted || wanted === seen) return;
    const hit = rows.find((r) => r.id === wanted);
    if (hit) { setOpen(hit); setSeen(wanted); }
  }, [wanted, rows, seen]);

  const columns: DataTableColumn<VendorInvoice>[] = [
    {
      key: 'number', header: 'Invoice', primary: true, accessor: (i) => i.invoice_number,
      render: (i) => (
        <div className="min-w-0">
          <p className="font-medium">{i.invoice_number}</p>
          <p className="text-xs text-muted-foreground">{fmtDate(i.period_start)} to {fmtDate(i.period_end)}</p>
        </div>
      ),
    },
    { key: 'amount', header: 'Amount', align: 'right', accessor: (i) => num(i.amount), render: (i) => <span className="tabular-nums">{kes(i.amount)}</span> },
    { key: 'status', header: 'Status', accessor: (i) => i.status, render: (i) => <StatusBadge status={i.status} label={STATUS_LABEL[i.status]} /> },
    { key: 'bill', header: 'Books', hideBelow: 'md', accessor: (i) => i.metadata?.treasury_bill_number ?? '', render: (i) => i.metadata?.treasury_bill_number ?? '-' },
  ];

  const amount = Number(f.amount);
  const vat = f.vat_amount ? Number(f.vat_amount) : 0;
  const valid = !!f.contract_id && !!f.invoice_number.trim() && !!f.invoice_date && !!f.period_start && !!f.period_end
    && f.period_end >= f.period_start && amount > 0 && vat >= 0 && vat < amount;
  const submit = () => create.mutate({
    contract_id: f.contract_id, invoice_number: f.invoice_number.trim(), etims_number: f.etims_number.trim() || undefined,
    invoice_date: apiDate(f.invoice_date), period_start: apiDate(f.period_start), period_end: apiDate(f.period_end),
    amount, vat_amount: vat, attachments: photos.map((p) => p.key),
  }, { onSuccess: () => setAdding(false) });

  const linked = !!vendor.treasury_vendor_id;

  return (
    <div className="space-y-3">
      {manage && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!linked && <span className="text-xs text-muted-foreground">Link the treasury supplier first to record invoices.</span>}
          <Button size="sm" variant="outline" disabled={!linked || contracts.length === 0}
            onClick={() => { setF({ ...blank, contract_id: contracts.length === 1 ? contracts[0].id : '' }); setPhotos([]); setAdding(true); }}>
            <Plus /> Record invoice
          </Button>
        </div>
      )}
      <DataTable columns={columns} rows={rows} rowKey={(i) => i.id} loading={list.isLoading} onRowClick={setOpen}
        emptyText="No invoices recorded." maxBodyHeight={false} />

      <FormSheet
        open={adding}
        onOpenChange={setAdding}
        size="lg"
        title="Record a vendor invoice"
        description="Enter it exactly as the vendor issued it. It goes for approval, then to Books to be paid."
        footer={<>
          <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!valid || create.isPending}>{create.isPending ? 'Saving...' : 'Record'}</Button>
        </>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Contract" htmlFor="vi-contract" required className="sm:col-span-2">
            <NativeSelect id="vi-contract" value={f.contract_id} onChange={(e) => setF({ ...f, contract_id: e.target.value })}>
              <option value="">Choose the contract</option>
              {contracts.map((c) => <option key={c.id} value={c.id}>{titleCase(c.service_category)}{c.contract_number ? ` (${c.contract_number})` : ''}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Invoice number" htmlFor="vi-num" required><Input id="vi-num" value={f.invoice_number} onChange={(e) => setF({ ...f, invoice_number: e.target.value })} /></Field>
          <Field label="eTIMS invoice number" htmlFor="vi-etims" hint="The KRA CU invoice number printed on the invoice."><Input id="vi-etims" value={f.etims_number} onChange={(e) => setF({ ...f, etims_number: e.target.value })} /></Field>
          <Field label="Invoice date" htmlFor="vi-date" required className="sm:col-span-2"><Input id="vi-date" type="date" value={f.invoice_date} onChange={(e) => setF({ ...f, invoice_date: e.target.value })} /></Field>
          <Field label="Period from" htmlFor="vi-from" required><Input id="vi-from" type="date" value={f.period_start} onChange={(e) => setF({ ...f, period_start: e.target.value })} /></Field>
          <Field label="Period to" htmlFor="vi-to" required><Input id="vi-to" type="date" value={f.period_end} onChange={(e) => setF({ ...f, period_end: e.target.value })} /></Field>
          <Field label="Total with VAT (KES)" htmlFor="vi-amt" required><Input id="vi-amt" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label="VAT in the total (KES)" htmlFor="vi-vat" hint="Leave empty when the vendor charges no VAT."><Input id="vi-vat" inputMode="decimal" value={f.vat_amount} onChange={(e) => setF({ ...f, vat_amount: e.target.value })} /></Field>
          <Field label="Photo of the invoice" className="sm:col-span-2"><PhotoPicker slug={slug} kind="works" value={photos} onChange={setPhotos} /></Field>
        </div>
      </FormSheet>

      {open && <InvoiceReview invoice={open} manage={manage} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** One invoice beside its contract and visits, with approve, send back and cancel. */
function InvoiceReview({ invoice, manage, onClose }: { invoice: VendorInvoice; manage: boolean; onClose: () => void }) {
  const check = useVendorInvoiceCheck(invoice.id);
  const decide = useDecideVendorInvoice();
  const cancel = useCancelVendorInvoice();
  const [note, setNote] = useState('');
  const c = check.data;
  const diff = c?.computed ? num(c.difference) : 0;

  const line = (label: string, value: React.ReactNode, strong = false) => (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('tabular-nums', strong && 'font-semibold')}>{value}</span>
    </div>
  );

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      size="md"
      title={`Invoice ${invoice.invoice_number}`}
      description={`${fmtDate(invoice.period_start)} to ${fmtDate(invoice.period_end)}${invoice.etims_number ? `, eTIMS ${invoice.etims_number}` : ''}`}
      footer={<Button variant="outline" onClick={onClose}>Close</Button>}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2"><StatusBadge status={invoice.status} label={STATUS_LABEL[invoice.status]} />
          {invoice.metadata?.treasury_bill_number && <span className="text-xs text-muted-foreground">Bill {invoice.metadata.treasury_bill_number} in Books</span>}
        </div>
        <div className="divide-y rounded-xl border px-3">
          {line('Invoiced (with VAT)', kes(invoice.amount), true)}
          {line('VAT in it', kes(invoice.vat_amount))}
          {check.isLoading && <p className="py-2 text-sm text-muted-foreground">Checking against the contract...</p>}
          {c && (
            <>
              {line('Contract fee', `${kes(c.fee_amount)} ${c.fee_basis === 'fixed_monthly' ? `a month, ${c.months} ${c.months === 1 ? 'month' : 'months'}` : titleCase(c.fee_basis)}`)}
              {line('Visits done', `${(c.visits.completed ?? 0) + (c.visits.partial ?? 0)}${c.visits.partial ? ` (${c.visits.partial} part done)` : ''}`)}
              {line('Visits missed', c.visits.missed ?? 0)}
              {num(c.credit_due) > 0 && line(`Credit for missed visits (${num(c.credit_percent)}% each)`, kes(c.credit_due))}
              {c.computed && line('Due under the contract', kes(c.expected_amount), true)}
            </>
          )}
        </div>
        {c?.computed && Math.abs(diff) >= 0.01 && (
          <p className={cn('rounded-lg p-3 text-sm', diff > 0 ? 'bg-warning/10' : 'bg-muted')}>
            {diff > 0
              ? `The invoice is ${kes(diff)} more than the contract and visits show. Send it back for a corrected invoice unless the difference is agreed.`
              : `The invoice is ${kes(-diff)} less than the contract and visits show.`}
          </p>
        )}
        {invoice.metadata?.decision_note && <p className="text-sm"><span className="text-muted-foreground">Decision note: </span>{invoice.metadata.decision_note}</p>}
        {invoice.metadata?.cancel_reason && <p className="text-sm"><span className="text-muted-foreground">Cancelled: </span>{invoice.metadata.cancel_reason}</p>}

        {manage && (invoice.status === 'submitted' || invoice.status === 'approved') && (
          <div className="space-y-3 border-t pt-3">
            <Field label={invoice.status === 'submitted' ? 'Note (needed to send it back)' : 'Reason (needed to cancel)'} htmlFor="vi-note">
              <TextArea id="vi-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" className="text-destructive" disabled={!note.trim() || cancel.isPending}
                onClick={() => cancel.mutate({ id: invoice.id, reason: note.trim() }, { onSuccess: onClose })}>Cancel invoice</Button>
              {invoice.status === 'submitted' && (
                <>
                  <Button variant="outline" disabled={!note.trim() || decide.isPending}
                    onClick={() => decide.mutate({ id: invoice.id, decision: 'reject', note: note.trim() }, { onSuccess: onClose })}>Send back</Button>
                  <Button disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: invoice.id, decision: 'approve', note: note.trim() || undefined }, { onSuccess: onClose })}>Approve</Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </FormSheet>
  );
}
