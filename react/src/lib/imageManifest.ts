import { useSyncExternalStore } from 'react';
import { IMAGE_MANIFEST, type ImageMeta } from '../generated/imageManifest';

/**
 * Image metadata for the whole app.
 *
 * Bundled photos are described at build time (`npm run images` →
 * `src/generated/imageManifest.ts`). Photos uploaded from the admin panel are
 * described at runtime by the API (`GET /api/image-manifest`), which also
 * generates their WebP variant ladder on demand. The runtime entries are merged
 * over the bundled ones the first time the app boots, so newly uploaded images
 * get responsive `srcset`, intrinsic dimensions and a placeholder colour with no
 * rebuild or deploy.
 */
let merged: Readonly<Record<string, ImageMeta>> = IMAGE_MANIFEST;
let runtime: Record<string, ImageMeta> = {};
let started = false;
const listeners = new Set<() => void>();

type WireImageMeta = Partial<ImageMeta> & { variants?: Array<{ width?: number; url?: string }> };

/** Minimal shape check so a bad response can never break image rendering. */
function sanitize(payload: unknown): Record<string, ImageMeta> {
  const images = (payload as { images?: Record<string, WireImageMeta> } | null)?.images;
  if (!images || typeof images !== 'object') return {};

  const clean: Record<string, ImageMeta> = {};
  for (const [path, meta] of Object.entries(images)) {
    if (!meta || typeof meta !== 'object') continue;
    const width = Number(meta.width);
    const height = Number(meta.height);
    const variants = Array.isArray(meta.variants)
      ? meta.variants
          .filter((v): v is { width: number; url: string } =>
            !!v && Number.isFinite(Number(v.width)) && typeof v.url === 'string'
          )
          .map((v) => ({ width: Number(v.width), url: v.url }))
      : [];
    if (!Number.isFinite(width) || !Number.isFinite(height)) continue;
    clean[path] = {
      width,
      height,
      color: typeof meta.color === 'string' ? meta.color : '#e5e5e5',
      variants,
    };
  }
  return clean;
}

/** Fetch the runtime manifest once per page load. Failures are non-fatal. */
export function loadRuntimeImageManifest(): void {
  if (started || typeof fetch !== 'function') return;
  started = true;

  fetch('/api/image-manifest', { credentials: 'include', headers: { Accept: 'application/json' } })
    .then((res) => (res.ok ? res.json() : null))
    .then((payload) => {
      const entries = sanitize(payload);
      if (Object.keys(entries).length === 0) return;
      runtime = entries;
      merged = { ...IMAGE_MANIFEST, ...entries };
      listeners.forEach((notify) => notify());
    })
    .catch(() => {
      /* offline or API unavailable: bundled metadata still applies */
    });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const normalize = (src: string) => src.split(/[?#]/)[0];

/** Intrinsic size / variants for a public image path, or undefined if unknown. */
export function imageMetaFor(src: string): ImageMeta | undefined {
  return merged[normalize(src)];
}

/** Reactive variant of {@link imageMetaFor} — re-renders when uploads arrive. */
export function useImageMeta(src: string): ImageMeta | undefined {
  return useSyncExternalStore(
    subscribe,
    () => merged[normalize(src)],
    () => IMAGE_MANIFEST[normalize(src)]
  );
}

export { runtime as runtimeImageManifest };
