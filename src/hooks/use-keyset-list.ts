'use client';

import { useMemo } from 'react';
import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import type { Page } from '@/lib/api/types';

/**
 * Keyset pagination over maskani-api lists (`{data, next_cursor, has_more}`). Lists that are not
 * paginated (`{data}` only) simply end after one page. Rows are kept flat for the shared DataTable.
 */
export function useKeysetList<T>(
  key: QueryKey,
  fetchPage: (cursor?: string) => Promise<Page<T>>,
  options: { enabled?: boolean; refetchInterval?: number | false; staleTime?: number } = {},
) {
  const q = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.has_more && last.next_cursor ? last.next_cursor : undefined),
    enabled: options.enabled ?? true,
    refetchInterval: options.refetchInterval,
    staleTime: options.staleTime ?? 30_000,
  });
  const rows = useMemo(() => q.data?.pages.flatMap((p) => p.data ?? []) ?? [], [q.data]);
  return {
    rows,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: q.refetch,
    hasMore: !!q.hasNextPage,
    loadMore: () => q.fetchNextPage(),
    loadingMore: q.isFetchingNextPage,
  };
}
