'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { importsApi, type ImportJob } from '@/lib/api/imports';
import { qk } from '@/lib/query-keys';
import { useAccess, useSlug } from './use-access';

export function useImports() {
  const slug = useSlug();
  const { can } = useAccess();
  return useQuery({ queryKey: qk.imports(slug), queryFn: () => importsApi.list(slug).then((r) => r.data ?? []), enabled: can('imports.run') });
}

/** One job; polls every 2 seconds while it is being committed, then stops. */
export function useImportJob(id: string) {
  const slug = useSlug();
  return useQuery({
    queryKey: qk.importJob(slug, id),
    queryFn: () => importsApi.get(slug, id),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data?.status === 'committing' ? 2000 : false),
  });
}

export function useValidateImport() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, file }: { propertyId: string; file: File }) => importsApi.validate(slug, propertyId, file),
    onSuccess: (job: ImportJob) => {
      qc.setQueryData(qk.importJob(slug, job.id), job);
      void qc.invalidateQueries({ queryKey: qk.imports(slug) });
    },
  });
}

export function useCommitImport() {
  const slug = useSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => importsApi.commit(slug, id),
    onSuccess: (job: ImportJob) => {
      toast.success('Import started. Units and owners are being saved.');
      qc.setQueryData(qk.importJob(slug, job.id), job);
      void qc.invalidateQueries({ queryKey: qk.imports(slug) });
    },
  });
}
