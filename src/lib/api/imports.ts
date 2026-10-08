import { apiClient, downloadBlob } from './client';
import { tenantBase as t } from '@/lib/config';

export type ImportStatus = 'validating' | 'validated' | 'committing' | 'committed' | 'failed';

export interface ImportRowError {
  line: number;
  field?: string;
  message: string;
}

export interface ImportPlan {
  line: number;
  unit: 'create' | 'update';
  block: 'existing' | 'create' | 'none';
  owner: 'existing' | 'create' | 'none';
  link: 'create' | 'existing' | 'none';
  detail: string;
}

/** An import job. The API never returns the raw rows (owner phones stay server side). */
export interface ImportJob {
  id: string;
  kind: string;
  property_id?: string;
  dry_run: boolean;
  status: ImportStatus;
  file_name?: string;
  rows_total: number;
  rows_valid: number;
  rows_failed: number;
  rows_committed: number;
  errors?: ImportRowError[];
  summary?: { counts?: Record<string, number>; plans?: ImportPlan[] };
  created_at: string;
}

export const importsApi = {
  list: (slug: string) => apiClient.get<{ data: ImportJob[] }>(`${t(slug)}/imports`),
  get: (slug: string, id: string) => apiClient.get<ImportJob>(`${t(slug)}/imports/${id}`),
  /** Validates the file; nothing is written until commit. */
  validate: (slug: string, propertyId: string, file: File) => {
    const form = new FormData();
    form.append('property_id', propertyId);
    form.append('file', file);
    return apiClient.upload<ImportJob>(`${t(slug)}/imports`, form);
  },
  commit: (slug: string, id: string) => apiClient.post<ImportJob>(`${t(slug)}/imports/${id}/commit`),
  downloadTemplate: async (slug: string) => {
    const { blob, fileName } = await apiClient.getBlob(`${t(slug)}/imports/template`, 'maskani-units-owners-template.csv');
    downloadBlob(blob, fileName);
  },
};
