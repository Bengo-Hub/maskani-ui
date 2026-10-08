'use client';

import type { ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Button } from '@/components/ui/button';

/**
 * The shared DataTable over a keyset list (`useKeysetList`). Rows load page by page from the API
 * ("Load more"), never the whole table at once. Columns must tag `primary`, `hideBelow` and
 * `mobileAction` so the table turns into cards on phones.
 */
export function KeysetTable<T>({
  columns, rows, rowKey, loading, error, onRetry, hasMore, loadMore, loadingMore, emptyText, toolbar,
  toolbarActions, onRowClick, storageKey, exportFileName,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  hasMore?: boolean;
  loadMore?: () => void;
  loadingMore?: boolean;
  emptyText?: string;
  toolbar?: ReactNode;
  toolbarActions?: ReactNode;
  onRowClick?: (row: T) => void;
  storageKey?: string;
  exportFileName?: string;
}) {
  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={rowKey}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyText={emptyText}
        toolbar={toolbar}
        toolbarActions={toolbarActions}
        onRowClick={onRowClick}
        storageKey={storageKey}
        showExportCsv={!!exportFileName}
        exportFileName={exportFileName}
        pageSize={rows.length > 0 ? Math.max(rows.length, 50) : 50}
        maxBodyHeight={false}
      />
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
