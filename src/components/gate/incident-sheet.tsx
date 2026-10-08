'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { apiErrorMessage } from '@/lib/api/errors';
import { gateDeviceApi } from '@/lib/gate/api';
import type { GateDeviceCreds } from '@/lib/gate/device';

// SRDD 15.4 incident categories; serious ones alert the estate manager at once.
const CATEGORIES = ['intrusion', 'theft', 'fire', 'medical', 'dispute', 'damage', 'other'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

export function IncidentSheet({ open, onOpenChange, device }: { open: boolean; onOpenChange: (o: boolean) => void; device: GateDeviceCreds }) {
  const [f, setF] = useState({ category: 'intrusion', severity: 'medium', title: '', description: '' });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!f.title.trim()) return;
    setBusy(true);
    try {
      await gateDeviceApi(device).incident({ ...f, title: f.title.trim(), description: f.description.trim() || undefined, occurred_at: new Date().toISOString() });
      toast.success('Incident reported to the estate manager');
      setF({ category: 'intrusion', severity: 'medium', title: '', description: '' });
      onOpenChange(false);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not send the report. Try again when the tablet is online.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="Report an incident"
      footer={<>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button variant="destructive" onClick={() => void submit()} disabled={!f.title.trim() || busy}>{busy ? 'Sending...' : 'Send report'}</Button>
      </>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="What happened" htmlFor="i-cat">
          <NativeSelect id="i-cat" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="h-12 capitalize">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
          </NativeSelect>
        </Field>
        <Field label="How serious" htmlFor="i-sev">
          <NativeSelect id="i-sev" value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value })} className="h-12">
            {SEVERITIES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Short title" htmlFor="i-title" required className="sm:col-span-2"><Input id="i-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="h-12" /></Field>
        <Field label="Details" htmlFor="i-desc" className="sm:col-span-2"><Textarea id="i-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={4} /></Field>
      </div>
    </FormSheet>
  );
}
