#!/usr/bin/env node
/**
 * Mayford Foods GH — image pipeline
 * ---------------------------------------------------------------------------
 * Generates small, modern WebP derivatives for every photo in
 * `public/assets/images` and writes a typed manifest that the frontend uses to
 * emit `<picture>` markup with responsive `srcset`/`sizes` plus intrinsic
 * width/height (so nothing reflows while loading) and a dominant-colour
 * placeholder (so image boxes never flash blank white).
 *
 * The site keeps the original JPEG/PNG files as the `<picture>` fallback, so
 * filenames referenced from the database (menu items, slides, adverts) stay
 * valid — nothing else needs to change when a new photo is dropped in.
 *
 * Usage:
 *   npm run images                    # add/refresh WebP variants + manifest
 *   npm run images -- --force         # rebuild every variant from scratch
 *   npm run images -- --auto          # skip quietly when ImageMagick is absent
 *                                     # (used by predev/prebuild, e.g. on Vercel)
 *   npm run images -- --shrink-originals
 *                                     # also downscale oversized JPEG/PNG
 *                                     # originals (fallback path only)
 *
 * ImageMagick (`magick` or `convert`) is only needed to *generate* files, and
 * the output is committed — so installs, CI and deploys work without it. Photos
 * uploaded through the admin panel are handled at runtime instead (see
 * `server/src/images.ts`), so they need no rebuild at all.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES_DIR = path.join(ROOT, 'public', 'assets', 'images');
/** Generated variants live in their own folder so source scanning stays clean. */
const OUTPUT_DIR = path.join(IMAGES_DIR, 'optimized');
const OUTPUT_URL_PREFIX = '/assets/images/optimized';
const MANIFEST_FILE = path.join(ROOT, 'src', 'generated', 'imageManifest.ts');
/** Same data as JSON, readable by the API server at runtime. */
const MANIFEST_JSON = path.join(IMAGES_DIR, 'manifest.json');

/** Target CSS widths. The largest entry is capped at the source width. */
const PHOTO_WIDTHS = [480, 960, 1600];
/** Logos and QR codes are shown small, so they get a lighter ladder. */
const GRAPHIC_WIDTHS = [160, 400, 800];
/** Any single generated variant never exceeds this width. */
const MAX_VARIANT_WIDTH = 1600;
/** Originals wider than this are downscaled when --shrink-originals is used. */
const MAX_ORIGINAL_WIDTH = 1920;
const SOURCE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const QUALITY = { photo: 78, graphic: 86, alpha: 88 };

const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const AUTO = args.has('--auto');
const SHRINK_ORIGINALS = args.has('--shrink-originals');

// --------------------------------------------------------------- ImageMagick
function resolveBinary() {
  for (const candidate of ['magick', 'convert']) {
    try {
      execFileSync(candidate, candidate === 'magick' ? ['-version'] : ['-version'], { stdio: 'pipe' });
      return candidate;
    } catch {
      /* try next */
    }
  }
  return null;
}

const BIN = resolveBinary();
if (!BIN) {
  const message =
    '[images] ImageMagick was not found on PATH, so variants could not be regenerated.\n' +
    '         Install it (macOS: `brew install imagemagick`, Debian: `apt-get install imagemagick`)\n' +
    '         then run `npm run images`. The committed variants and manifest keep working as-is.';
  if (AUTO) {
    console.warn(`[images] ${message}`);
    process.exit(0);
  }
  console.error(`\n${message}\n`);
  process.exit(1);
}

const run = (binArgs) => execFileSync(BIN, binArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** `%w %h %[opaque]` for a source file: dimensions + whether it has alpha. */
function probe(file) {
  const [w, h, opaque] = run([file, '-format', '%w %h %[opaque]', 'info:']).trim().split(/\s+/);
  return { width: Number(w), height: Number(h), hasAlpha: opaque === 'false' };
}

/** Average colour of the photo, used as the placeholder tint behind the image. */
function dominantColor(file) {
  const args = [
    file,
    '-background',
    'white',
    '-alpha',
    'remove',
    '-alpha',
    'off',
    '-resize',
    '1x1!',
    '-colorspace',
    'sRGB',
  ];
  const hex = run([...args, '-format', '%[hex:p{0,0}]', 'info:']).trim().replace(/^#/, '');
  if (/^[0-9a-f]{6}$/i.test(hex)) return `#${hex.toLowerCase()}`;

  // Older builds may not support %[hex:...] — fall back to parsing pixel().
  const raw = run([...args, '-depth', '8', '-format', '%[pixel:p{0,0}]', 'info:']).trim();
  const srgb = raw.match(/srgb\((\d+),(\d+),(\d+)\)/i);
  if (srgb) return toHex(Number(srgb[1]), Number(srgb[2]), Number(srgb[3]));
  const gray = raw.match(/gray\((\d+)\)/i);
  if (gray) return toHex(+gray[1], +gray[1], +gray[1]);
  return '#e5e5e5';
}

const toHex = (r, g, b) =>
  `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

/** Which widths we actually need for a source image of this size. */
function variantWidths(sourceWidth, ladder) {
  const cap = Math.min(sourceWidth, MAX_VARIANT_WIDTH);
  if (cap <= ladder[0]) return [cap];
  const picked = ladder.filter((w) => w < cap);
  picked.push(cap);
  return [...new Set(picked)];
}

function writeWebp(src, dest, width, { hasAlpha, isGraphic }) {
  const quality = hasAlpha ? QUALITY.alpha : isGraphic ? QUALITY.graphic : QUALITY.photo;
  const formatArgs = ['-quality', String(quality), '-define', 'webp:method=6'];
  if (hasAlpha) formatArgs.push('-define', 'webp:alpha-quality=90');
  else formatArgs.push('-define', 'webp:alpha-compression=0');

  run([
    src,
    '-auto-orient',
    '-strip',
    '-colorspace',
    'sRGB',
    '-filter',
    'Lanczos',
    '-resize',
    `${width}x>`,
    ...formatArgs,
    dest,
  ]);
}

/** Downscale an oversized original in place (same filename, same format). */
function shrinkOriginal(file, { width, height, hasAlpha }) {
  const longest = Math.max(width, height);
  if (longest <= MAX_ORIGINAL_WIDTH) return false;
  const ext = path.extname(file).toLowerCase();
  const jpegArgs = ext === '.png' ? [] : ['-quality', '82', '-sampling-factor', '4:2:0', '-interlace', 'Plane'];
  run([
    file,
    '-auto-orient',
    '-strip',
    '-colorspace',
    'sRGB',
    '-filter',
    'Lanczos',
    '-resize',
    `${MAX_ORIGINAL_WIDTH}x${MAX_ORIGINAL_WIDTH}>`,
    ...(hasAlpha ? ['-define', 'png:compression-level=9'] : jpegArgs),
    file,
  ]);
  return true;
}

// ------------------------------------------------------------------- pipeline
const files = fs
  .readdirSync(IMAGES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isFile() && SOURCE_EXTS.has(path.extname(entry.name).toLowerCase()))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b));

if (files.length === 0) {
  console.error(`[images] No source images found in ${IMAGES_DIR}`);
  process.exit(1);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const manifest = {};
const jsonImages = {};
let generated = 0;
let upToDate = 0;
let sourceBytesBefore = 0;
let sourceBytesAfter = 0;
let variantBytes = 0;

for (const name of files) {
  const file = path.join(IMAGES_DIR, name);
  const base = name.slice(0, name.length - path.extname(name).length);
  const bytesBefore = fs.statSync(file).size;
  if (SHRINK_ORIGINALS) shrinkOriginal(file, probe(file));

  const info = probe(file);
  const color = dominantColor(file);
  const isGraphic = name.toLowerCase().startsWith('logo') || name.toLowerCase().includes('qr');
  const variants = [];

  for (const width of variantWidths(info.width, isGraphic ? GRAPHIC_WIDTHS : PHOTO_WIDTHS)) {
    const out = path.join(OUTPUT_DIR, `${base}-${width}.webp`);
    const fresh =
      !FORCE && fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(file).mtimeMs;
    if (fresh) {
      upToDate += 1;
    } else {
      writeWebp(file, out, width, { hasAlpha: info.hasAlpha, isGraphic });
      generated += 1;
    }
    variants.push({ width, url: `${OUTPUT_URL_PREFIX}/${base}-${width}.webp` });
    variantBytes += fs.statSync(out).size;
  }

  const after = fs.statSync(file);
  sourceBytesAfter += after.size;
  sourceBytesBefore += bytesBefore;

  manifest[`/assets/images/${name}`] = { width: info.width, height: info.height, color, variants };
}

// --------------------------------------------------------------------- prune
// Variants left behind by renamed or deleted photos would otherwise pile up in
// the repo forever.
let pruned = 0;
const keep = new Set();
for (const name of files) {
  for (const variant of manifest[`/assets/images/${name}`]?.variants ?? []) {
    keep.add(path.basename(variant.url));
  }
}
for (const file of fs.readdirSync(OUTPUT_DIR)) {
  if (!file.endsWith('.webp') || keep.has(file)) continue;
  fs.unlinkSync(path.join(OUTPUT_DIR, file));
  pruned += 1;
}

// ------------------------------------------------------------------- manifest
const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;
const lines = [
  '/* AUTO-GENERATED by scripts/optimize-images.mjs — do not edit by hand.',
  ' *',
  ' * Per-image intrinsic size, placeholder colour and responsive WebP variants.',
  ' * Regenerate with `npm run images` after adding or replacing a photo.',
  ' */',
  '',
  'export type ImageVariant = {',
  '  /** Rendered width of the WebP file, in CSS pixels. */',
  '  readonly width: number;',
  '  readonly url: string;',
  '};',
  '',
  'export type ImageMeta = {',
  '  readonly width: number;',
  '  readonly height: number;',
  '  /** Average colour, used as the tint of the empty image box. */',
  '  readonly color: string;',
  '  readonly variants: readonly ImageVariant[];',
  '};',
  '',
  '/** Keyed by public path, e.g. `/assets/images/hero.png`. */',
  'export const IMAGE_MANIFEST: Readonly<Record<string, ImageMeta>> = {',
];
for (const [name, meta] of Object.entries(manifest)) {
  const variants = meta.variants.map((v) => `{ width: ${v.width}, url: '${v.url}' }`).join(', ');
  lines.push(
    `  '${name}': { width: ${meta.width}, height: ${meta.height}, color: '${meta.color}', variants: [${variants}] },`
  );
  jsonImages[name] = meta;
}
lines.push('};', '');

fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true });
fs.writeFileSync(MANIFEST_FILE, lines.join('\n'), 'utf8');
fs.writeFileSync(
  MANIFEST_JSON,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), images: jsonImages }, null, 0)}\n`,
  'utf8'
);

const unprocessed = files.filter((name) => !manifest[`/assets/images/${name}`]?.variants?.length);
if (unprocessed.length > 0) {
  console.warn(`[images] WARNING: no variants were produced for: ${unprocessed.join(', ')}`);
}

console.log(
  `[images] ${files.length} sources → ${generated} WebP variant${generated === 1 ? '' : 's'} generated, ` +
    `${upToDate} already up to date (${kb(variantBytes)} total)\n` +
    `[images] originals on disk: ${kb(sourceBytesAfter)}` +
    (SHRINK_ORIGINALS && sourceBytesBefore ? ` (shrunk from ${kb(sourceBytesBefore)})` : '') +
    (pruned ? `, ${pruned} orphaned variant${pruned === 1 ? '' : 's'} pruned` : '') +
    `\n[images] manifest → ${path.relative(ROOT, MANIFEST_FILE)}`
);
