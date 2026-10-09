'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiErrorMessage } from '@/lib/api/errors';
import { uploadPhoto, type MediaKind } from '@/lib/media';
import { cn } from '@/lib/utils';
import { WithTooltip } from './icon-button';

export interface PickedPhoto { key: string; url: string }

/**
 * Camera-first photo capture (`capture="environment"` opens the rear camera on phones). Each photo
 * is resized and uploaded straight away, so the form only sends media keys.
 */
export function PhotoPicker({ slug, kind, value, onChange, max = 4, required, label = 'Add photo' }: {
  slug: string;
  kind: MediaKind;
  value: PickedPhoto[];
  onChange: (v: PickedPhoto[]) => void;
  max?: number;
  required?: boolean;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const room = Math.max(0, max - value.length);
      const added: PickedPhoto[] = [];
      for (const f of Array.from(files).slice(0, room)) {
        const up = await uploadPhoto(slug, f, kind);
        added.push({ key: up.key, url: up.url });
      }
      onChange([...value, ...added]);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'The photo could not be uploaded.'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {value.map((p) => (
        <div key={p.key} className="relative h-20 w-20 overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt="" className="h-full w-full object-cover" />
          <WithTooltip label="Remove photo">
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x.key !== p.key))}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
              aria-label="Remove photo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </WithTooltip>
        </div>
      ))}
      {value.length < max && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className={cn('flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted', required && value.length === 0 && 'border-primary text-primary')}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
          {busy ? 'Uploading' : label}
        </button>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/*" capture="environment" multiple={max > 1} hidden onChange={(e) => void pick(e.target.files)} />
    </div>
  );
}
