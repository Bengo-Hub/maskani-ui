'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { noticesApi, type NoticeInput } from '@/lib/api/operations';
import { qk } from '@/lib/query-keys';
import { useAccess, useSlug } from './use-access';
import { useKeysetList } from './use-keyset-list';

/** Notices, newest first, for staff who send them (communication module on). */
export function useNotices() {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useKeysetList(qk.notices(slug), (cursor) => noticesApi.list(slug, { cursor, limit: 30 }),
    { enabled: canAll('communication', 'notices.view') || canAll('communication', 'notices.manage') });
}

/** Per-person delivery records of one notice (opened from the list). */
export function useNoticeDeliveries(noticeId: string | undefined) {
  const slug = useSlug();
  const { canAll } = useAccess();
  return useQuery({
    queryKey: qk.deliveries(slug, noticeId ?? ''),
    queryFn: () => noticesApi.deliveries(slug, noticeId!).then((r) => r.data ?? []),
    enabled: !!noticeId && (canAll('communication', 'notices.view') || canAll('communication', 'notices.manage')),
  });
}

export function useNoticeMutations(onDone?: () => void) {
  const slug = useSlug();
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: qk.notices(slug) });
  return {
    create: useMutation({
      mutationFn: (body: NoticeInput) => noticesApi.create(slug, body),
      onSuccess: (n) => { toast.success(n.status === 'draft' ? 'Draft saved' : 'Notice is going out'); refresh(); onDone?.(); },
    }),
    send: useMutation({
      mutationFn: (id: string) => noticesApi.send(slug, id),
      onSuccess: () => { toast.success('Notice is going out'); refresh(); onDone?.(); },
    }),
  };
}
