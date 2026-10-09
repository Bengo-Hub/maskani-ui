'use client';

import { useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { extractErrorMessage, PdfPreview, useDocumentPreview } from '@bengo-hub/shared-ui-lib/documents';
import { Button } from '@/components/ui/button';
import { downloadBlob } from '@/lib/api/client';
import type { ExportFormat } from '@/lib/api/types';

export type ExportFetch = (format: ExportFormat) => Promise<{ blob: Blob; fileName: string }>;

/**
 * A branded document of what the screen shows, rendered by the API: the PDF opens in the shared
 * preview (download, print, open in a tab), Excel downloads straight away.
 */
export function ExportButtons({ name, title, fetchFile, pdfLabel = 'PDF' }: {
  /** File name stem for the preview's download, e.g. "statement-SV-A12". */
  name: string;
  title: string;
  fetchFile: ExportFetch;
  pdfLabel?: string;
}) {
  const { openPreview, previewProps } = useDocumentPreview({ onError: (m) => toast.error(m) });
  const [excel, setExcel] = useState(false);

  const viewPdf = () => openPreview(() => fetchFile('pdf').then((f) => f.blob), { fileName: `${name}.pdf`, title });

  const downloadExcel = async () => {
    setExcel(true);
    try {
      const { blob, fileName } = await fetchFile('xlsx');
      downloadBlob(blob, fileName);
    } catch (err) {
      toast.error(await extractErrorMessage(err, 'The file could not be downloaded.'));
    } finally {
      setExcel(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => void viewPdf()}><FileText /> {pdfLabel}</Button>
      <Button variant="outline" size="sm" onClick={() => void downloadExcel()} disabled={excel}>
        <FileSpreadsheet /> {excel ? 'Preparing...' : 'Excel'}
      </Button>
      <PdfPreview {...previewProps} />
    </div>
  );
}
