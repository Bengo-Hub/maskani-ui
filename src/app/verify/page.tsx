import type { Metadata } from 'next';
import { VerifyDocument } from '@/components/documents/verify-document';

export const metadata: Metadata = { title: 'Check a document', robots: { index: false } };

export default function VerifyPage() {
  return <VerifyDocument />;
}
