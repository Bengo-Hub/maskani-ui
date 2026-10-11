'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, Plus, Send, ShieldCheck } from 'lucide-react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { extractErrorMessage } from '@bengo-hub/shared-ui-lib/documents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Field, NativeSelect, TextArea } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { KeysetTable } from '@/components/common/keyset-table';
import { ToneBadge, type Tone } from '@/components/common/status-badge';
import { PartyPicker } from '@/components/register/party-picker';
import { usePrivacyActions, usePrivacyRequests } from '@/hooks/use-settings';
import { useSlug } from '@/hooks/use-access';
import { downloadBlob } from '@/lib/api/client';
import { settingsApi } from '@/lib/api/operations';
import type { Party, PrivacyKind, PrivacyRequest, PrivacyStatus } from '@/lib/api/types';
import { fmtDate, fmtDateTime } from '@/lib/utils';

export const PRIVACY_KIND: Record<PrivacyKind, string> = {
  access: 'A copy of their data', correction: 'A correction', deletion: 'Erasure of their details',
};

const STATUS: Record<PrivacyStatus, { label: string; tone: Tone }> = {
  received: { label: 'Check identity', tone: 'warning' },
  verified: { label: 'To do', tone: 'primary' },
  in_progress: { label: 'In progress', tone: 'primary' },
  completed: { label: 'Done', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'neutral' },
};

const isOpen = (r: PrivacyRequest) => r.status === 'received' || r.status === 'verified' || r.status === 'in_progress';
const isLate = (r: PrivacyRequest) => isOpen(r) && new Date(r.due_at).getTime() < Date.now();

/**
 * Data subject requests: a copy of a person's data, a correction or erasure, each with its legal
 * deadline (7 days for a copy, 14 for the others). Office requests need the person's identity
 * confirmed first, by a code to the phone on record or in person.
 */
export function PrivacyRequests() {
  const [status, setStatus] = useState<PrivacyStatus | ''>('');
  const [overdue, setOverdue] = useState(false);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<PrivacyRequest | null>(null);
  const list = usePrivacyRequests({ status, overdue });

  const columns = useMemo<DataTableColumn<PrivacyRequest>[]>(() => [
    { key: 'who', header: 'Person', primary: true, accessor: (r) => r.requester_name ?? '',
      render: (r) => <span className="font-medium">{r.requester_name || 'Erased person'}</span> },
    { key: 'kind', header: 'Asks for', accessor: (r) => r.kind, render: (r) => <span className="text-sm">{PRIVACY_KIND[r.kind]}</span> },
    { key: 'status', header: 'Status', accessor: (r) => r.status,
      render: (r) => isLate(r) ? <ToneBadge tone="danger">Overdue</ToneBadge> : <ToneBadge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</ToneBadge> },
    { key: 'due', header: 'Respond by', accessor: (r) => r.due_at, render: (r) => <span className="text-sm tabular">{fmtDate(r.due_at)}</span> },
    { key: 'source', header: 'Made', hideBelow: 'lg', accessor: (r) => r.metadata?.source ?? '',
      render: (r) => <span className="text-sm text-muted-foreground">{r.metadata?.source === 'office' ? 'At the office' : 'In the portal'}</span> },
  ], []);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Privacy requests</h2>
          <p className="text-sm text-muted-foreground">Residents asking for a copy of their data, a correction or erasure. The law sets the deadline.</p>
        </div>
        <Button onClick={() => setAdding(true)}><Plus /> Record a request</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <NativeSelect className="w-48" value={status} onChange={(e) => setStatus(e.target.value as PrivacyStatus | '')} aria-label="Status">
          <option value="">Every status</option>
          {(Object.keys(STATUS) as PrivacyStatus[]).filter((s) => s !== 'in_progress').map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
        </NativeSelect>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={overdue} onCheckedChange={setOverdue} /> Overdue only
        </label>
      </div>
      <KeysetTable columns={columns} rows={list.rows} rowKey={(r) => r.id} loading={list.isLoading} error={list.isError}
        onRetry={() => void list.refetch()} hasMore={list.hasMore} loadMore={() => void list.loadMore()} loadingMore={list.loadingMore}
        onRowClick={setOpen} emptyText="No privacy requests." />
      <NewRequestSheet open={adding} onOpenChange={setAdding} />
      {open && <RequestSheet request={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function NewRequestSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [person, setPerson] = useState<Party | null>(null);
  const [kind, setKind] = useState<PrivacyKind>('access');
  const [notes, setNotes] = useState('');
  const { create } = usePrivacyActions();
  const save = () => {
    if (!person) return;
    create.mutate({ party_id: person.id, kind, notes: notes.trim() || undefined }, {
      onSuccess: () => { onOpenChange(false); setPerson(null); setNotes(''); setKind('access'); },
    });
  };
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Record a privacy request"
      description="For a request made by phone, letter or in person. You confirm who they are next."
      footer={<Button disabled={!person || (kind === 'correction' && !notes.trim()) || create.isPending} onClick={save}>{create.isPending ? 'Saving...' : 'Record request'}</Button>}>
      <div className="space-y-4">
        <Field label="Person" required><PartyPicker value={person} onChange={setPerson} allowNew={false} /></Field>
        <Field label="They ask for" required>
          <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as PrivacyKind)}>
            {(Object.keys(PRIVACY_KIND) as PrivacyKind[]).map((k) => <option key={k} value={k}>{PRIVACY_KIND[k]}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Notes" required={kind === 'correction'} hint={kind === 'correction' ? 'What should be corrected' : 'Anything the office should know'}>
          <TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
        </Field>
      </div>
    </FormSheet>
  );
}

function RequestSheet({ request: r, onClose }: { request: PrivacyRequest; onClose: () => void }) {
  const slug = useSlug();
  const { sendCode, verify, close } = usePrivacyActions();
  const [code, setCode] = useState('');
  const [inPerson, setInPerson] = useState(false);
  const [note, setNote] = useState('');
  const [text, setText] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const after = { onSuccess: onClose };

  const download = async () => {
    setDownloading(true);
    try {
      const { blob, fileName } = await settingsApi.privacyExport(slug, r.id);
      downloadBlob(blob, fileName);
    } catch (err) {
      toast.error(await extractErrorMessage(err, 'The export could not be downloaded.'));
    } finally {
      setDownloading(false);
    }
  };

  const verified = r.status === 'verified' || r.status === 'in_progress';
  return (
    <FormSheet open onOpenChange={(v) => !v && onClose()} title={PRIVACY_KIND[r.kind]}
      description={`${r.requester_name || 'Erased person'}, received ${fmtDate(r.received_at)}, respond by ${fmtDate(r.due_at)}`}>
      <div className="space-y-5 text-sm">
        {r.notes && <p className="rounded-lg bg-muted px-3 py-2">{r.notes}</p>}

        {r.status === 'received' && (
          <div className="space-y-3">
            <p className="font-medium">Confirm who they are</p>
            {!inPerson ? (
              <>
                <p className="text-muted-foreground">Send a code to the phone and email on record, then type the code they read back to you. It lasts 5 minutes.</p>
                <Button variant="outline" disabled={sendCode.isPending} onClick={() => sendCode.mutate(r.id)}><Send /> {r.metadata?.codes_sent ? 'Send a new code' : 'Send code'}</Button>
                <div className="flex gap-2">
                  <Input inputMode="numeric" maxLength={6} placeholder="6 digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="w-40" aria-label="Code" />
                  <Button disabled={code.length !== 6 || verify.isPending} onClick={() => verify.mutate({ id: r.id, code }, after)}><ShieldCheck /> Confirm</Button>
                </div>
                <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={() => setInPerson(true)}>They are here in person</button>
              </>
            ) : (
              <>
                <Field label="How you identified them" required hint="For example: national ID seen, last four digits 5678">
                  <Input value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
                <div className="flex gap-2">
                  <Button disabled={!note.trim() || verify.isPending} onClick={() => verify.mutate({ id: r.id, in_person: true, note }, after)}><ShieldCheck /> Confirm identity</Button>
                  <Button variant="ghost" onClick={() => setInPerson(false)}>Use a code instead</Button>
                </div>
              </>
            )}
          </div>
        )}

        {verified && (
          <div className="space-y-3">
            <p className="text-muted-foreground">Identity confirmed {r.metadata?.verified_by === 'portal' ? 'by their portal sign-in' : r.metadata?.verified_by === 'code' ? 'by code' : 'in person'}.</p>
            {r.kind === 'access' && (
              <>
                <Button variant="outline" disabled={downloading} onClick={() => void download()}><Download /> {downloading ? 'Preparing...' : 'Download their data'}</Button>
                <Field label="How it was given" hint="Optional, for example: emailed on request">
                  <Input value={text} onChange={(e) => setText(e.target.value)} />
                </Field>
                <Button disabled={close.isPending} onClick={() => close.mutate({ id: r.id, action: 'complete', text }, after)}>Mark as done</Button>
                <p className="text-xs text-muted-foreground">Once done, the person can also download it from the portal.</p>
              </>
            )}
            {r.kind === 'correction' && (
              <>
                <p>Correct the details on the person&apos;s page, then record what changed.</p>
                <Field label="What was corrected" required><Input value={text} onChange={(e) => setText(e.target.value)} /></Field>
                <Button disabled={!text.trim() || close.isPending} onClick={() => close.mutate({ id: r.id, action: 'complete', text }, after)}>Mark as corrected</Button>
              </>
            )}
            {r.kind === 'deletion' && (
              <>
                <p>Erasing clears their name, phone, email, identity numbers and portal access, and removes their vehicles. Bills, payments and contracts stay, as the law requires. A current owner or occupant cannot be erased until their link to the unit ends.</p>
                <Button variant="destructive" onClick={() => setErasing(true)}>Erase their details</Button>
              </>
            )}
          </div>
        )}

        {isOpen(r) && (
          <div className="space-y-2 border-t pt-4">
            {!rejecting ? (
              <Button variant="ghost" onClick={() => setRejecting(true)}>Reject the request</Button>
            ) : (
              <>
                <Field label="Reason" required hint="The person is told this reason"><TextArea rows={2} value={text} onChange={(e) => setText(e.target.value)} /></Field>
                <Button variant="outline" disabled={!text.trim() || close.isPending} onClick={() => close.mutate({ id: r.id, action: 'reject', text }, after)}>Reject</Button>
              </>
            )}
          </div>
        )}

        {!isOpen(r) && (
          <div className="space-y-1">
            <p className="font-medium">{STATUS[r.status].label}{r.completed_at && <> on {fmtDateTime(r.completed_at)}</>}</p>
            {(r.metadata?.outcome || r.metadata?.reason) && <p className="text-muted-foreground">{r.metadata?.outcome || r.metadata?.reason}</p>}
            {r.status === 'completed' && r.kind === 'access' && (
              <Button variant="outline" disabled={downloading} onClick={() => void download()}><Download /> Download again</Button>
            )}
          </div>
        )}
      </div>
      <ConfirmDialog open={erasing} onOpenChange={setErasing} variant="danger" title="Erase this person's details?"
        description="This cannot be undone. Their financial records stay under a reference."
        confirmLabel="Erase" loading={close.isPending}
        onConfirm={() => close.mutate({ id: r.id, action: 'anonymise' }, { onSuccess: () => { setErasing(false); onClose(); } })} />
    </FormSheet>
  );
}
