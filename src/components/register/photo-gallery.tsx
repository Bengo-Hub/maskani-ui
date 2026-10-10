'use client';

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WithTooltip } from '@/components/common/icon-button';
import { useSlug } from '@/hooks/use-access';
import { useSavePhotos } from '@/hooks/use-register';
import { apiErrorMessage } from '@/lib/api/errors';
import { publicPhotoUrl, uploadPhoto } from '@/lib/media';
import { cn } from '@/lib/utils';

const MAX = 12;

function TileButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <WithTooltip label={label}>
      <button type="button" aria-label={label} disabled={disabled} onClick={onClick}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75 disabled:cursor-default disabled:opacity-40">
        {children}
      </button>
    </WithTooltip>
  );
}

/**
 * The photo gallery of an estate or a unit. The first photo is the cover on the console and the
 * public site. Every change (add, move, make cover, remove) saves straight away.
 */
export function PhotoGallery({ target, id, photos = [], canEdit, published }: {
  target: 'property' | 'unit';
  id: string;
  photos?: string[];
  canEdit: boolean;
  /** Says under the title that the photos are public. */
  published?: boolean;
}) {
  const slug = useSlug();
  const save = useSavePhotos(target, id);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const kind = target === 'property' ? 'properties' : 'units';

  const commit = (next: string[]) => save.mutate(next, { onError: (e) => toast.error(apiErrorMessage(e, 'The photos could not be saved.')) });
  const move = (i: number, to: number) => {
    const next = [...photos];
    const [k] = next.splice(i, 1);
    next.splice(to, 0, k);
    commit(next);
  };

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const keys: string[] = [];
      for (const f of Array.from(files).slice(0, MAX - photos.length)) keys.push((await uploadPhoto(slug, f, kind)).key);
      commit([...photos, ...keys]);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'The photo could not be uploaded.'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const working = busy || save.isPending;
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <CardTitle>Photos</CardTitle>
          <CardDescription>The first photo is the cover.{published ? ' These show on the public estate page.' : ''}</CardDescription>
        </div>
        {canEdit && photos.length < MAX && (
          <Button size="sm" variant="outline" disabled={working} onClick={() => input.current?.click()}>
            {working ? <Loader2 className="animate-spin" /> : <ImagePlus />} Add photos
          </Button>
        )}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/*" multiple hidden onChange={(e) => void add(e.target.files)} />
      </CardHeader>
      <CardContent>
        {photos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No photos yet.{canEdit ? ' Add real photos; the cover shows on cards and the public page.' : ''}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((k, i) => (
              <li key={k} className={cn('relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted', i === 0 && 'ring-2 ring-primary')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={publicPhotoUrl(k)} alt={i === 0 ? 'Cover photo' : `Photo ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Cover</span>}
                {canEdit && (
                  <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                    <div className="flex gap-1">
                      <TileButton label="Move earlier" disabled={i === 0 || working} onClick={() => move(i, i - 1)}><ChevronLeft className="h-4 w-4" /></TileButton>
                      <TileButton label="Move later" disabled={i === photos.length - 1 || working} onClick={() => move(i, i + 1)}><ChevronRight className="h-4 w-4" /></TileButton>
                    </div>
                    <div className="flex gap-1">
                      {i > 0 && <TileButton label="Make cover" disabled={working} onClick={() => move(i, 0)}><Star className="h-4 w-4" /></TileButton>}
                      <TileButton label="Remove photo" disabled={working} onClick={() => commit(photos.filter((x) => x !== k))}><Trash2 className="h-4 w-4" /></TileButton>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
