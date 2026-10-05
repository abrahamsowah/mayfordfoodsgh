import crypto from 'crypto';
import path from 'path';
import { execute, query } from './db';
import { processImageBuffer, type ImageMeta } from './images';
import { supabaseAdmin } from './supabase';

export type MediaDirectory = 'images' | 'adverts' | 'videos' | 'community';
export type SignedMediaUpload = {
  dir: MediaDirectory;
  key: string;
  signedUrl: string;
  publicUrl: string;
  contentType: string;
  apiKey?: string;
};

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const MEDIA_BUCKET = process.env.SUPABASE_MEDIA_BUCKET || 'mayford-media';
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ALL_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, '.gif', '.mp4', '.webm', '.mov']);
const RASTER_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const CACHE_CONTROL = '31536000';

function mediaError(message: string, status = 503): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

export function isSupabaseMediaConfigured(): boolean {
  return Boolean(supabaseAdmin && SUPABASE_URL);
}

export function mediaBucketName(): string {
  return MEDIA_BUCKET;
}

export function uploadLimitFor(dir: MediaDirectory, fileName: string): number {
  const ext = path.extname(fileName).toLowerCase();
  return ext === '.mp4' || ext === '.webm' || ext === '.mov' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

export function expectedContentType(fileName: string): string {
  return CONTENT_TYPE_BY_EXT[path.extname(fileName).toLowerCase()] || 'application/octet-stream';
}

/** Validate extensions and make a collision-resistant, URL-safe object key. */
function makeObjectKey(dir: MediaDirectory, originalName: string): string {
  const ext = path.extname(originalName || '').toLowerCase();
  if (!ALL_EXTENSIONS.has(ext)) {
    throw mediaError(`Unsupported media extension (${ext || 'none'}).`, 400);
  }
  const base = path
    .basename(originalName || 'upload', ext)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'upload';
  return `${dir}/${crypto.randomUUID()}-${base}${ext}`;
}

function assertObjectKey(key: string, dir?: MediaDirectory): MediaDirectory {
  const parts = String(key || '').split('/');
  const objectDir = parts[0] as MediaDirectory;
  const fileName = parts[1] || '';
  if (
    parts.length !== 2 ||
    !['images', 'adverts', 'videos', 'community'].includes(objectDir) ||
    (dir && objectDir !== dir) ||
    !/^[a-zA-Z0-9_-]{30,110}\.(jpg|jpeg|png|webp|gif|mp4|webm|mov)$/i.test(fileName)
  ) {
    throw mediaError('Invalid media object key.', 400);
  }
  return objectDir;
}

function storageClient() {
  if (!supabaseAdmin) throw mediaError('Supabase Storage is not configured on the server.');
  return supabaseAdmin.storage.from(MEDIA_BUCKET);
}

function publicUrlForKey(key: string): string {
  const result = storageClient().getPublicUrl(key);
  return result.data.publicUrl;
}

/** Issue a narrowly scoped signed upload URL; only the API service role can sign. */
export async function createSignedMediaUpload(
  dir: MediaDirectory,
  originalName: string
): Promise<SignedMediaUpload> {
  if (!isSupabaseMediaConfigured()) {
    throw mediaError('Durable media uploads require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  if (!SUPABASE_ANON_KEY) {
    throw mediaError('Browser uploads also require SUPABASE_ANON_KEY for the Storage gateway.');
  }
  const key = makeObjectKey(dir, originalName);
  const contentType = expectedContentType(originalName);
  const { data, error } = await storageClient().createSignedUploadUrl(key, { upsert: false });
  if (error || !data?.signedUrl) {
    throw mediaError(`Could not prepare a Supabase Storage upload: ${error?.message || 'signed URL unavailable'}`);
  }
  return {
    dir,
    key,
    signedUrl: data.signedUrl,
    publicUrl: publicUrlForKey(key),
    contentType,
    ...(SUPABASE_ANON_KEY ? { apiKey: SUPABASE_ANON_KEY } : {}),
  };
}

/** Upload a small server-received file (local development / non-browser callers). */
export async function uploadMediaBuffer(
  dir: MediaDirectory,
  originalName: string,
  buffer: Buffer,
  contentType?: string
): Promise<{ key: string; publicUrl: string }> {
  if (!isSupabaseMediaConfigured()) {
    throw mediaError('Supabase Storage is not configured on the server.');
  }
  const key = makeObjectKey(dir, originalName);
  const type = contentType || expectedContentType(originalName);
  const { error } = await storageClient().upload(key, buffer, {
    contentType: type,
    cacheControl: CACHE_CONTROL,
    upsert: false,
  });
  if (error) throw mediaError(`Could not save media to Supabase Storage: ${error.message}`);

  if (RASTER_EXTENSIONS.has(path.extname(originalName).toLowerCase())) {
    try {
      await createStoredImageVariants(dir, key, buffer);
    } catch (err) {
      console.warn('[media] image variants were not generated:', (err as Error).message);
    }
  }
  return { key, publicUrl: publicUrlForKey(key) };
}

/**
 * Complete a direct-to-Storage upload. Video files are checked through Storage's
 * object listing (never downloaded into a serverless function); raster photos are
 * downloaded once so `sharp` can build and persist their WebP ladder.
 */
export async function finalizeSignedMediaUpload(
  dir: MediaDirectory,
  key: string
): Promise<{ key: string; publicUrl: string }> {
  assertObjectKey(key, dir);
  const fileName = path.posix.basename(key);
  const { data: listed, error: listError } = await storageClient().list(dir, {
    limit: 1000,
    search: fileName,
  });
  if (listError) throw mediaError(`Could not verify the uploaded file: ${listError.message}`);
  const object = (listed || []).find((item) => item.name === fileName);
  if (!object) throw mediaError('The uploaded file was not found in Supabase Storage.', 400);

  const declaredSize = Number(object.metadata?.size || object.metadata?.contentLength || 0);
  if (declaredSize > uploadLimitFor(dir, fileName)) {
    await removeStorageKeys([key]).catch(() => undefined);
    throw mediaError('The uploaded file exceeds the allowed size.', 413);
  }

  if (RASTER_EXTENSIONS.has(path.extname(fileName).toLowerCase())) {
    const { data, error } = await storageClient().download(key);
    if (error || !data) throw mediaError(`Could not read the uploaded image: ${error?.message || 'download failed'}`);
    try {
      await createStoredImageVariants(dir, key, Buffer.from(await data.arrayBuffer()));
    } catch (err) {
      // The original remains public and usable if sharp cannot decode an unusual
      // image. The UI will simply use it without the responsive variant ladder.
      console.warn('[media] image variants were not generated:', (err as Error).message);
    }
  }

  return { key, publicUrl: publicUrlForKey(key) };
}

async function createStoredImageVariants(dir: MediaDirectory, key: string, buffer: Buffer): Promise<void> {
  const processed = await processImageBuffer(buffer);
  const base = path.posix.basename(key, path.posix.extname(key));
  const variants: Array<{ width: number; url: string }> = [];
  const variantKeys: string[] = [];

  try {
    for (const variant of processed.variants) {
      const variantKey = `${dir}/optimized/${base}-${variant.width}.webp`;
      const { error } = await storageClient().upload(variantKey, variant.data, {
        contentType: 'image/webp',
        cacheControl: CACHE_CONTROL,
        upsert: true,
      });
      if (error) throw new Error(error.message);
      variantKeys.push(variantKey);
      variants.push({ width: variant.width, url: publicUrlForKey(variantKey) });
    }
  } catch (err) {
    await removeStorageKeys(variantKeys).catch(() => undefined);
    throw err;
  }

  const publicUrl = publicUrlForKey(key);
  const existing = await query('SELECT object_key FROM image_asset_metadata WHERE object_key=?', [key]);
  const values = [publicUrl, processed.width, processed.height, processed.color, JSON.stringify(variants)];
  if (existing.length > 0) {
    await execute(
      'UPDATE image_asset_metadata SET public_url=?, width=?, height=?, color=?, variants_json=?, updated_at=? WHERE object_key=?',
      [...values, new Date().toISOString(), key]
    );
  } else {
    await execute(
      'INSERT INTO image_asset_metadata (public_url, width, height, color, variants_json, updated_at, object_key) VALUES (?,?,?,?,?,?,?)',
      [...values, new Date().toISOString(), key]
    );
  }
}

export async function remoteImageManifest(): Promise<Record<string, ImageMeta>> {
  if (!isSupabaseMediaConfigured()) return {};
  const rows = await query(
    'SELECT public_url, width, height, color, variants_json FROM image_asset_metadata'
  );
  const result: Record<string, ImageMeta> = {};
  for (const row of rows) {
    try {
      const variants = JSON.parse(String(row.variants_json || '[]')) as ImageMeta['variants'];
      result[String(row.public_url)] = {
        width: Number(row.width),
        height: Number(row.height),
        color: String(row.color || '#ffffff'),
        variants: Array.isArray(variants) ? variants : [],
      };
    } catch {
      /* Ignore a malformed legacy metadata row rather than failing the manifest. */
    }
  }
  return result;
}

/** Return a bucket object key only for this project's public media URL. */
export function storageKeyFromPublicUrl(value: string, expectedDir?: MediaDirectory): string | null {
  if (!isSupabaseMediaConfigured() || !value) return null;
  try {
    const project = new URL(SUPABASE_URL);
    const candidate = new URL(value);
    if (candidate.origin !== project.origin) return null;
    const projectPath = project.pathname.replace(/\/$/, '');
    const prefix = `${projectPath}/storage/v1/object/public/${MEDIA_BUCKET}/`;
    if (!candidate.pathname.startsWith(prefix)) return null;
    const key = decodeURIComponent(candidate.pathname.slice(prefix.length));
    const dir = assertObjectKey(key, expectedDir);
    return dir ? key : null;
  } catch {
    return null;
  }
}

export function isStoragePublicUrl(value: string, expectedDir?: MediaDirectory): boolean {
  return storageKeyFromPublicUrl(value, expectedDir) !== null;
}

async function removeStorageKeys(keys: string[]): Promise<void> {
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) return;
  const { error } = await storageClient().remove(unique);
  if (error) throw mediaError(`Could not remove media from Supabase Storage: ${error.message}`);
}

async function isMediaStillReferenced(dir: MediaDirectory, value: string): Promise<boolean> {
  const references: Record<MediaDirectory, Array<[string, string]>> = {
    images: [
      ['menu_items', 'image'],
      ['slider_images', 'image'],
      ['advertisement_videos', 'poster_url'],
    ],
    adverts: [['advertisement_banners', 'banner_image']],
    videos: [['advertisement_videos', 'video_name']],
    community: [['community_media', 'file_name'], ['community_media', 'poster_url']],
  };
  for (const [table, column] of references[dir]) {
    const rows = await query(`SELECT 1 AS present FROM ${table} WHERE ${column}=? LIMIT 1`, [value]);
    if (rows.length > 0) return true;
  }
  return false;
}

/** Delete a Supabase original and any generated derivatives, if this is ours. */
export async function deleteStoredMedia(dir: MediaDirectory, value: string): Promise<void> {
  const key = storageKeyFromPublicUrl(value, dir);
  if (!key || !isSupabaseMediaConfigured()) return;
  if (await isMediaStillReferenced(dir, value)) return;

  const rows = await query('SELECT variants_json FROM image_asset_metadata WHERE object_key=?', [key]);
  const extraKeys: string[] = [];
  if (rows[0]) {
    try {
      const variants = JSON.parse(String(rows[0].variants_json || '[]')) as ImageMeta['variants'];
      const base = path.posix.basename(key, path.posix.extname(key));
      for (const variant of variants) {
        const width = Number(variant.width);
        if (Number.isInteger(width) && width > 0 && width <= 1920) {
          extraKeys.push(`${dir}/optimized/${base}-${width}.webp`);
        }
      }
    } catch {
      /* Fall through and remove the original. */
    }
  }
  await removeStorageKeys([key, ...extraKeys]);
  await execute('DELETE FROM image_asset_metadata WHERE object_key=?', [key]);
}

/** Cleanup an unreferenced upload if its metadata request fails. */
export async function discardStoredUpload(dir: MediaDirectory, key: string): Promise<void> {
  assertObjectKey(key, dir);
  await deleteStoredMedia(dir, publicUrlForKey(key));
}
