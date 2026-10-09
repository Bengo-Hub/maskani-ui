'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormSheet } from '@/components/common/form-sheet';
import { useAcceptTerms } from '@/hooks/use-portal';
import { useAuthStore } from '@/store/auth';

/** Bump when the resident terms or privacy notice change; residents accept the new version once. */
export const TERMS_VERSION = '2026-10';

/**
 * First sign-in: the resident accepts the terms and privacy notice (SRDD 16.2 step 4, FR-19). The
 * API records the version and time on every linked party and reports it back in /auth/me, so the
 * sheet shows on any device until the current version is accepted, and never again after.
 */
export function TermsGate() {
  const me = useAuthStore((s) => s.me);
  // The estate sets its terms version in settings; a new version asks residents again.
  const version = (me?.settings?.terms_version as string | undefined) || TERMS_VERSION;
  const accepted = me?.terms_accepted_version ?? '';
  const [agree, setAgree] = useState(false);
  const accept = useAcceptTerms();
  const open = !!me && accepted < version;

  return (
    <FormSheet
      open={open}
      onOpenChange={() => { /* must accept to continue */ }}
      size="md"
      title="Before you start"
      description="Please read and accept how the estate uses your details."
      footer={<Button className="w-full sm:w-auto" disabled={!agree || accept.isPending} onClick={() => accept.mutate(version)}>{accept.isPending ? 'Saving...' : 'Accept and continue'}</Button>}
    >
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>The estate keeps your name, phone, email and unit details to bill you, record payments, let your visitors in and reach you about the estate.</p>
        <p>Bills, receipts and notices come by WhatsApp and email. Gate records are kept for 90 days. You can ask the estate office for a copy of your data, or to correct it, at any time.</p>
        <p>Payments go to the estate&apos;s own paybill and bank accounts. Codevertex runs the system for the estate and does not sell or share your data.</p>
        <label className="flex items-start gap-3 rounded-lg border p-3 text-foreground">
          <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
          <span>I accept the resident terms and the privacy notice.</span>
        </label>
      </div>
    </FormSheet>
  );
}
