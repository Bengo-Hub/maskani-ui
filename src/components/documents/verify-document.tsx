'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2, SearchCheck, ShieldCheck, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { verifyDocument } from '@/lib/api/documents';
import type { DocumentVerification } from '@/lib/api/types';
import { fmtDate } from '@/lib/utils';

const STATUS: Record<string, string> = {
  issued: 'Issued', partly_signed: 'Partly signed', executed: 'Signed by everyone', expired: 'Expired', superseded: 'Replaced by a newer document',
};

/**
 * The public check for a Maskani document: the code printed at the foot of a letter or certificate
 * shows whether it was issued, by whom and when. Nothing personal is shown.
 */
export function VerifyDocument({ initialCode = '' }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [state, setState] = useState<{ loading: boolean; result?: DocumentVerification | null; error?: string }>({ loading: !!initialCode });

  useEffect(() => {
    if (!initialCode) return;
    let live = true;
    setState({ loading: true });
    verifyDocument(initialCode)
      .then((r) => { if (live) setState({ loading: false, result: r }); })
      .catch((e: Error) => { if (live) setState({ loading: false, error: e.message }); });
    return () => { live = false; };
  }, [initialCode]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c) router.push(`/verify/${c}`);
  };
  const r = state.result;
  const good = r && r.status !== 'superseded' && r.status !== 'expired';

  return (
    <main className="flex min-h-dvh flex-col items-center bg-background px-4 py-10">
      <Image src="/brand/maskani-logo-dark.svg" alt="Maskani" width={150} height={40} className="mb-8 h-10 w-auto dark:invert" priority />
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold">Check a document</h1>
          <p className="mt-1 text-sm text-muted-foreground">Type the verification code printed at the foot of the letter or certificate.</p>
        </div>
        <form onSubmit={submit} className="flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. K7MX2QRT9A" aria-label="Verification code"
            className="h-12 font-mono text-lg uppercase tracking-widest" autoComplete="off" maxLength={14} />
          <Button type="submit" size="lg" className="h-12"><SearchCheck /> Check</Button>
        </form>

        {state.loading && <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking</p>}
        {state.error && <p className="text-center text-sm text-destructive" role="alert">{state.error}</p>}
        {!state.loading && initialCode && r === null && (
          <div className="flex items-start gap-3 rounded-2xl border-2 border-destructive bg-destructive/5 p-5" role="status">
            <ShieldX className="h-8 w-8 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold">No document has this code</p>
              <p className="text-sm text-muted-foreground">Check the code for typing mistakes. If it is right, the document did not come from Maskani; ask the estate office.</p>
            </div>
          </div>
        )}
        {r && (
          <div className={`space-y-4 rounded-2xl border-2 p-5 ${good ? 'border-success bg-success/5' : 'border-warning bg-warning/10'}`} role="status">
            <div className="flex items-center gap-3">
              <ShieldCheck className={`h-8 w-8 shrink-0 ${good ? 'text-success' : 'text-warning-foreground'}`} />
              <div>
                <p className="font-semibold">{good ? 'This document is genuine' : 'This document is no longer current'}</p>
                <p className="text-sm text-muted-foreground">{STATUS[r.status] ?? r.status}</p>
              </div>
            </div>
            <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Document</dt><dd className="font-medium">{r.title}</dd>
              <dt className="text-muted-foreground">Number</dt><dd className="font-mono">{r.number}</dd>
              <dt className="text-muted-foreground">Issued by</dt><dd>{r.issuer || 'Not recorded'}</dd>
              <dt className="text-muted-foreground">Issued on</dt><dd>{fmtDate(r.issued_at)}</dd>
              <dt className="text-muted-foreground">File fingerprint</dt><dd className="break-all font-mono text-xs">{r.sha256}</dd>
            </dl>
            <p className="text-xs text-muted-foreground">The fingerprint (SHA-256) matches only the original PDF; a changed copy has a different one.</p>
          </div>
        )}
      </div>
    </main>
  );
}
