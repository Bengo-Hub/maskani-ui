'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Download } from 'lucide-react';
import { extractErrorMessage } from '@bengo-hub/shared-ui-lib/documents';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Field, TextArea } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { PageHeader } from '@/components/common/page-header';
import { ToneBadge, type Tone } from '@/components/common/status-badge';
import { PrivacyNotice } from '@/components/portal/terms-gate';
import { useSlug } from '@/hooks/use-access';
import { useCreateMyPrivacyRequest, useMyPrivacyRequests, useTermsHistory } from '@/hooks/use-portal';
import { downloadBlob } from '@/lib/api/client';
import { portalApi } from '@/lib/api/portal';
import type { PrivacyKind, PrivacyRequest } from '@/lib/api/types';
import { fmtDate, fmtDateTime } from '@/lib/utils';

const ASK: Record<PrivacyKind, { label: string; hint: string }> = {
  access: { label: 'A copy of my data', hint: 'The estate prepares it within 7 days; you download it here.' },
  correction: { label: 'Correct my details', hint: 'Say what is wrong. The estate corrects it within 14 days.' },
  deletion: { label: 'Erase my details', hint: 'Possible once you no longer own, buy or live in a unit here. Bills and payments are kept, as the law requires.' },
};

const STATUS: Record<PrivacyRequest['status'], { label: string; tone: Tone }> = {
  received: { label: 'Received', tone: 'warning' },
  verified: { label: 'With the estate office', tone: 'primary' },
  in_progress: { label: 'With the estate office', tone: 'primary' },
  completed: { label: 'Done', tone: 'success' },
  rejected: { label: 'Not possible', tone: 'neutral' },
};

export default function PortalPrivacyPage() {
  const terms = useTermsHistory();
  const requests = useMyPrivacyRequests();
  const [asking, setAsking] = useState<PrivacyKind | null>(null);
  return (
    <div className="space-y-4">
      <PageHeader title="Your data and privacy" subtitle="What the estate keeps and what you agreed to" />
      <Card className="gap-3 p-4 text-sm text-muted-foreground">
        <PrivacyNotice />
      </Card>

      <Card className="gap-3 p-4">
        <div>
          <p className="font-medium">Your rights</p>
          <p className="text-sm text-muted-foreground">Ask the estate for a copy of your data, a correction, or to erase your details.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ASK) as PrivacyKind[]).map((k) => (
            <Button key={k} variant={k === 'deletion' ? 'outline' : 'secondary'} onClick={() => setAsking(k)}>{ASK[k].label}</Button>
          ))}
        </div>
        {requests.isLoading && <Skeleton className="h-16" />}
        {(requests.data ?? []).length > 0 && (
          <ul className="divide-y">
            {(requests.data ?? []).map((r) => <RequestRow key={r.id} request={r} />)}
          </ul>
        )}
      </Card>

      <Card className="gap-3 p-4">
        <p className="font-medium">Terms you accepted</p>
        {terms.isLoading && <Skeleton className="h-16" />}
        {!terms.isLoading && (terms.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No acceptance recorded yet.</p>}
        <ul className="divide-y">
          {(terms.data ?? []).map((a) => (
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
      {asking && <AskSheet kind={asking} onClose={() => setAsking(null)} />}
    </div>
  );
}

function RequestRow({ request: r }: { request: PrivacyRequest }) {
  const slug = useSlug();
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const { blob, fileName } = await portalApi.privacyExport(slug, r.id);
      downloadBlob(blob, fileName);
    } catch (err) {
      toast.error(await extractErrorMessage(err, 'Your data could not be downloaded.'));
    } finally {
      setBusy(false);
    }
  };
  const done = r.status === 'completed' || r.status === 'rejected';
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 text-sm">
        <p className="font-medium">{ASK[r.kind].label}</p>
        <p className="text-xs text-muted-foreground">
          Asked {fmtDate(r.received_at)}{done ? '' : `, answer due by ${fmtDate(r.due_at)}`}
        </p>
        {r.status === 'rejected' && r.metadata?.reason && <p className="mt-1 text-xs">{r.metadata.reason}</p>}
      </div>
      <div className="flex items-center gap-2">
        <ToneBadge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</ToneBadge>
        {r.kind === 'access' && r.status === 'completed' && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void download()}><Download /> {busy ? 'Preparing...' : 'Download'}</Button>
        )}
      </div>
    </li>
  );
}

function AskSheet({ kind, onClose }: { kind: PrivacyKind; onClose: () => void }) {
  const [notes, setNotes] = useState('');
  const create = useCreateMyPrivacyRequest();
  const needsNotes = kind === 'correction';
  return (
    <FormSheet open onOpenChange={(v) => !v && onClose()} title={ASK[kind].label} description={ASK[kind].hint}
      footer={<Button disabled={(needsNotes && !notes.trim()) || create.isPending}
        onClick={() => create.mutate({ kind, notes: notes.trim() || undefined }, { onSuccess: onClose })}>{create.isPending ? 'Sending...' : 'Send request'}</Button>}>
      <Field label={needsNotes ? 'What should be corrected' : 'Anything to add'} required={needsNotes}>
        <TextArea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
      </Field>
    </FormSheet>
  );
}
