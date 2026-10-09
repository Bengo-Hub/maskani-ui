import type { Metadata } from 'next';
import { VerifyDocument } from '@/components/documents/verify-document';

export const metadata: Metadata = { title: 'Check a document', robots: { index: false } };

/** The link printed on every Maskani document lands here with its code. */
export default async function VerifyCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <VerifyDocument initialCode={code.toUpperCase()} />;
}
