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

/** Resolve a legacy asset filename or a durable absolute Storage URL. */
export function assetUrl(
  directory: 'images' | 'adverts' | 'videos' | 'community',
  value: string | null | undefined
): string {
  const source = String(value || '').trim();
  if (!source) return '';
  if (/^(https?:)?\/\//i.test(source) || /^(data|blob):/i.test(source)) return source;
  if (source.startsWith('/')) return source;
  return `/assets/${directory}/${source.split('/').map(encodeURIComponent).join('/')}`;
}

/** Capture a representative frame in the browser, avoiding a runtime ffmpeg dependency. */
export async function createVideoPoster(file: File): Promise<File | null> {
  if (!file.type.startsWith('video/') || typeof document === 'undefined') return null;
  let objectUrl = '';
  try {
    objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    return await new Promise<File | null>((resolve) => {
      let settled = false;
      const finish = (poster: File | null) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        video.removeAttribute('src');
        video.load();
        URL.revokeObjectURL(objectUrl);
        resolve(poster);
      };
      const timeout = window.setTimeout(() => finish(null), 15_000);

      const capture = () => {
        if (settled || !video.videoWidth || !video.videoHeight) return;
        try {
          const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
          canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
          const context = canvas.getContext('2d');
          if (!context) return finish(null);
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              if (!blob) return finish(null);
              try {
                const base = file.name.replace(/\.[^.]+$/, '') || 'video';
                finish(new File([blob], `${base}-poster.jpg`, { type: 'image/jpeg' }));
              } catch {
                finish(null);
              }
            },
            'image/jpeg',
            0.86
          );
        } catch {
          finish(null);
        }
      };

      video.addEventListener('error', () => finish(null), { once: true });
      video.addEventListener('loadedmetadata', () => {
        const time = video.duration > 1.5 ? Math.min(1.25, video.duration * 0.15) : video.duration > 0.1 ? video.duration / 2 : 0;
        if (time > 0) {
          video.addEventListener('seeked', capture, { once: true });
          try {
            video.currentTime = time;
          } catch {
            video.addEventListener('loadeddata', capture, { once: true });
          }
        } else if (video.readyState >= 2) {
          capture();
        } else {
          video.addEventListener('loadeddata', capture, { once: true });
        }
      }, { once: true });

      video.src = objectUrl;
      video.load();
    });
  } catch {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    return null;
  }
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
