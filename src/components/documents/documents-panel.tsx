'use client';

import { useEffect, useState } from 'react';
import { FilePlus2, FileText, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { extractErrorMessage, PdfPreview, useDocumentPreview } from '@bengo-hub/shared-ui-lib/documents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useDocTemplates, useDocuments, useIssueDocument } from '@/hooks/use-documents';
import { documentsApi } from '@/lib/api/documents';
import type { IssuedDocument } from '@/lib/api/types';
import { fmtDate } from '@/lib/utils';

const INPUT_LABELS: Record<string, { label: string; type: string; hint?: string }> = {
  instalments: { label: 'Number of instalments', type: 'number' },
  instalment_amount: { label: 'Amount per instalment (KES)', type: 'number' },
  first_due: { label: 'First instalment due', type: 'date' },
};

/**
 * Documents about an account or contract (or every document about a unit), with a preview of each
 * PDF and, where the caller may issue, an Issue button for the kinds that fit the subject.
 */
export function DocumentsPanel({ unitId, entityType, entityId, title = 'Documents' }: {
  unitId?: string;
  entityType?: 'unit_account' | 'sale_contract';
  entityId?: string;
  title?: string;
}) {
  const slug = useSlug();
  const { can } = useAccess();
  const { data: docs = [], isLoading } = useDocuments(unitId ? { unit_id: unitId } : { entity_type: entityType, entity_id: entityId });
  const { openPreview, previewProps } = useDocumentPreview({ onError: (m) => toast.error(m) });
  const [issuing, setIssuing] = useState(false);
  const canIssue = !!entityId && !!entityType && (can('documents.issue') || can('documents.manage'));

  const view = (d: IssuedDocument) =>
    openPreview(() => documentsApi.file(slug, d.id).then((f) => f.blob), { fileName: `${d.number}.pdf`, title: `${d.title} ${d.number}` });

  return (
    <section className="rounded-2xl border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <h2 className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4 text-primary" /> {title}</h2>
        {canIssue && <Button size="sm" onClick={() => setIssuing(true)}><FilePlus2 /> Issue document</Button>}
      </div>
      {isLoading ? (
        <div className="space-y-2 p-5">{[0, 1].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : docs.length ? (
        <ul className="divide-y">
          {docs.map((d) => (
            <li key={d.id}>
              <button type="button" onClick={() => view(d)} className="flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-left hover:bg-muted/50">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{d.title}</span>
                  <span className="block text-xs text-muted-foreground">{d.number} · issued {fmtDate(d.issued_at ?? d.created_at)}</span>
                </span>
                {d.verification_code && (
                  <span className="hidden items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-xs sm:flex" title="Verification code printed on the document">
                    <ShieldCheck className="h-3 w-3" /> {d.verification_code}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-6 text-sm text-muted-foreground">No documents yet.</p>
      )}
      {canIssue && (
        <IssueSheet open={issuing} onOpenChange={setIssuing} entityType={entityType!} entityId={entityId!}
          onIssued={(d) => { setIssuing(false); view(d); }} />
      )}
      <PdfPreview {...previewProps} />
    </section>
  );
}

function IssueSheet({ open, onOpenChange, entityType, entityId, onIssued }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entityType: 'unit_account' | 'sale_contract';
  entityId: string;
  onIssued: (d: IssuedDocument) => void;
}) {
  const { data } = useDocTemplates();
  const issue = useIssueDocument();
  const kinds = (data?.kinds ?? []).filter((k) => k.entity_type === entityType);
  const [kind, setKind] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const firstKind = kinds[0]?.code ?? '';
  useEffect(() => { if (open) { setKind(firstKind); setValues({}); } }, [open, firstKind]);
  const k = kinds.find((x) => x.code === kind);
  const missing = (k?.inputs ?? []).some((f) => !values[f]?.trim());

  const submit = () => {
    if (!k || missing) return;
    issue.mutate({ kind: k.code, entity_id: entityId, values: k.inputs?.length ? values : undefined }, {
      onSuccess: onIssued,
      onError: async (e) => toast.error(await extractErrorMessage(e, 'The document could not be issued.')),
    });
  };

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} size="md" title="Issue a document"
      description="Made from this estate's approved wording, numbered, and stamped with a code anyone can check."
      footer={<>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={submit} disabled={!k || missing || issue.isPending}>{issue.isPending ? 'Issuing...' : 'Issue'}</Button>
      </>}>
      <div className="space-y-4">
        <Field label="Document" htmlFor="doc-kind">
          <NativeSelect id="doc-kind" value={kind} onChange={(e) => { setKind(e.target.value); setValues({}); }}>
            {kinds.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
          </NativeSelect>
        </Field>
        {k?.inputs?.map((f) => {
          const meta = INPUT_LABELS[f] ?? { label: f.replaceAll('_', ' '), type: 'text' };
          return (
            <Field key={f} label={meta.label} htmlFor={`doc-${f}`} required>
              <Input id={`doc-${f}`} type={meta.type} inputMode={meta.type === 'number' ? 'decimal' : undefined} value={values[f] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))} />
            </Field>
          );
        })}
        {k?.code === 'clearance_certificate' && (
          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">The balance is checked against the books first; the certificate is refused while anything is owing.</p>
        )}
      </div>
    </FormSheet>
  );
}
