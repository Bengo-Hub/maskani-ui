'use client';

import { CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { PrivacyNotice } from '@/components/portal/terms-gate';
import { useTermsHistory } from '@/hooks/use-portal';
import { fmtDateTime } from '@/lib/utils';

export default function PortalPrivacyPage() {
  const { data = [], isLoading } = useTermsHistory();
  return (
    <div className="space-y-4">
      <PageHeader title="Your data and privacy" subtitle="What the estate keeps and what you agreed to" />
      <Card className="gap-3 p-4 text-sm text-muted-foreground">
        <PrivacyNotice />
      </Card>
      <Card className="gap-3 p-4">
        <p className="font-medium">Terms you accepted</p>
        {isLoading && <Skeleton className="h-16" />}
        {!isLoading && data.length === 0 && <p className="text-sm text-muted-foreground">No acceptance recorded yet.</p>}
        <ul className="divide-y">
          {data.map((a) => (
            <li key={`${a.version}-${a.at}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 text-sm">
                <p>
                  Terms version {a.version}
                  {a.privacy_version && <>, privacy notice {a.privacy_version}</>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fmtDateTime(a.at)}
                  {a.ip && <> from {a.ip}</>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
