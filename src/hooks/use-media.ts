'use client';

import { useQuery } from '@tanstack/react-query';
import { mediaApi } from '@/lib/api/operations';
import { useSlug } from './use-access';

/**
 * Signed links for stored photo keys, in the keys' order (unknown keys dropped). Links last 12
 * hours on the API, so a 30 minute cache is safe; the key is a joined string so a new array with
 * the same keys never refetches.
 */
export function useSignedMedia(keys: string[] | undefined) {
  const slug = useSlug();
  const joined = (keys ?? []).join('|');
  const { data = [] } = useQuery({
    queryKey: [slug, 'media-sign', joined],
    queryFn: () => {
      const list = joined.split('|');
      return mediaApi.sign(slug, list).then((r) => list.map((k) => r.urls?.[k]).filter(Boolean) as string[]);
    },
    enabled: joined !== '',
    staleTime: 30 * 60 * 1000,
  });
  return joined === '' ? [] : data;
}
