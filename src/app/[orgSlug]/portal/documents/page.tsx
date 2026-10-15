'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileSignature, FileText, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { extractErrorMessage, PdfPreview, useDocumentPreview } from '@bengo-hub/shared-ui-lib/documents';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { FormSheet } from '@/components/common/form-sheet';
import { PageHeader } from '@/components/common/page-header';
import { SigningBadge } from '@/components/documents/signing-sheet';
import { useSlug } from '@/hooks/use-access';
import { useMyDocuments, useSigning } from '@/hooks/use-documents';
import { documentsApi } from '@/lib/api/documents';
import type { IssuedDocument } from '@/lib/api/types';
import { fmtDate } from '@/lib/utils';

/** Letters, certificates and agreements the estate issued to the signed-in owner or resident. */
export default function PortalDocumentsPage() {
  const slug = useSlug();
  const { data = [], isLoading } = useMyDocuments();
  const { openPreview, previewProps } = useDocumentPreview({ onError: (m) => toast.error(m) });
  const [accepting, setAccepting] = useState<IssuedDocument | null>(null);
  const preview = (d: IssuedDocument) =>
    openPreview(() => documentsApi.myFile(slug, d.id).then((f) => f.blob), { fileName: `${d.number}.pdf`, title: d.title });

  return (
    <div>
      <PageHeader title="Documents" subtitle="Letters, certificates and agreements from the estate office" />
      {isLoading && <Skeleton className="h-40" />}
      {!isLoading && data.length === 0 && (
        <EmptyState icon={FileText} title="No documents yet" description="Clearance certificates, payment plans and letters the estate sends you appear here." />
      )}
      <div className="space-y-3">
        {data.map((d) => {
          const waiting = d.needs_signature && !d.accepted_by_me && (d.status === 'issued' || d.status === 'partly_signed');
          return (
            <Card key={d.id} className="gap-0 p-0">
              <button type="button" className="flex w-full cursor-pointer items-center gap-4 p-4 text-left" onClick={() => preview(d)}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{d.title}</span>
                  <span className="block text-sm text-muted-foreground">{d.number} · {fmtDate(d.issued_at ?? d.created_at)}</span>
                </span>
                <SigningBadge doc={d} />
                {d.verification_code && (
                  <span className="hidden items-center gap-1 font-mono text-xs text-muted-foreground sm:flex"><ShieldCheck className="h-3.5 w-3.5" /> {d.verification_code}</span>
                )}
              </button>
              {waiting && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Read it, then accept it with a code sent to your phone or email.</span>
                  <Button size="sm" onClick={() => setAccepting(d)}><FileSignature /> Accept</Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      {data.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Anyone you share a document with can check it at <Link href="/verify" className="text-primary underline">the verify page</Link> using the code on it.
        </p>
      )}
      {accepting && <AcceptSheet doc={accepting} onClose={() => setAccepting(null)} />}
      <PdfPreview {...previewProps} />
    </div>
  );
}

function AcceptSheet({ doc, onClose }: { doc: IssuedDocument; onClose: () => void }) {
  const { sendCode, accept } = useSigning();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const fail = (fallback: string) => async (e: unknown) => toast.error(await extractErrorMessage(e, fallback));

  return (
    <FormSheet open onOpenChange={(v) => !v && onClose()} size="sm" title={`Accept ${doc.title}`}
      description="Accepting records your agreement to this document as issued, with the time and the device you used."
      footer={sent ? (
        <Button disabled={code.length !== 6 || accept.isPending}
          onClick={() => accept.mutate({ id: doc.id, code }, { onSuccess: onClose, onError: fail('The code was not accepted.') })}>
          {accept.isPending ? 'Accepting...' : 'Accept'}
        </Button>
      ) : undefined}>
      <div className="space-y-3 text-sm">
        <Button variant="outline" disabled={sendCode.isPending}
          onClick={() => sendCode.mutate({ id: doc.id }, { onSuccess: () => setSent(true), onError: fail('The code could not be sent.') })}>
          {sent ? 'Send a new code' : 'Send me a code'}
        </Button>
        {sent && (
          <div className="space-y-1.5">
            <label htmlFor="accept-code" className="font-medium">Code</label>
            <Input id="accept-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6 digit code"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            <p className="text-xs text-muted-foreground">It lasts 5 minutes.</p>
          </div>
        )}
      </div>
    </FormSheet>
  );
}
