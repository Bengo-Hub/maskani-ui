// Shapes returned by maskani-api. Decimals arrive as strings; Ent relations sit under `edges`.

export type Money = string;

export interface Page<T> {
  data: T[];
  next_cursor?: string;
  has_more?: boolean;
}

export interface Base {
  id: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown> | null;
  custom_fields?: Record<string, unknown> | null;
}

/** Document download formats the API renders (`?format=`). */
export type ExportFormat = 'pdf' | 'csv' | 'xlsx';

export interface MediaUpload {
  key: string;
  url: string;
}
