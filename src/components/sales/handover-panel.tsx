'use client';

import { useState } from 'react';
import { CheckCircle2, KeySquare, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { IconButton } from '@/components/common/icon-button';
import { StatusBadge } from '@/components/common/status-badge';
import { useAccess } from '@/hooks/use-access';
import { useHandover, useUnitMeters } from '@/hooks/use-sales';
import { apiErrorMessage } from '@/lib/api/errors';
import type { ChecklistItem, Handover, HandoverKey, SaleContract, Snag } from '@/lib/api/types';
import { apiDate, fmtDate, num, todayInput } from '@/lib/utils';

const dayOf = (v?: string | null) => (v ? todayInput(new Date(v)) : '');

/**
 * Handover of a fully paid unit: book it, walk the checklist, record the keys and any snags, then
 * complete it with the meter readings. On completion the buyer becomes the owner, estate billing
 * starts (prorated) and water is measured from the handover reading. Snags can still be closed after.
 */
export function HandoverPanel({ contract }: { contract: SaleContract }) {
  const { can } = useAccess();
  const manage = can('sales.manage');
  const ho = contract.handover ?? null;
  const { start, save, complete } = useHandover(contract.id);
  const [bookOn, setBookOn] = useState(todayInput());
  // Held here: saving refreshes the handover and remounts the editor.
  const [closing, setClosing] = useState(false);

  if (!ho && contract.status !== 'fully_paid') return null;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Handover</CardTitle>
        {ho && <StatusBadge status={ho.status} />}
      </CardHeader>
      <CardContent>
        {!ho ? (
          manage ? (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Handover date" htmlFor="ho-date"><Input id="ho-date" type="date" value={bookOn} onChange={(e) => setBookOn(e.target.value)} /></Field>
              <Button onClick={() => start.mutate(bookOn ? apiDate(bookOn) : undefined)} disabled={start.isPending}><KeySquare /> {start.isPending ? 'Booking...' : 'Book the handover'}</Button>
              <p className="w-full text-sm text-muted-foreground">The contract is fully paid, so the unit can be handed over.</p>
            </div>
          ) : <p className="text-sm text-muted-foreground">Fully paid. The handover has not been booked yet.</p>
        ) : (
          <HandoverEditor key={`${ho.id}:${ho.updated_at ?? ''}`} ho={ho} manage={manage} save={save} onComplete={() => setClosing(true)} />
        )}
        {ho && closing && <CompleteSheet ho={ho} contract={contract} complete={complete} onClose={() => setClosing(false)} />}
      </CardContent>
    </Card>
  );
}

function HandoverEditor({ ho, manage, save, onComplete }: {
  ho: Handover;
  manage: boolean;
  save: ReturnType<typeof useHandover>['save'];
  onComplete: () => void;
}) {
  const done = ho.status === 'completed';
  const [when, setWhen] = useState(dayOf(ho.scheduled_at));
  const [keys, setKeys] = useState<HandoverKey[]>(ho.keys?.length ? ho.keys : [{ label: 'Door keys', count: 2 }]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(ho.checklist ?? []);
  const [snags, setSnags] = useState<Snag[]>(ho.snag_items ?? []);
  const [newItem, setNewItem] = useState('');
  const [error, setError] = useState('');
  const editable = manage && !done;
  const openSnags = snags.filter((s) => s.status !== 'fixed').length;

  const persist = (onDone?: () => void) => {
    setError('');
    const body = done
      ? { snags }
      : { scheduled_at: when ? apiDate(when) : undefined, keys: keys.filter((k) => k.label.trim()), checklist, snags };
    save.mutate({ id: ho.id, body }, { onSuccess: () => onDone?.(), onError: (e) => setError(apiErrorMessage(e)) });
  };

  return (
    <div className="space-y-5">
      {done ? (
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">Handed over</dt><dd>{fmtDate(ho.completed_at)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Keys</dt><dd>{(ho.keys ?? []).map((k) => `${k.count} ${k.label}`).join(', ') || 'None'}</dd></div>
          <div className="col-span-2"><dt className="text-xs text-muted-foreground">Meter readings</dt><dd>{(ho.readings ?? []).map((r) => `${r.serial ?? 'Meter'}: ${num(r.reading)}`).join(', ') || 'None taken'}</dd></div>
        </dl>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-3">
            <Field label="Handover date" htmlFor="ho-when"><Input id="ho-when" type="date" value={when} disabled={!editable} onChange={(e) => setWhen(e.target.value)} /></Field>
            <div className="space-y-2">
              <p className="text-sm font-medium">Keys and items handed over</p>
              {keys.map((k, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input aria-label="Item" value={k.label} disabled={!editable} onChange={(e) => setKeys(keys.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <Input aria-label="How many" className="w-20" inputMode="numeric" value={k.count} disabled={!editable} onChange={(e) => setKeys(keys.map((x, j) => (j === i ? { ...x, count: Number(e.target.value.replace(/\D/g, '')) || 0 } : x)))} />
                  {editable && <IconButton label="Remove this item" onClick={() => setKeys(keys.filter((_, j) => j !== i))}><Trash2 /></IconButton>}
                </div>
              ))}
              {editable && <Button size="sm" variant="outline" onClick={() => setKeys([...keys, { label: '', count: 1 }])}><Plus /> Add an item</Button>}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Walk-through checklist</p>
            <ul className="space-y-1.5">
              {checklist.map((c, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Checkbox id={`ho-c-${i}`} checked={c.ok} disabled={!editable} onCheckedChange={(v) => setChecklist(checklist.map((x, j) => (j === i ? { ...x, ok: !!v } : x)))} />
                  <label htmlFor={`ho-c-${i}`} className={c.ok ? 'text-muted-foreground line-through' : ''}>{c.item}</label>
                </li>
              ))}
            </ul>
            {editable && (
              <div className="flex gap-2">
                <Input aria-label="Add a checklist item" placeholder="Add a checklist item" value={newItem} onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newItem.trim()) { setChecklist([...checklist, { item: newItem.trim(), ok: false }]); setNewItem(''); } }} />
                <Button variant="outline" disabled={!newItem.trim()} onClick={() => { setChecklist([...checklist, { item: newItem.trim(), ok: false }]); setNewItem(''); }}>Add</Button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">Snags {snags.length > 0 && <span className="font-normal text-muted-foreground">({openSnags} open)</span>}</p>
        {snags.length === 0 && <p className="text-sm text-muted-foreground">No snags recorded.</p>}
        {snags.map((s, i) => (
          <div key={s.id ?? `new-${i}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center">
            <Input aria-label="What needs fixing" placeholder="What needs fixing" value={s.description} disabled={!manage || !!s.id && s.status === 'fixed'}
              onChange={(e) => setSnags(snags.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
            <Input aria-label="Where" placeholder="Where (room)" value={s.location ?? ''} disabled={!manage || !!s.id && s.status === 'fixed'}
              onChange={(e) => setSnags(snags.map((x, j) => (j === i ? { ...x, location: e.target.value } : x)))} />
            <div className="flex items-center gap-2">
              {s.status === 'fixed'
                ? <StatusBadge status="done" label={`Fixed ${fmtDate(s.fixed_at)}`} />
                : manage && <Button size="sm" variant="outline" onClick={() => setSnags(snags.map((x, j) => (j === i ? { ...x, status: 'fixed' } : x)))}><CheckCircle2 /> Fixed</Button>}
              {manage && !s.id && <IconButton label="Remove this snag" onClick={() => setSnags(snags.filter((_, j) => j !== i))}><Trash2 /></IconButton>}
            </div>
          </div>
        ))}
        {manage && <Button size="sm" variant="outline" onClick={() => setSnags([...snags, { description: '', status: 'open' }])}><Plus /> Add a snag</Button>}
      </div>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {manage && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => persist()} disabled={save.isPending || snags.some((s) => !s.description.trim())}>{save.isPending ? 'Saving...' : 'Save'}</Button>
          {!done && <Button onClick={() => persist(onComplete)} disabled={save.isPending || !keys.some((k) => k.label.trim())}>Complete the handover</Button>}
        </div>
      )}
    </div>
  );
}

/** Completion: the date and a reading for each meter on the unit (where the owner's water starts). */
function CompleteSheet({ ho, contract, complete, onClose }: {
  ho: Handover;
  contract: SaleContract;
  complete: ReturnType<typeof useHandover>['complete'];
  onClose: () => void;
}) {
  const { data: meters = [] } = useUnitMeters(contract.property_id, contract.unit_id, true);
  const [on, setOn] = useState(dayOf(ho.scheduled_at) || todayInput());
  const [readings, setReadings] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const submit = () => {
    setError('');
    const rows = meters.filter((m) => readings[m.id]?.trim()).map((m) => ({ meter_id: m.id, reading: Number(readings[m.id]) }));
    complete.mutate({ id: ho.id, handedOverAt: apiDate(on), readings: rows }, { onSuccess: onClose, onError: (e) => setError(apiErrorMessage(e)) });
  };

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      size="md"
      title="Complete the handover"
      description="The buyer becomes the owner, estate billing starts from this date (prorated) and water is billed from these readings."
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={!on || complete.isPending}>{complete.isPending ? 'Completing...' : 'Complete'}</Button>
      </>}
    >
      <div className="space-y-4">
        <Field label="Handed over on" htmlFor="hc-on"><Input id="hc-on" type="date" max={todayInput()} value={on} onChange={(e) => setOn(e.target.value)} /></Field>
        {meters.length === 0
          ? <p className="text-sm text-muted-foreground">No meters on this unit. Add one under Meter readings if water is billed here.</p>
          : meters.map((m) => (
            <Field key={m.id} label={`Reading on meter ${m.serial}`} htmlFor={`hc-${m.id}`} hint="Leave blank to skip">
              <Input id={`hc-${m.id}`} inputMode="decimal" value={readings[m.id] ?? ''} onChange={(e) => setReadings({ ...readings, [m.id]: e.target.value.replace(/[^\d.]/g, '') })} />
            </Field>
          ))}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      </div>
    </FormSheet>
  );
}
