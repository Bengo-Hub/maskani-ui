'use client';

import { use, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge, ToneBadge } from '@/components/common/status-badge';
import { useSlug } from '@/hooks/use-access';
import { gateApi, mediaApi } from '@/lib/api/operations';
import { fmtDateTime, titleCase } from '@/lib/utils';

/** Incident detail; the target of the incident alert deep link (security/incidents/{id}). */
export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const slug = useSlug();
  const { data: inc, isLoading } = useQuery({ queryKey: [slug, 'incidents', id], queryFn: () => gateApi.incident(slug, id) });
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!inc?.photos?.length) return;
    mediaApi.sign(slug, inc.photos).then((r) => setPhotos(Object.values(r.urls ?? {}))).catch(() => setPhotos([]));
  }, [slug, inc?.photos]);

  if (isLoading || !inc) return <div className="mx-auto max-w-4xl space-y-3"><Skeleton className="h-10 w-56" /><Skeleton className="h-48" /></div>;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back={{ href: `/${slug}/security/incidents`, label: 'Incidents' }}
        title={inc.title}
        subtitle={<span className="inline-flex flex-wrap items-center gap-2">{titleCase(inc.category)} <ToneBadge tone={inc.severity === 'high' || inc.severity === 'critical' ? 'danger' : 'warning'}>{titleCase(inc.severity)}</ToneBadge> <StatusBadge status={inc.status} /></span>}
      />
      <Card>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Happened {fmtDateTime(inc.occurred_at)}</p>
          {inc.description && <p className="whitespace-pre-line">{inc.description}</p>}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {photos.map((u) => <img key={u} src={u} alt="Incident photo" className="aspect-square w-full rounded-lg object-cover" />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
