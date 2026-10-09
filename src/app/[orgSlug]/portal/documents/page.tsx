'use client';

import Link from 'next/link';
import { FileText, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PdfPreview, useDocumentPreview } from '@bengo-hub/shared-ui-lib/documents';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { useSlug } from '@/hooks/use-access';
import { useMyDocuments } from '@/hooks/use-documents';
import { documentsApi } from '@/lib/api/documents';
import { fmtDate } from '@/lib/utils';

/** Letters and certificates the estate issued to the signed-in owner or resident. */
export default function PortalDocumentsPage() {
  const slug = useSlug();
  const { data = [], isLoading } = useMyDocuments();
  const { openPreview, previewProps } = useDocumentPreview({ onError: (m) => toast.error(m) });

  return (
    <div>
      <PageHeader title="Documents" subtitle="Letters and certificates from the estate office" />
      {isLoading && <Skeleton className="h-40" />}
      {!isLoading && data.length === 0 && (
        <EmptyState icon={FileText} title="No documents yet" description="Clearance certificates, payment plans and letters the estate sends you appear here." />
      )}
      <div className="space-y-3">
        {data.map((d) => (
          <Card key={d.id} className="p-0">
            <button type="button" className="flex w-full cursor-pointer items-center gap-4 p-4 text-left"
              onClick={() => openPreview(() => documentsApi.myFile(slug, d.id).then((f) => f.blob), { fileName: `${d.number}.pdf`, title: d.title })}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{d.title}</span>
                <span className="block text-sm text-muted-foreground">{d.number} · {fmtDate(d.issued_at ?? d.created_at)}</span>
              </span>
              {d.verification_code && (
                <span className="hidden items-center gap-1 font-mono text-xs text-muted-foreground sm:flex"><ShieldCheck className="h-3.5 w-3.5" /> {d.verification_code}</span>
              )}
            </button>
          </Card>
        ))}
      </div>
      {data.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Anyone you share a document with can check it at <Link href="/verify" className="text-primary underline">the verify page</Link> using the code on it.
        </p>
      )}
      <PdfPreview {...previewProps} />
    </div>
  );
}
