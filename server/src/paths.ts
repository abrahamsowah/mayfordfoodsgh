import path from 'path';

/** react/public — source assets (images, videos, sounds). */
export const PUBLIC_DIR = path.resolve(__dirname, '../../react/public');
/** react/dist — built SPA served in production. */
export const DIST_DIR = path.resolve(__dirname, '../../react/dist');
/** Uploaded + bundled media served at /assets. */
export const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');
/** server/data — SQLite demo database + local secrets. */
export const DATA_DIR = path.resolve(__dirname, '../data');
