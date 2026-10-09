'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileText, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Field } from '@/components/common/field';
import { ToneBadge } from '@/components/common/status-badge';
import { useAccess } from '@/hooks/use-access';
import { useDocTemplateMutations, useDocTemplates } from '@/hooks/use-documents';
import type { DocKind, DocTemplate } from '@/lib/api/types';
import { cn, fmtDate } from '@/lib/utils';

/**
 * The wording of each document an estate issues. The Codevertex starter is used until the estate
 * approves its own: edits are saved as a draft and only documents.manage approves a draft.
 * {{field}} places a value from the records; a field without a value prints a blank to fill.
 */
export function DocumentTemplates() {
  const { data, isLoading } = useDocTemplates();
  const [code, setCode] = useState('');
  const kinds = data?.kinds ?? [];
  const active = kinds.find((k) => k.code === code) ?? kinds[0];

  if (isLoading) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (!active) return <p className="text-sm text-muted-foreground">No document kinds are available.</p>;
  const rows = (data?.data ?? []).filter((t) => t.code === active.code);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Document kinds">
        {kinds.map((k) => (
          <button key={k.code} type="button" role="tab" aria-selected={k.code === active.code} onClick={() => setCode(k.code)}
            className={cn('flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm font-medium',
              k.code === active.code ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted')}>
            <FileText className="h-4 w-4" /> {k.name}
          </button>
        ))}
      </div>
      <TemplateEditor key={active.code} kind={active} rows={rows} />
    </div>
  );
}

function TemplateEditor({ kind, rows }: { kind: DocKind; rows: DocTemplate[] }) {
  const { can } = useAccess();
  const manage = can('documents.manage');
  const m = useDocTemplateMutations();
  const inUse = rows.find((t) => t.status === 'approved');
  const draft = rows.find((t) => t.status === 'draft');
  const base = draft ?? inUse;
  const [name, setName] = useState(base?.name ?? kind.name);
  const [body, setBody] = useState(base?.body ?? '');
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setName(base?.name ?? kind.name); setBody(base?.body ?? ''); }, [base?.version, base?.status, base?.body, base?.name, kind.name]);

  const unknown = useMemo(() => {
    const allowed = new Set(kind.merge_fields);
    return [...new Set([...body.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((x) => x[1]))].filter((f) => !allowed.has(f));
  }, [body, kind.merge_fields]);
  const dirty = body !== (base?.body ?? '') || name !== (base?.name ?? kind.name);

  const insert = (f: string) => {
    const el = area.current;
    const token = `{{${f}}}`;
    if (!el) { setBody((b) => b + token); return; }
    const { selectionStart: s, selectionEnd: e } = el;
    const next = body.slice(0, s) + token + body.slice(e);
    setBody(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + token.length, s + token.length); });
  };

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">In use:</span>
        {inUse?.version ? (
          <ToneBadge tone="primary">Version {inUse.version}{inUse.approved_at ? `, approved ${fmtDate(inUse.approved_at)}` : ''}</ToneBadge>
        ) : <ToneBadge tone="neutral">Codevertex starter</ToneBadge>}
        {draft && <ToneBadge tone="gold">Draft version {draft.version} waiting for approval</ToneBadge>}
      </div>

      <Field label="Title on the document" htmlFor="tpl-name">
        <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!manage} />
      </Field>
      <Field label="Wording" htmlFor="tpl-body" hint="Blank lines start a new paragraph; a line starting with ** is a bold heading.">
        <textarea id="tpl-body" ref={area} value={body} onChange={(e) => setBody(e.target.value)} rows={16} disabled={!manage}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-input/30" />
      </Field>
      {unknown.length > 0 && (
        <p className="text-sm text-destructive" role="alert">Not a field for this document: {unknown.map((f) => `{{${f}}}`).join(', ')}</p>
      )}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Fields you can place (click to insert at the cursor)</p>
        <div className="flex flex-wrap gap-1.5">
          {kind.merge_fields.map((f) => (
            <button key={f} type="button" disabled={!manage} onClick={() => insert(f)}
              className="cursor-pointer rounded-full border bg-background px-2.5 py-0.5 font-mono text-xs hover:border-primary disabled:cursor-default">
              {f}{kind.inputs?.includes(f) ? ' (typed when issuing)' : ''}
            </button>
          ))}
        </div>
      </div>
      {manage && (
        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <Button variant="outline" disabled={!dirty || unknown.length > 0 || !body.trim() || m.save.isPending}
            onClick={() => m.save.mutate({ kind: kind.code, name: name.trim() || kind.name, body })}>
            <Save /> {m.save.isPending ? 'Saving...' : 'Save draft'}
          </Button>
          {draft && (
            <Button disabled={dirty || m.approve.isPending} onClick={() => m.approve.mutate({ kind: kind.code, version: draft.version })}
              title={dirty ? 'Save the draft first' : undefined}>
              <CheckCircle2 /> Approve and use
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
