'use client';

import { useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { extractErrorMessage, PdfPreview, useDocumentPreview } from '@bengo-hub/shared-ui-lib/documents';
import { Button } from '@/components/ui/button';
import { downloadBlob } from '@/lib/api/client';
import type { StatementFormat } from '@/lib/api/billing';

type Fetch = (format: StatementFormat) => Promise<{ blob: Blob; fileName: string }>;

/**
 * The statement as a branded document with the account's full history: the PDF opens in the shared
 * preview (download, print, open in a tab), Excel downloads straight away.
 */
export function StatementDownload({ accountRef, fetchFile }: { accountRef: string; fetchFile: Fetch }) {
  const { openPreview, previewProps } = useDocumentPreview({ onError: (m) => toast.error(m) });
  const [excel, setExcel] = useState(false);

  const viewPdf = () => openPreview(
    () => fetchFile('pdf').then((f) => f.blob),
    { fileName: `statement-${accountRef}.pdf`, title: `Statement for ${accountRef}` },
  );

  const downloadExcel = async () => {
    setExcel(true);
    try {
      const { blob, fileName } = await fetchFile('xlsx');
      downloadBlob(blob, fileName);
    } catch (err) {
      toast.error(await extractErrorMessage(err, 'The statement could not be downloaded.'));
    } finally {
      setExcel(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => void viewPdf()}><FileText /> Statement PDF</Button>
      <Button variant="outline" size="sm" onClick={() => void downloadExcel()} disabled={excel}>
        <FileSpreadsheet /> {excel ? 'Preparing...' : 'Excel'}
      </Button>
      <PdfPreview {...previewProps} />
    </div>
  );
}
