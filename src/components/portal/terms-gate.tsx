'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormSheet } from '@/components/common/form-sheet';
import { useSlug } from '@/hooks/use-access';
import { portalApi } from '@/lib/api/portal';
import { useAuthStore } from '@/store/auth';

/** Bump when the resident terms or privacy notice change; residents accept the new version once. */
export const TERMS_VERSION = '2026-10';

/**
 * First sign-in: the resident accepts the terms and privacy notice (SRDD 16.2 step 4). The API
 * records the version and time; this device remembers it so the sheet does not reappear.
 */
export function TermsGate() {
  const slug = useSlug();
  const userId = useAuthStore((s) => s.me?.id ?? '');
  const key = `maskani-terms:${slug}:${userId}`;
  const [open, setOpen] = useState(false);
  const [agree, setAgree] = useState(false);
  const accept = useMutation({
    mutationFn: () => portalApi.acceptTerms(slug, TERMS_VERSION),
    onSuccess: () => {
      try { localStorage.setItem(key, TERMS_VERSION); } catch { /* storage blocked */ }
      setOpen(false);
    },
  });

  useEffect(() => {
    if (!userId) return;
    try { setOpen(localStorage.getItem(key) !== TERMS_VERSION); } catch { setOpen(true); }
  }, [key, userId]);

  return (
    <FormSheet
      open={open}
      onOpenChange={() => { /* must accept to continue */ }}
      size="md"
      title="Before you start"
      description="Please read and accept how the estate uses your details."
      footer={<Button className="w-full sm:w-auto" disabled={!agree || accept.isPending} onClick={() => accept.mutate()}>{accept.isPending ? 'Saving...' : 'Accept and continue'}</Button>}
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
