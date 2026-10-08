'use client';

import { Bell } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { ToneBadge } from '@/components/common/status-badge';
import { usePortalNotices } from '@/hooks/use-portal';
import { fmtDate } from '@/lib/utils';

export default function PortalNoticesPage() {
  const { data = [], isLoading } = usePortalNotices();
  return (
    <div>
      <PageHeader title="Notices" subtitle="From the estate office" />
      {isLoading && <Skeleton className="h-40" />}
      {!isLoading && data.length === 0 && <EmptyState icon={Bell} title="No notices" description="Estate announcements will appear here." />}
      <div className="space-y-3">
        {data.map((n) => (
          <Card key={n.id} className="gap-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{n.title}</p>
              {n.priority === 'emergency' && <ToneBadge tone="danger">Urgent</ToneBadge>}
            </div>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{n.body}</p>
            <p className="text-xs text-muted-foreground">{fmtDate(n.sent_at ?? n.created_at)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
