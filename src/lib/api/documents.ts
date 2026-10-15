import { apiClient } from './client';
import { API_URL, tenantBase as t } from '@/lib/config';
import type { DocKind, DocTemplate, DocumentSignature, DocumentVerification, IssuedDocument } from './types';

/** Document templates, issuing and files (maskani-api docs module). */
export const documentsApi = {
  templates: (slug: string) => apiClient.get<{ data: DocTemplate[]; kinds: DocKind[] }>(`${t(slug)}/document-templates`),
  saveDraft: (slug: string, kind: string, body: { name: string; body: string }) =>
    apiClient.put<DocTemplate>(`${t(slug)}/document-templates/${kind}`, body),
  approve: (slug: string, kind: string, version: number) =>
    apiClient.post<DocTemplate>(`${t(slug)}/document-templates/${kind}/approve`, { version }),
  issue: (slug: string, body: { kind: string; entity_id: string; values?: Record<string, string> }) =>
    apiClient.post<IssuedDocument>(`${t(slug)}/documents`, body),
  list: (slug: string, params: { unit_id?: string; entity_type?: string; entity_id?: string }) =>
    apiClient.get<{ data: IssuedDocument[] }>(`${t(slug)}/documents`, params),
  file: (slug: string, id: string) => apiClient.getBlob(`${t(slug)}/documents/${id}/file`, 'document.pdf'),
  mine: (slug: string) => apiClient.get<{ data: IssuedDocument[] }>(`${t(slug)}/me/documents`),
  myFile: (slug: string, id: string) => apiClient.getBlob(`${t(slug)}/me/documents/${id}/file`, 'document.pdf'),
  signatures: (slug: string, id: string) => apiClient.get<{ data: DocumentSignature[] }>(`${t(slug)}/documents/${id}/signatures`),
  sendCode: (slug: string, id: string, partyId: string) => apiClient.post(`${t(slug)}/documents/${id}/send-code`, { party_id: partyId }),
  accept: (slug: string, id: string, partyId: string, code: string) =>
    apiClient.post<IssuedDocument>(`${t(slug)}/documents/${id}/accept`, { party_id: partyId, code }),
  signedCopy: (slug: string, id: string, keys: string[]) => apiClient.post<IssuedDocument>(`${t(slug)}/documents/${id}/signed-copy`, { keys }),
  mySendCode: (slug: string, id: string) => apiClient.post(`${t(slug)}/me/documents/${id}/send-code`, {}),
  myAccept: (slug: string, id: string, code: string) => apiClient.post<IssuedDocument>(`${t(slug)}/me/documents/${id}/accept`, { code }),
};

/** The public check of a printed code: no sign-in, so a plain fetch. */
export async function verifyDocument(code: string): Promise<DocumentVerification | null> {
  const res = await fetch(`${API_URL.replace(/\/$/, '')}/api/v1/public/documents/verify/${encodeURIComponent(code)}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(res.status === 429 ? 'Too many checks. Wait a minute and try again.' : 'The check could not be completed.');
  return res.json() as Promise<DocumentVerification>;
}
