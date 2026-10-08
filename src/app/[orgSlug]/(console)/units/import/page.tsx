'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Field, NativeSelect } from '@/components/common/field';
import { PageHeader } from '@/components/common/page-header';
import { PropertyRequired } from '@/components/common/property-required';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useCommitImport, useImportJob, useImports, useValidateImport } from '@/hooks/use-imports';
import { useProperties } from '@/hooks/use-register';
import { importsApi, type ImportJob } from '@/lib/api/imports';
import { apiErrorMessage } from '@/lib/api/errors';
import { qk } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { useSelectedPropertyId } from '@/store/property';

const COUNT_LABELS: [string, string][] = [
  ['units_create', 'New units'],
  ['units_update', 'Units updated'],
  ['blocks_create', 'New blocks'],
  ['owners_create', 'New owners'],
  ['owners_existing', 'Owners already on file'],
  ['links_create', 'Owners linked to units'],
];

/** CSV import of units and owners (SRDD 16.1): check the file first, then save it in the background. */
export default function ImportUnitsPage() {
  const slug = useSlug();
  const qc = useQueryClient();
  const { can } = useAccess();
  const selected = useSelectedPropertyId(slug);
  const { data: properties = [] } = useProperties();
  const [propertyId, setPropertyId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = useValidateImport();
  const commit = useCommitImport();
  const { data: job } = useImportJob(jobId);
  const { data: recent = [] } = useImports();

  useEffect(() => { if (!propertyId && selected) setPropertyId(selected); }, [selected, propertyId]);

  // Once a commit finishes, the unit and owner lists are stale.
  const status = job?.status;
  useEffect(() => {
    if (status === 'committed') {
      void qc.invalidateQueries({ queryKey: qk.units(slug) });
      void qc.invalidateQueries({ queryKey: qk.parties(slug) });
    }
  }, [status, qc, slug]);

  if (!can('imports.run')) {
    return <p className="text-sm text-muted-foreground">You need the data import permission to load a register.</p>;
  }
  if (properties.length === 0) return <PropertyRequired what="import units and owners" />;

  const check = () => {
    if (!file || !propertyId) return;
    setError('');
    validate.mutate({ propertyId, file }, {
      onSuccess: (j) => setJobId(j.id),
      onError: (e) => setError(apiErrorMessage(e, 'The file could not be checked.')),
    });
  };

  const reset = () => {
    setFile(null);
    setJobId('');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Import units and owners"
        subtitle="Load the estate register from a spreadsheet. We check every row first and save nothing until you confirm."
        back={{ href: `/${slug}/units`, label: 'Units' }}
        actions={
          <Button variant="outline" onClick={() => void importsApi.downloadTemplate(slug).catch((e) => setError(apiErrorMessage(e)))}>
            <Download /> Template
          </Button>
        }
      />

      {!job ? (
        <section className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
          <Field label="Property" htmlFor="imp-prop">
            <NativeSelect id="imp-prop" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              <option value="">Choose a property</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </NativeSelect>
          </Field>

          <label
            htmlFor="imp-file"
            className={cn(
              'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors hover:border-primary/40 hover:bg-secondary/40',
              file && 'border-primary/40 bg-secondary/40',
            )}
          >
            <FileSpreadsheet className="h-8 w-8 text-primary" aria-hidden />
            <span className="font-medium">{file ? file.name : 'Choose a CSV file'}</span>
            <span className="text-sm text-muted-foreground">
              {file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : 'Columns: unit_code (required), block, unit_type, bedrooms, owner_name, owner_phone and more. Up to 5,000 rows.'}
            </span>
            <input
              ref={inputRef}
              id="imp-file"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(''); }}
            />
          </label>

          {error && <p className="flex items-start gap-2 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</p>}

          <div className="flex justify-end">
            <Button size="lg" onClick={check} disabled={!file || !propertyId || validate.isPending}>
              {validate.isPending ? <Loader2 className="animate-spin" /> : <Upload />} Check the file
            </Button>
          </div>
        </section>
      ) : (
        <ImportReport job={job} committing={commit.isPending} onCommit={() => commit.mutate(job.id, { onError: (e) => setError(apiErrorMessage(e)) })} onReset={reset} error={error} />
      )}

      {recent.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Recent imports</h2>
          <ul className="divide-y rounded-2xl border bg-card">
            {recent.slice(0, 8).map((j) => (
              <li key={j.id}>
                <button type="button" onClick={() => setJobId(j.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-secondary/40">
                  <span className="min-w-0 truncate">{j.file_name || 'Import'}</span>
                  <span className="shrink-0 text-muted-foreground">{STATUS_LABEL[j.status]}, {j.rows_valid} of {j.rows_total} rows</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<ImportJob['status'], string> = {
  validating: 'Checking',
  validated: 'Ready to save',
  committing: 'Saving',
  committed: 'Saved',
  failed: 'Failed',
};

function ImportReport({ job, committing, onCommit, onReset, error }: {
  job: ImportJob;
  committing: boolean;
  onCommit: () => void;
  onReset: () => void;
  error: string;
}) {
  const counts = job.summary?.counts ?? {};
  const errors = job.errors ?? [];
  const done = job.status === 'committed';
  const saving = job.status === 'committing';
  const pct = job.rows_valid > 0 ? Math.round((job.rows_committed / job.rows_valid) * 100) : 0;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{job.file_name || 'Import'}</p>
            <p className="text-sm text-muted-foreground">
              {job.rows_valid} of {job.rows_total} rows are ready{job.rows_failed > 0 ? `, ${job.rows_failed} need fixing` : ''}.
            </p>
          </div>
          <span className={cn('rounded-full px-3 py-1 text-xs font-medium', done ? 'bg-success/10 text-success' : job.status === 'failed' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground')}>
            {STATUS_LABEL[job.status]}
          </span>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {COUNT_LABELS.filter(([k]) => counts[k]).map(([k, l]) => (
            <div key={k} className="rounded-xl bg-secondary/50 px-4 py-3">
              <dt className="text-xs text-muted-foreground">{l}</dt>
              <dd className="tabular text-xl font-semibold">{counts[k]}</dd>
            </div>
          ))}
        </dl>

        {(saving || done) && (
          <div className="mt-5 space-y-2">
            <Progress value={done ? 100 : pct} />
            <p className="text-sm text-muted-foreground">
              {done
                ? <span className="inline-flex items-center gap-1.5 text-success"><CheckCircle2 className="h-4 w-4" /> Saved {job.rows_committed} rows.</span>
                : `Saving ${job.rows_committed} of ${job.rows_valid} rows...`}
            </p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onReset}>{done ? 'Import another file' : 'Choose a different file'}</Button>
          {job.status === 'validated' && (
            <Button onClick={onCommit} disabled={committing}>
              {committing ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Save {job.rows_valid} rows
            </Button>
          )}
        </div>
      </div>

      {errors.length > 0 && (
        <div className="rounded-2xl border bg-card">
          <p className="border-b px-5 py-3 text-sm font-semibold">
            {done ? 'Rows that could not be saved' : 'Rows to fix'} ({errors.length})
          </p>
          <ul className="max-h-96 divide-y overflow-auto text-sm">
            {errors.slice(0, 500).map((e, i) => (
              <li key={`${e.line}-${e.field ?? ''}-${i}`} className="flex gap-3 px-5 py-2.5">
                <span className="w-16 shrink-0 tabular text-muted-foreground">Line {e.line}</span>
                <span>{e.field ? <span className="font-medium">{e.field}: </span> : null}{e.message}</span>
              </li>
            ))}
          </ul>
          {!done && job.rows_valid > 0 && (
            <p className="border-t px-5 py-3 text-xs text-muted-foreground">Saving now skips these rows. Fix them in the spreadsheet and import it again; rows already saved are updated, never duplicated.</p>
          )}
        </div>
      )}
    </section>
  );
}
