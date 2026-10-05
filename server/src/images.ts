/**
 * Runtime image derivatives for admin uploads.
 *
 * Bundled photos are processed ahead of time by `react/scripts/optimize-images.mjs`
 * (see the README). Photos uploaded through the admin panel arrive after the
 * build, so this module gives them the same treatment at runtime: a WebP variant
 * ladder sized on demand, intrinsic dimensions and a placeholder colour, exposed
 * to the frontend through `GET /api/image-manifest`.
 *
 * Variants are cached on disk next to the uploads (`<dir>/optimized/<name>-<w>.webp`)
 * and produced lazily — the first visitor to request a size pays for it, every
 * later visitor gets a plain static file through the `/assets` mount.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export type ImageVariant = { width: number; url: string };
export type ImageMeta = { width: number; height: number; color: string; variants: ImageVariant[] };

/** Asset folders that hold photos. */
export const IMAGE_DIRS = ['images', 'adverts', 'community'] as const;
export type ImageDir = (typeof IMAGE_DIRS)[number];

const PHOTO_WIDTHS = [480, 960, 1600];
const MAX_VARIANT_WIDTH = 1600;
/** Widths the lazy generator will honour (anything else is a 404). */
const ALLOWED_WIDTHS = new Set([160, 240, 320, 400, 480, 640, 800, 960, 1280, 1600, 1920]);
const RASTER_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'];
const QUALITY_PHOTO = 80;
const QUALITY_ALPHA = 84;
const MANIFEST_TTL_MS = 15_000;

export type ProcessedImageVariant = { width: number; data: Buffer };
export type ProcessedImage = {
  width: number;
  height: number;
  color: string;
  variants: ProcessedImageVariant[];
};

/**
 * Decode and build the same responsive WebP ladder for a Buffer.
 * Used when an upload is stored outside the app filesystem (for example in
 * Supabase Storage), so the optimizer remains server-side without relying on a
 * writable persistent disk.
 */
export async function processImageBuffer(buffer: Buffer): Promise<ProcessedImage> {
  const sourceMeta = await sharp(buffer, { failOn: 'none' }).metadata();
  const oriented = await sharp(buffer, { failOn: 'none' }).rotate().toBuffer({ resolveWithObject: true });
  const { width, height } = oriented.info;
  const hasAlpha = !!sourceMeta.hasAlpha;
  if (!width || !height) throw new Error('The uploaded image has no readable dimensions');

  const { data: colorData } = await sharp(oriented.data, { failOn: 'none' })
    .flatten({ background: '#ffffff' })
    .resize(1, 1, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const color = `#${[colorData[0] || 0, colorData[1] || 0, colorData[2] || 0]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('')}`;

  const variants = await Promise.all(
    ladderFor(width).map(async (targetWidth) => {
      const { data, info } = await sharp(oriented.data, { failOn: 'none' })
        .resize({ width: targetWidth, withoutEnlargement: true })
        .webp({ quality: hasAlpha ? QUALITY_ALPHA : QUALITY_PHOTO, effort: 4 })
        .toBuffer({ resolveWithObject: true });
      return { width: info.width, data };
    })
  );

  return { width, height, color, variants };
}

let bundledRoot = '';
let writableRoot = '';

/**
 * @param bundledRoot  read-only copy shipped with the app (`react/public/assets`)
 * @param writableRoot where runtime uploads and generated variants live
 */
export function configureImageService(opts: { bundledRoot: string; writableRoot: string }): void {
  bundledRoot = opts.bundledRoot;
  writableRoot = opts.writableRoot;
  fileCache.clear();
  manifestCache = null;
}

const EXT = (name: string) => path.extname(name).toLowerCase();
const isRaster = (name: string) => RASTER_EXTS.includes(EXT(name));
const baseOf = (name: string) => name.slice(0, name.length - EXT(name).length);
const publicDir = (dir: ImageDir) => `/assets/${dir}`;
const variantUrl = (dir: ImageDir, base: string, width: number) =>
  `${publicDir(dir)}/optimized/${base}-${width}.webp`;

/** Widths a photo should offer: the shared ladder, never upscaled. */
function ladderFor(sourceWidth: number): number[] {
  if (sourceWidth <= PHOTO_WIDTHS[0]) return [sourceWidth];
  const cap = Math.min(sourceWidth, MAX_VARIANT_WIDTH);
  const picked = PHOTO_WIDTHS.filter((w) => w < cap);
  picked.push(cap);
  return [...new Set(picked)];
}

/** Absolute upload path, preferring the writable copy over the bundled one. */
function sourcePath(dir: ImageDir, name: string): string | null {
  for (const root of [writableRoot, bundledRoot]) {
    if (!root) continue;
    const candidate = path.resolve(root, dir, name);
    if (!candidate.startsWith(path.resolve(root, dir))) continue; // traversal guard
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function variantDir(dir: ImageDir, create = true): string {
  const target = path.join(writableRoot, dir, 'optimized');
  if (create) fs.mkdirSync(target, { recursive: true });
  return target;
}

// ----------------------------------------------------------------- inspection
type FileInfo = { width: number; height: number; hasAlpha: boolean; color: string };
const fileCache = new Map<string, { stamp: string; info: FileInfo }>();

async function inspect(file: string): Promise<FileInfo | null> {
  const stat = await fs.promises.stat(file);
  const stamp = `${stat.mtimeMs}:${stat.size}`;
  const cached = fileCache.get(file);
  if (cached?.stamp === stamp) return cached.info;

  const meta = await sharp(file, { failOn: 'none' }).metadata();
  if (!meta.width || !meta.height) return null;

  // 1x1 resize = the photo's average colour, used as the placeholder tint.
  const { data } = await sharp(file, { failOn: 'none' })
    .flatten({ background: '#ffffff' })
    .resize(1, 1, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const color = `#${[data[0] || 0, data[1] || 0, data[2] || 0]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('')}`;

  const info: FileInfo = { width: meta.width, height: meta.height, hasAlpha: !!meta.hasAlpha, color };
  fileCache.set(file, { stamp, info });
  return info;
}

async function buildMeta(dir: ImageDir, name: string): Promise<ImageMeta | null> {
  const src = sourcePath(dir, name);
  if (!src) return null;
  try {
    const info = await inspect(src);
    if (!info) return null;
    const base = baseOf(name);
    return {
      width: info.width,
      height: info.height,
      color: info.color,
      variants: ladderFor(info.width).map((width) => ({ width, url: variantUrl(dir, base, width) })),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- generation
const inflight = new Map<string, Promise<void>>();

async function generate(src: string, out: string, width: number, hasAlpha: boolean): Promise<void> {
  const tmp = `${out}.${process.pid}.${Date.now()}.tmp`;
  try {
    await sharp(src, { failOn: 'none' })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: hasAlpha ? QUALITY_ALPHA : QUALITY_PHOTO, effort: 4 })
      .toFile(tmp);
    await fs.promises.rename(tmp, out);
  } catch (err) {
    await fs.promises.unlink(tmp).catch(() => undefined);
    throw err;
  }
}

function queueVariant(src: string, out: string, width: number, hasAlpha: boolean): Promise<void> {
  const existing = inflight.get(out);
  if (existing) return existing;
  const job = generate(src, out, width, hasAlpha)
    .catch(() => undefined)
    .finally(() => inflight.delete(out));
  inflight.set(out, job);
  return job;
}

/**
 * Build every missing variant for an uploaded/bundled photo. Safe to call after
 * each upload — already-generated sizes are skipped.
 */
export async function ensureVariants(dir: ImageDir, name: string): Promise<void> {
  if (!isRaster(name)) return;
  const src = sourcePath(dir, name);
  if (!src) return;
  const info = await inspect(src).catch(() => null);
  if (!info) return;

  const base = baseOf(name);
  const outDir = variantDir(dir);
  for (const width of ladderFor(info.width)) {
    const out = path.join(outDir, `${base}-${width}.webp`);
    if (fs.existsSync(out)) continue;
    await queueVariant(src, out, width, info.hasAlpha);
  }
  manifestCache = null;
}

/**
 * Resolve a variant request such as `images/hero-960.webp`, generating the file
 * if it does not exist yet. Returns the absolute path to serve, or null.
 */
export async function resolveVariant(dir: ImageDir, file: string): Promise<string | null> {
  const match = /^([A-Za-z0-9_-]{1,80})-(\d{2,4})\.webp$/.exec(file);
  if (!match) return null;
  const [, base, widthText] = match;
  const width = Number(widthText);
  if (width < 160 || width > MAX_VARIANT_WIDTH) return null;

  const out = path.join(variantDir(dir), `${base}-${width}.webp`);
  if (fs.existsSync(out)) return out;

  const name = findSourceName(dir, base);
  if (!name) return null;

  const src = sourcePath(dir, name);
  if (!src) return null;
  const info = await inspect(src).catch(() => null);
  if (!info) return null;

  // Only sizes this photo would legitimately offer: its own ladder (which ends at
  // its natural width) or one of the standard breakpoints below that.
  if (!ladderFor(info.width).includes(width) && !(ALLOWED_WIDTHS.has(width) && width <= info.width)) {
    return null;
  }

  await queueVariant(src, out, width, info.hasAlpha);
  return fs.existsSync(out) ? out : null;
}

/** Which file in `dir` has this base name and a raster extension. */
function findSourceName(dir: ImageDir, base: string): string | null {
  for (const root of [writableRoot, bundledRoot]) {
    if (!root) continue;
    const abs = path.resolve(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const ext of RASTER_EXTS) {
      const candidate = `${base}${ext}`;
      if (fs.existsSync(path.join(abs, candidate))) return candidate;
    }
  }
  return null;
}

/** Drop generated variants (used when the matching upload is deleted). */
export function removeVariants(dir: ImageDir, name: string): void {
  if (!isRaster(name)) return;
  // Never touch the derivatives of bundled photos: those are committed with the
  // repo and shared by presets, so deleting one menu row must not remove them.
  if (readCommittedManifest()[`${publicDir(dir)}/${name}`]) return;
  const outDir = variantDir(dir, false);
  const prefix = `${baseOf(name)}-`;
  if (fs.existsSync(outDir)) {
    for (const entry of fs.readdirSync(outDir)) {
      if (entry.startsWith(prefix) && entry.endsWith('.webp')) {
        fs.unlinkSync(path.join(outDir, entry));
      }
    }
  }
  manifestCache = null;
}

// ------------------------------------------------------------------ manifest
let manifestCache: { at: number; value: Record<string, ImageMeta> } | null = null;

function readCommittedManifest(): Record<string, ImageMeta> {
  const file = path.join(bundledRoot, 'images', 'manifest.json');
  if (!fs.existsSync(file)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed && typeof parsed.images === 'object' ? (parsed.images as Record<string, ImageMeta>) : {};
  } catch {
    return {};
  }
}

function scanDir(root: string, dir: ImageDir): string[] {
  const abs = path.resolve(root, dir);
  if (!root || !fs.existsSync(abs)) return [];
  try {
    return fs.readdirSync(abs).filter((name) => isRaster(name));
  } catch {
    return [];
  }
}

/** Keyed by public URL path, e.g. `/assets/images/hero.png`. */
export async function imageManifest(): Promise<Record<string, ImageMeta>> {
  if (manifestCache && Date.now() - manifestCache.at < MANIFEST_TTL_MS) return manifestCache.value;

  const images: Record<string, ImageMeta> = { ...readCommittedManifest() };
  const groups: Array<[string, ImageDir]> = [
    [writableRoot, 'images'],
    [bundledRoot, 'images'],
    ...IMAGE_DIRS.filter((d) => d !== 'images').flatMap((d): Array<[string, ImageDir]> => [
      [writableRoot, d],
      [bundledRoot, d],
    ]),
  ];

  for (const [root, dir] of groups) {
    for (const name of scanDir(root, dir)) {
      const key = `${publicDir(dir)}/${name}`;
      if (images[key]) continue;
      const meta = await buildMeta(dir, name);
      if (meta) images[key] = meta;
    }
  }

  manifestCache = { at: Date.now(), value: images };
  return images;
}

export function invalidateImageManifest(): void {
  manifestCache = null;
}
