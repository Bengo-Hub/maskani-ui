import { mediaApi } from '@/lib/api/operations';
import type { MediaUpload } from '@/lib/api/types';

export type MediaKind = 'readings' | 'works' | 'properties' | 'units' | 'documents' | 'incidents' | 'vendors' | 'evidence';

/**
 * Shrinks a camera photo to at most `maxDim` px on the long side and re-encodes it as JPEG, the
 * format maskani-api stores (it accepts JPEG or PNG and rejects WebP). A 12 MP phone photo drops
 * from about 4 MB to about 300 KB, which matters on mobile data at the meter or the gate.
 */
export async function resizeImage(file: Blob, maxDim = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  return blob ?? file;
}

/** Resizes then uploads one photo; returns the stored key and a signed URL. */
export async function uploadPhoto(slug: string, file: Blob, kind: MediaKind): Promise<MediaUpload> {
  const small = await resizeImage(file);
  return mediaApi.upload(slug, small, kind, 'photo.jpg');
}
