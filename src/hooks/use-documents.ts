'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { documentsApi } from '@/lib/api/documents';
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

/** Portal: documents addressed to the signed-in owner or resident. */
export function useMyDocuments() {
  const slug = useSlug();
  return useQuery({ queryKey: [...qk.documents(slug), 'mine'], queryFn: () => documentsApi.mine(slug).then((r) => r.data ?? []) });
}
