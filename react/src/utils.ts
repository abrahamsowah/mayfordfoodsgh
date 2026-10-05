import type { MenuItem, Settings } from './types';

/** Format a number as cedis: GH₵ 1,250.00 (same as the old PHP number_format) */
export function ghs(n: number | string | null | undefined): string {
  const value = Number(n || 0);
  return `GH₵ ${value.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Discounted (effective) price of a menu item */
export function effectivePrice(item: Pick<MenuItem, 'price' | 'discount_percent'>): number {
  const p = Number(item.price || 0);
  const d = Number(item.discount_percent || 0);
  return d > 0 ? p - (p * d) / 100 : p;
}

export function formatNum(n: number | null | undefined): string {
  return Number(n || 0).toLocaleString('en-US');
}

/** WhatsApp international number for an outlet, from website settings */
export function outletWhatsApp(outlet: string, settings?: Settings | null): string {
  const phone =
    outlet === 'Adabraka' ? settings?.adabraka_phone || '0244143271' : settings?.dzorwulu_phone || '0533634378';
  return `233${String(phone).replace(/\D/g, '').replace(/^0/, '')}`;
}

export function waLink(numberOrPhone: string, text?: string): string {
  const base = `https://wa.me/${numberOrPhone.replace(/\D/g, '')}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ---------------------------------------------------------------- images */

/** Longest edge we keep when a photo is uploaded from the admin panel. */
const MAX_UPLOAD_EDGE = 1600;
/** Files already smaller than this are uploaded untouched. */
const UPLOAD_PASSTHROUGH_BYTES = 350 * 1024;
const UPLOAD_QUALITY = 0.82;

/**
 * Shrink a camera/phone photo in the browser before it is uploaded.
 *
 * Admin uploads are capped at 10 MB by the API but were stored at full
 * resolution (4-8 MP), which then had to be downloaded by every visitor. This
 * re-encodes large raster photos to WebP at a sensible size — a 6 MB JPEG
 * becomes roughly 150-400 KB with no visible loss at the sizes the site
 * displays. Animated GIFs, SVGs, video files and already-small images are
 * returned untouched, and any failure falls back to the original file.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || /gif|svg/.test(file.type)) return file;
  if (file.size <= UPLOAD_PASSTHROUGH_BYTES) return file;
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_UPLOAD_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', UPLOAD_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;

    const name = `${file.name.replace(/\.[^.]+$/, '') || 'upload'}.webp`;
    return new File([blob], name, { type: 'image/webp' });
  } catch {
    return file;
  }
}

/** Run `prepareImageForUpload` on a file field of a multipart form payload. */
export async function prepareFormImage(fd: FormData, field: string): Promise<void> {
  const value = fd.get(field);
  if (!(value instanceof File) || value.size === 0) return;
  const prepared = await prepareImageForUpload(value);
  if (prepared !== value) fd.set(field, prepared);
}
