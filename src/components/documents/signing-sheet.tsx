'use client';

import { useState } from 'react';
import { CheckCircle2, FileSignature, Send } from 'lucide-react';
import { toast } from 'sonner';
import { extractErrorMessage } from '@bengo-hub/shared-ui-lib/documents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { FormSheet } from '@/components/common/form-sheet';
import { PhotoPicker, type PickedPhoto } from '@/components/common/photo-picker';
import { ToneBadge } from '@/components/common/status-badge';
import { partyName } from '@/components/register/party-picker';
import { useSlug } from '@/hooks/use-access';
import { useDocumentSignatures, useSigning } from '@/hooks/use-documents';
import { useParty } from '@/hooks/use-register';
import type { DocumentSignature, IssuedDocument } from '@/lib/api/types';
import { fmtDateTime } from '@/lib/utils';

/** Where an agreement stands, in words, for the panel and the portal. */
export function SigningBadge({ doc }: { doc: IssuedDocument }) {
  if (!doc.needs_signature) return null;
  if (doc.status === 'executed') return <ToneBadge tone="success">Signed</ToneBadge>;
  if (doc.status === 'partly_signed') return <ToneBadge tone="warning">Partly signed</ToneBadge>;
  if (doc.status === 'issued') return <ToneBadge tone="primary">Waiting for signatures</ToneBadge>;
  return null;
}

/**
 * Signing an agreement at the office: each person named accepts by reading back a code sent to the
 * phone and email on their record, or the office records photos of a signed paper copy. Every
 * acceptance keeps the document's fingerprint, time and where it came from.
 */
export function SigningSheet({ doc, onClose }: { doc: IssuedDocument; onClose: () => void }) {
  const slug = useSlug();
  const { data: sigs = [], isLoading } = useDocumentSignatures(doc.id);
  const { signedCopy } = useSigning();
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const open = doc.status === 'issued' || doc.status === 'partly_signed';
  const byParty = new Map(sigs.filter((s) => s.party_id).map((s) => [s.party_id!, s]));

  const recordCopy = () => signedCopy.mutate({ id: doc.id, keys: photos.map((p) => p.key) }, {
    onSuccess: () => { setPhotos([]); onClose(); },
    onError: async (e) => toast.error(await extractErrorMessage(e, 'The signed copy could not be recorded.')),
  });

  return (
    <FormSheet open onOpenChange={(v) => !v && onClose()} size="md" title={`Signatures: ${doc.title}`}
      description={`${doc.number}. Each person named accepts with a code sent to their record, or record a signed paper copy.`}>
      <div className="space-y-5 text-sm">
        {isLoading ? <Skeleton className="h-24" /> : (
          <ul className="divide-y rounded-xl border">
            {(doc.party_ids ?? []).map((pid) => <PartyLine key={pid} docId={doc.id} partyId={pid} signed={byParty.get(pid)} canSign={open} />)}
          </ul>
        )}

        {open && (
          <div className="space-y-2 rounded-xl border p-3">
            <p className="font-medium">Signed on paper instead</p>
            <p className="text-muted-foreground">Photograph each signed page. Recording the copy marks the agreement signed.</p>
            <PhotoPicker slug={slug} kind="documents" value={photos} onChange={setPhotos} max={20} label="Add page" />
            <Button variant="outline" disabled={!photos.length || signedCopy.isPending} onClick={recordCopy}>
              <FileSignature /> {signedCopy.isPending ? 'Recording...' : 'Record signed copy'}
            </Button>
          </div>
        )}

        {sigs.length > 0 && (
          <div className="space-y-1">
            <p className="font-medium">Record</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {sigs.map((s) => <li key={s.id}>{describe(s)}</li>)}
            </ul>
          </div>
        )}
      </div>
    </FormSheet>
  );
}

function describe(s: DocumentSignature): string {
  const when = fmtDateTime(s.signed_at);
  if (s.method === 'wet_upload') return `${when}: signed paper copy recorded at the office`;
  const via = s.device?.via === 'office' ? 'at the office' : 'in the portal';
  return `${when}: accepted by code ${via}${s.ip ? ` from ${s.ip}` : ''}`;
}

function PartyLine({ docId, partyId, signed, canSign }: { docId: string; partyId: string; signed?: DocumentSignature; canSign: boolean }) {
  const { data: party } = useParty(partyId);
  const { sendCode, accept } = useSigning();
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const name = party ? partyName(party) : 'Person named on the document';
  const fail = (fallback: string) => async (e: unknown) => toast.error(await extractErrorMessage(e, fallback));

  return (
    <li className="space-y-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{name}</span>
        {signed ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary" aria-hidden /> Accepted {fmtDateTime(signed.signed_at)}</span>
        ) : canSign ? (
          <Button size="sm" variant="outline" disabled={sendCode.isPending}
            onClick={() => sendCode.mutate({ id: docId, partyId }, { onSuccess: () => setSent(true), onError: fail('The code could not be sent.') })}>
            <Send /> {sent ? 'Send a new code' : 'Send code'}
          </Button>
        ) : null}
      </div>
      {!signed && canSign && sent && (
        <div className="flex gap-2">
          <Input inputMode="numeric" maxLength={6} placeholder="6 digit code" className="w-40" aria-label={`Code read back by ${name}`}
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          <Button size="sm" disabled={code.length !== 6 || accept.isPending}
            onClick={() => accept.mutate({ id: docId, partyId, code }, { onSuccess: () => setCode(''), onError: fail('The code was not accepted.') })}>
            Accept
          </Button>
        </div>
      )}
    </li>
  );
}
