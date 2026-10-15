'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { documentsApi } from '@/lib/api/documents';
import type { IssuedDocument } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';
import { useAccess, useSlug } from './use-access';

const canSee = (can: (p: string) => boolean) => can('documents.view') || can('documents.issue') || can('documents.manage');

/** Templates per kind (in use and draft) and the kinds with their merge fields. */
export function useDocTemplates() {
  const slug = useSlug();
  const { can } = useAccess();
  return useQuery({ queryKey: qk.docTemplates(slug), queryFn: () => documentsApi.templates(slug), enabled: canSee(can) });
}

export function useDocTemplateMutations() {
  const slug = useSlug();
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: qk.docTemplates(slug) });
  return {
    save: useMutation({
      mutationFn: (v: { kind: string; name: string; body: string }) => documentsApi.saveDraft(slug, v.kind, { name: v.name, body: v.body }),
      onSuccess: () => { toast.success('Draft saved. Approve it to start using it.'); refresh(); },
    }),
    approve: useMutation({
      mutationFn: (v: { kind: string; version: number }) => documentsApi.approve(slug, v.kind, v.version),
      onSuccess: () => { toast.success('Template approved and in use'); refresh(); },
    }),
  };
}

/** Documents about a unit (its accounts and contracts), or about one account or contract. */
export function useDocuments(params: { unit_id?: string; entity_type?: string; entity_id?: string }) {
  const slug = useSlug();
  const { can } = useAccess();
  const key = params.unit_id ? `unit:${params.unit_id}` : `${params.entity_type}:${params.entity_id}`;
  return useQuery({
    queryKey: qk.documentsFor(slug, key),
    queryFn: () => documentsApi.list(slug, params).then((r) => r.data ?? []),
    enabled: canSee(can) && !!(params.unit_id || params.entity_id),
  });
}

export function useIssueDocument() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { kind: string; entity_id: string; values?: Record<string, string> }) => documentsApi.issue(slug, body),
    onSuccess: (d) => {
      toast.success(`${d.title} ${d.number} issued`);
      void qc.invalidateQueries({ queryKey: qk.documents(slug) });
    },
  });
}

/** An agreement's acceptances and signed copies (office). */
export function useDocumentSignatures(id: string | undefined) {
  const slug = useSlug();
  const { can } = useAccess();
  return useQuery({
    queryKey: [...qk.documents(slug), 'signatures', id ?? ''],
    queryFn: () => documentsApi.signatures(slug, id!).then((r) => r.data ?? []),
    enabled: !!id && canSee(can),
  });
}

/** Signing an agreement: a code sent to the person's record and read back, or a signed paper
 *  copy (office); the same code flow in the portal. Each step refreshes the document lists. */
export function useSigning() {
  const slug = useSlug();
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: qk.documents(slug) });
  const signedToast = (d: IssuedDocument) =>
    toast.success(d.status === 'executed' ? `${d.title} is signed by everyone` : 'Accepted; waiting for the others named on it');
  return {
    sendCode: useMutation({
      mutationFn: (v: { id: string; partyId?: string }) => (v.partyId ? documentsApi.sendCode(slug, v.id, v.partyId) : documentsApi.mySendCode(slug, v.id)),
      onSuccess: () => toast.success('Code sent to the phone and email on record'),
    }),
    accept: useMutation({
      mutationFn: (v: { id: string; code: string; partyId?: string }) =>
        (v.partyId ? documentsApi.accept(slug, v.id, v.partyId, v.code) : documentsApi.myAccept(slug, v.id, v.code)),
      onSuccess: (d) => { signedToast(d); refresh(); },
    }),
    signedCopy: useMutation({
      mutationFn: (v: { id: string; keys: string[] }) => documentsApi.signedCopy(slug, v.id, v.keys),
      onSuccess: (d) => { signedToast(d); refresh(); },
    }),
  };
}

/** Portal: documents addressed to the signed-in owner or resident. */
export function useMyDocuments() {
  const slug = useSlug();
  return useQuery({ queryKey: [...qk.documents(slug), 'mine'], queryFn: () => documentsApi.mine(slug).then((r) => r.data ?? []) });
}
