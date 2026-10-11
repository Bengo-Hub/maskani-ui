'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Field, NativeSelect, TextArea } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { IconButton } from '@/components/common/icon-button';
import { StatusBadge } from '@/components/common/status-badge';
import { useAccess } from '@/hooks/use-access';
import { useContractTitle, useSetTitleStage } from '@/hooks/use-sales';
import { apiErrorMessage } from '@/lib/api/errors';
import type { SaleContract, TitleStage, TitleStageInput, TitleStageStatus } from '@/lib/api/types';
import { apiDate, fmtDate, todayInput } from '@/lib/utils';

const STATUS_LABEL: Record<TitleStageStatus, string> = { pending: 'Not started', in_progress: 'In progress', done: 'Done', blocked: 'Held up' };
const TITLE_STAGES_FROM: SaleContract['status'][] = ['fully_paid', 'handed_over', 'titled'];

/**
 * Title stages for a sold unit, in the estate's own order (Settings, Lists, title stages). Work
 * starts once the contract is fully paid; marking "Title released to owner" (title_released) done marks
 * the sale titled.
 */
export function TitlePanel({ contract }: { contract: SaleContract }) {
  const { can } = useAccess();
  const open = TITLE_STAGES_FROM.includes(contract.status);
  const { data: stages = [], isLoading } = useContractTitle(contract.id, open);
  const set = useSetTitleStage(contract.id);
  const [editing, setEditing] = useState<{ stage: TitleStage; body: TitleStageInput } | null>(null);
  const [error, setError] = useState('');

  if (!open) return null;
  const done = stages.filter((s) => s.status === 'done').length;

  const edit = (st: TitleStage) => {
    setError('');
    setEditing({ stage: st, body: { status: st.status, stage_date: st.stage_date ? todayInput(new Date(st.stage_date)) : '', reference: st.reference ?? '', notes: st.notes ?? '', document_id: st.document_id ?? null } });
  };

  const submit = () => {
    if (!editing) return;
    setError('');
    const b = editing.body;
    set.mutate({ code: editing.stage.code, body: { ...b, stage_date: b.stage_date ? apiDate(b.stage_date) : undefined } }, {
      onSuccess: () => setEditing(null),
      onError: (e) => setError(apiErrorMessage(e)),
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Title</CardTitle>
        {stages.length > 0 && <span className="text-sm text-muted-foreground">{done} of {stages.length} done</span>}
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-32" /> : stages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No title stages set up. Add them under Settings, Lists, Title stages.</p>
        ) : (
          <ol className="divide-y">
            {stages.map((st, i) => (
              <li key={st.code} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium"><span className="mr-2 tabular text-muted-foreground">{i + 1}.</span>{st.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[st.stage_date && fmtDate(st.stage_date), st.reference && `Ref ${st.reference}`, st.notes].filter(Boolean).join(', ')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <StatusBadge status={st.status} label={STATUS_LABEL[st.status]} />
                  {can('sales.manage') && <IconButton label={`Update ${st.name}`} onClick={() => edit(st)}><Pencil /></IconButton>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>

      <FormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        size="sm"
        title={editing?.stage.name ?? ''}
        footer={<>
          <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={submit} disabled={set.isPending || (editing?.body.status === 'done' && !editing.body.stage_date)}>{set.isPending ? 'Saving...' : 'Save'}</Button>
        </>}
      >
        {editing && (
          <div className="space-y-4">
            <Field label="Status" htmlFor="ts-status">
              <NativeSelect id="ts-status" value={editing.body.status} onChange={(e) => setEditing({ ...editing, body: { ...editing.body, status: e.target.value as TitleStageStatus } })}>
                {(Object.keys(STATUS_LABEL) as TitleStageStatus[]).map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Date" htmlFor="ts-date" hint={editing.body.status === 'done' ? 'Needed when the stage is done' : undefined}>
              <Input id="ts-date" type="date" max={todayInput()} value={editing.body.stage_date ?? ''} onChange={(e) => setEditing({ ...editing, body: { ...editing.body, stage_date: e.target.value } })} />
            </Field>
            <Field label="Reference" htmlFor="ts-ref" hint="For example the registry or receipt number">
              <Input id="ts-ref" maxLength={120} value={editing.body.reference ?? ''} onChange={(e) => setEditing({ ...editing, body: { ...editing.body, reference: e.target.value } })} />
            </Field>
            <Field label="Notes" htmlFor="ts-notes">
              <TextArea id="ts-notes" maxLength={2000} value={editing.body.notes ?? ''} onChange={(e) => setEditing({ ...editing, body: { ...editing.body, notes: e.target.value } })} />
            </Field>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </div>
        )}
      </FormSheet>
    </Card>
  );
}
