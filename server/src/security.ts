/**
 * Security helpers: password hashing, input validation, rate limiting,
 * CSRF origin checks, safe upload filenames and privacy-preserving hashes.
 *
 * Everything here is dependency-light and explicit so the behaviour is easy
 * to audit — this is the layer that stops the storefront from being abused.
 */
import crypto from 'crypto';
import path from 'path';
import type { NextFunction, Request, Response } from 'express';

/* ------------------------------------------------------------------
   Passwords — scrypt with per-password salt, constant-time comparison
------------------------------------------------------------------ */
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function isHashed(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith('scrypt$');
}

/**
 * Verifies a password against a scrypt hash. Legacy plaintext values (from the
 * original PHP database) still verify so accounts keep working until the
 * boot-time migration rewrites them.
 */
export function verifyPassword(stored: string | null | undefined, password: string): boolean {
  if (!stored) return false;
  if (!isHashed(stored)) {
    // Legacy plaintext: constant-time compare, migration handles the upgrade.
    const a = Buffer.from(stored);
    const b = Buffer.from(password);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  const [, n, r, p, saltHex, hashHex] = stored.split('$');
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/** Minimum password policy for customer + admin accounts. */
export function passwordProblem(password: string): string | null {
  if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 200) return 'Password is too long.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must include at least one letter and one number.';
  if (/^(password|12345678|qwerty123|admin1234)/i.test(password)) return 'Please choose a stronger password.';
  return null;
}

/* ------------------------------------------------------------------
   Input validation
------------------------------------------------------------------ */
export class HttpError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Trim + strip control characters, cap the length. */
export function clean(value: unknown, max = 500): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, max);
}

export function requireText(value: unknown, field: string, { min = 1, max = 200 }: { min?: number; max?: number } = {}): string {
  const v = clean(value, max);
  if (v.length < min) throw new HttpError(400, `${field} is required.`);
  return v;
}

export function requireEmail(value: unknown): string {
  const v = clean(value, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) throw new HttpError(400, 'Enter a valid email address.');
  return v;
}

/** Ghanaian numbers: 024…, 055…, +233…, 233… — normalised to local 0XXXXXXXXX. */
export function requirePhone(value: unknown, field = 'Phone number'): string {
  const raw = clean(value, 30).replace(/[^\d+]/g, '');
  let digits = raw;
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('233')) digits = `0${digits.slice(3)}`;
  if (digits.length === 9) digits = `0${digits}`;
  if (!/^0\d{9}$/.test(digits)) throw new HttpError(400, `${field} must be a valid Ghanaian number (e.g. 024 000 0000).`);
  return digits;
}

export function optionalPhone(value: unknown, field = 'Phone number'): string | null {
  const raw = clean(value, 30);
  if (!raw) return null;
  return requirePhone(raw, field);
}

export function requireInt(value: unknown, field: string, { min = 0, max = 1_000_000 } = {}): number {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new HttpError(400, `${field} must be a whole number.`);
  if (n < min || n > max) throw new HttpError(400, `${field} must be between ${min} and ${max}.`);
  return n;
}

export function requireMoney(value: unknown, field: string, { min = 0, max = 1_000_000 } = {}): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new HttpError(400, `${field} must be a number.`);
  const rounded = Math.round(n * 100) / 100;
  if (rounded < min || rounded > max) throw new HttpError(400, `${field} must be between ${min} and ${max}.`);
  return rounded;
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  const v = clean(value, 60);
  if (!allowed.includes(v as T)) throw new HttpError(400, `${field} must be one of: ${allowed.join(', ')}.`);
  return v as T;
}

/** Escape SQL LIKE wildcards in user-supplied search strings. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/** Constant-time comparison for secrets (PINs, tokens). */
export function timingSafeStringEqual(a: unknown, b: unknown): boolean {
  const left = Buffer.from(String(a ?? ''), 'utf8');
  const right = Buffer.from(String(b ?? ''), 'utf8');
  if (left.length !== right.length) {
    // Still compare to keep the timing profile flat.
    crypto.timingSafeEqual(left, left);
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

export function clientIp(req: Request): string {
  const fwd = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  return fwd || req.socket.remoteAddress || 'unknown';
}

/** Never store raw IPs for analytics — hash with a server-side salt. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || process.env.SESSION_SECRET || 'mayford-ip-salt';
  return crypto.createHmac('sha256', salt).update(ip).digest('hex').slice(0, 32);
}

/* ------------------------------------------------------------------
   Uploads
------------------------------------------------------------------ */
const ALLOWED_IMAGE = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
const ALLOWED_VIDEO = ['.mp4', '.webm', '.mov', '.m4v'];
const ALLOWED_AUDIO = ['.mp3', '.wav', '.ogg', '.m4a'];

export function safeFilename(original: string, kind: 'image' | 'video' | 'audio' | 'any' = 'any'): string {
  const base = path.basename(String(original || 'upload'));
  const ext = path.extname(base).toLowerCase();
  const allowed =
    kind === 'image' ? ALLOWED_IMAGE : kind === 'video' ? ALLOWED_VIDEO : kind === 'audio' ? ALLOWED_AUDIO : [...ALLOWED_IMAGE, ...ALLOWED_VIDEO, ...ALLOWED_AUDIO];
  if (!allowed.includes(ext)) {
    throw new HttpError(400, `Unsupported file type "${ext || 'unknown'}". Allowed: ${allowed.join(', ')}`);
  }
  // Keep a readable slug but drop anything that could escape the upload dir.
  const stem = base
    .slice(0, base.length - ext.length)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const unique = `${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
  return `${stem || 'file'}-${unique}${ext}`;
}

export function fileKindFor(field: 'image' | 'video' | 'media'): 'image' | 'video' | 'any' {
  return field === 'image' ? 'image' : field === 'video' ? 'video' : 'any';
}

/* ------------------------------------------------------------------
   Rate limiting (in-memory, per instance — good enough for one box, and
   the interface is the same one a Redis store would implement)
------------------------------------------------------------------ */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) if (bucket.resetAt < now) buckets.delete(key);
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  message?: string;
  /** Optional per-key identifier override (e.g. the submitted email). */
  keyFn?: (req: Request) => string;
}

export function rateLimit({ windowMs, max, keyPrefix = 'rl', message, keyFn }: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    sweep();
    const key = `${keyPrefix}:${keyFn ? keyFn(req) : clientIp(req)}`;
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(max - 1));
      return next();
    }
    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    if (bucket.count > max) {
      const retry = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retry));
      return res.status(429).json({ ok: false, error: message || 'Too many requests. Please slow down and try again shortly.' });
    }
    next();
  };
}

/** Clears a bucket (e.g. after a successful login). */
export function resetRateLimit(keyPrefix: string, req: Request) {
  buckets.delete(`${keyPrefix}:${clientIp(req)}`);
}

/* ------------------------------------------------------------------
   CSRF: origin check for state-changing requests
------------------------------------------------------------------ */
export function allowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS || '';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (process.env.APP_URL) list.push(process.env.APP_URL.replace(/\/$/, ''));
  return list;
}

/**
 * Browsers always send `Origin` on cross-site unsafe requests. If the header
 * is present it must match our allowlist (or the request's own host); requests
 * without an Origin header are same-origin server-to-server calls.
 */
export function csrfGuard(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  // Paystack webhooks are authenticated by HMAC signature instead.
  if (req.path.startsWith('/api/payments/webhook')) return next();

  const origin = req.headers.origin;
  if (!origin) return next();

  const host = req.headers.host;
  const allowed = allowedOrigins();
  const isSameHost = host && (origin === `http://${host}` || origin === `https://${host}`);
  if (isSameHost || allowed.includes(origin)) return next();

  return res.status(403).json({ ok: false, error: 'Request blocked: origin not allowed.' });
}

/* ------------------------------------------------------------------
   Signed tokens (password reset, tracking links)
------------------------------------------------------------------ */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function orderCode(prefix = 'MF'): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${stamp}${rand}`;
}

/** Public tracking id — long enough to be unguessable. */
export function trackingToken(): string {
  return crypto.randomBytes(8).toString('hex');
}
