import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useImageMeta } from '../lib/imageManifest';

export type SmartImageProps = {
  /** Image URL, usually `/assets/images/<file>`. */
  src: string;
  alt: string;
  /** Applied to the `<img>` — sizing/layout/object-fit classes go here as usual. */
  className?: string;
  /** Layout hint for responsive variant selection, e.g. `(min-width: 1024px) 33vw`. */
  sizes?: string;
  /** Above-the-fold image: load eagerly with high priority (use for the LCP image only). */
  priority?: boolean;
  /** Load eagerly but at normal priority (e.g. a small logo). */
  eager?: boolean;
  style?: CSSProperties;
  /** Tried in order when `src` fails, before the browser gives up. */
  fallbackSrc?: string | string[];
  /**
   * Focal point kept in view while `object-cover` crops the photo, mapped to
   * `object-position`. Vertical photos shown in a wide frame look badly cropped
   * unless this is set, e.g. `position="50% 30%"`.
   */
  position?: string;
};

/**
 * Responsive, layout-stable image.
 *
 * Whenever metadata is known — bundled photos from the build-time manifest, and
 * admin uploads from the runtime manifest — it emits the WebP variants via
 * `<picture>`, together with intrinsic width/height and a tint of the photo's
 * average colour: the box is filled and correctly sized before the bytes arrive,
 * so pages never jump or flash when they do. Anything still unknown falls back to
 * a plain lazy `<img>` and keeps working.
 */
export function SmartImage({
  src,
  alt,
  className = '',
  sizes,
  priority = false,
  eager = false,
  style,
  fallbackSrc,
  position,
}: SmartImageProps) {
  const fallbackKey = Array.isArray(fallbackSrc) ? fallbackSrc.join('|') : fallbackSrc || '';
  const chain = useMemo(
    () => [src, ...(fallbackKey ? fallbackKey.split('|') : [])],
    [src, fallbackKey]
  );

  const [step, setStep] = useState(0);
  const ref = useRef<HTMLImageElement | null>(null);
  const current = chain[Math.min(step, chain.length - 1)];
  // Bundled photos resolve immediately; uploads resolve as soon as the runtime
  // manifest lands (usually well before the image scrolls into view).
  const meta = useImageMeta(current);
  const immediate = priority || eager;

  // Restart the fallback chain whenever the requested image changes.
  useEffect(() => setStep(0), [chain]);

  const handleError = () => {
    if (step < chain.length - 1) setStep(step + 1);
  };

  // A cached file can already have failed before React attached its handlers,
  // so the `onError` above would never run. Re-check once the element is live.
  useEffect(() => {
    const el = ref.current;
    if (el?.complete && el.naturalWidth === 0) handleError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const srcSet = meta?.variants.map((v) => `${v.url} ${v.width}w`).join(', ');

  return (
    <picture className="img-shell">
      {srcSet && <source type="image/webp" srcSet={srcSet} sizes={sizes || '100vw'} />}
      <img
        ref={ref}
        src={current}
        alt={alt}
        className={className}
        width={meta?.width}
        height={meta?.height}
        loading={immediate ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        style={{
          ...(meta ? { backgroundColor: meta.color } : null),
          ...(position ? { objectPosition: position } : null),
          ...style,
        }}
        onError={handleError}
      />
    </picture>
  );
}
