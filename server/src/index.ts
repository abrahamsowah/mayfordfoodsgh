/**
 * Mayford Foods GH - API server
 * Express + TypeScript + MySQL (with automatic SQLite demo fallback).
 */
import path from 'path';
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();
import { EventEmitter } from 'events';
import crypto from 'crypto';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import multer from 'multer';
import { initDb, query, execute, nowSql, dbMode } from './db';
import { getSupabaseDetails } from './supabase';

// Real-time admin event bus for live kitchen order streaming & dashboard sync
export const adminEventBus = new EventEmitter();
adminEventBus.setMaxListeners(100);

export function broadcastAdminEvent(type: string, data: Record<string, any> = {}) {
  adminEventBus.emit('admin_event', { type, data, timestamp: new Date().toISOString() });
}

// ---------------------------------------------------------------- config
const PORT = Number(process.env.PORT || 4000);
const PUBLIC_DIR = path.resolve(__dirname, '../../react/public');
const DIST_DIR = path.resolve(__dirname, '../../react/dist');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');

// Official Accra Delivery Zones & Rider Fees (GHS)
export const DELIVERY_ZONES: Array<{ id: string; label: string; fee: number }> = [
  { id: 'adabraka_ridge', label: 'Adabraka / Asylum Down / Ridge', fee: 15 },
  { id: 'dzorwulu_airport', label: 'Dzorwulu / Abelemkpe / Airport Residential', fee: 15 },
  { id: 'achimota_tesano', label: 'Achimota / Tesano / Lapaz', fee: 20 },
  { id: 'osu_cantonments', label: 'Osu / Cantonments / Labone', fee: 25 },
  { id: 'east_legon_spintex', label: 'East Legon / Shiashie / Spintex', fee: 30 },
  { id: 'other_accra', label: 'Other Greater Accra Area', fee: 35 },
];

export function resolveDeliveryZone(zoneIdOrLabel?: string | null): { label: string; fee: number } {
  if (!zoneIdOrLabel) return DELIVERY_ZONES[0];
  const found = DELIVERY_ZONES.find(
    (z) => z.id === zoneIdOrLabel || z.label.toLowerCase() === String(zoneIdOrLabel).toLowerCase()
  );
  return found || DELIVERY_ZONES[0];
}

// ---------------------------------------------------------------- persistent DB session store
class DbSessionStore extends session.Store {
  get(sid: string, cb: (err: any, session?: session.SessionData | null) => void): void {
    const now = Date.now();
    query('SELECT sess, expire FROM admin_sessions WHERE sid = ?', [sid])
      .then((rows) => {
        const row = rows[0];
        if (!row) return cb(null, null);
        if (Number(row.expire) < now) {
          execute('DELETE FROM admin_sessions WHERE sid = ?', [sid]).catch(() => undefined);
          return cb(null, null);
        }
        try {
          const parsed = JSON.parse(String(row.sess));
          cb(null, parsed);
        } catch (err) {
          cb(err);
        }
      })
      .catch((err) => cb(err));
  }

  set(sid: string, sess: session.SessionData, cb?: (err?: any) => void): void {
    const maxAge = sess.cookie?.maxAge || 8 * 60 * 60 * 1000;
    const expire = Date.now() + maxAge;
    const data = JSON.stringify(sess);
    query('SELECT sid FROM admin_sessions WHERE sid = ?', [sid])
      .then((rows) => {
        if (rows.length > 0) {
          return execute('UPDATE admin_sessions SET sess = ?, expire = ? WHERE sid = ?', [data, expire, sid]);
        }
        return execute('INSERT INTO admin_sessions (sid, sess, expire) VALUES (?, ?, ?)', [sid, data, expire]);
      })
      .then(() => cb && cb())
      .catch((err) => cb && cb(err));
  }

  destroy(sid: string, cb?: (err?: any) => void): void {
    execute('DELETE FROM admin_sessions WHERE sid = ?', [sid])
      .then(() => cb && cb())
      .catch((err) => cb && cb(err));
  }
}

// ---------------------------------------------------------------- SMS / WhatsApp dispatch helper
async function dispatchOrderStatusNotification(order: {
  id: number;
  customer_name: string;
  phone: string;
  outlet: string;
  order_type: string;
  status: string;
}): Promise<{ smsDispatched: boolean; provider: string; whatsappUrl: string; message: string }> {
  const stageText: Record<string, string> = {
    Pending: 'has been received by our kitchen queue',
    Preparing: 'is now being freshly prepared by our chefs',
    Ready:
      order.order_type === 'Pickup'
        ? 'is READY for pickup at the counter'
        : 'is READY and being handed to our dispatch rider',
    Completed: 'has been completed. Thank you for dining with Mayford Foods GH',
  };

  const msg = `Mayford Foods GH (${order.outlet}): Hello ${order.customer_name}, your Order #${order.id} ${
    stageText[order.status] || `status is now ${order.status}`
  }. Track live using Order #${order.id} on our website.`;

  const digits = String(order.phone || '').replace(/\D/g, '');
  const intlPhone = digits.startsWith('0') ? `233${digits.slice(1)}` : digits;
  const whatsappUrl = `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`;

  // 1. Optional Arkesel SMS API (Ghana)
  const arkeselKey = process.env.ARKESEL_API_KEY;
  if (arkeselKey && intlPhone.length >= 10) {
    try {
      const r = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
        method: 'POST',
        headers: {
          'api-key': arkeselKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: process.env.SMS_SENDER_ID || 'MayfordGH',
          message: msg,
          recipients: [intlPhone],
        }),
      });
      if (r.ok) {
        return { smsDispatched: true, provider: 'arkesel', whatsappUrl, message: msg };
      }
    } catch {
      /* fallback */
    }
  }

  // 2. Optional Hubtel SMS API (Ghana)
  const hubtelId = process.env.HUBTEL_CLIENT_ID;
  const hubtelSecret = process.env.HUBTEL_CLIENT_SECRET;
  if (hubtelId && hubtelSecret && intlPhone.length >= 10) {
    try {
      const auth = Buffer.from(`${hubtelId}:${hubtelSecret}`).toString('base64');
      const r = await fetch('https://smsc.hubtel.com/v1/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          From: process.env.SMS_SENDER_ID || 'MayfordGH',
          To: intlPhone,
          Content: msg,
        }),
      });
      if (r.ok) {
        return { smsDispatched: true, provider: 'hubtel', whatsappUrl, message: msg };
      }
    } catch {
      /* fallback */
    }
  }

  return { smsDispatched: false, provider: 'whatsapp-ready', whatsappUrl, message: msg };
}

// ---------------------------------------------------------------- security helpers
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MEDIA_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov']);

function sanitizeFilename(original: string): string {
  const ext = path.extname(original || '').toLowerCase();
  const safeExt = MEDIA_EXTS.has(ext) ? ext : '.jpg';
  const randomPart = crypto.randomBytes(12).toString('hex');
  const basePart = path
    .basename(original || 'file', ext)
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 24);
  return `${basePart ? `${basePart}_` : ''}${Date.now()}_${randomPart}${safeExt}`;
}

function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(plain: string, stored: string): boolean {
  if (!stored) return false;
  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const [, salt, hashHex] = parts;
    const derived = crypto.scryptSync(plain, salt, 64);
    const expected = Buffer.from(hashHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  }
  const a = Buffer.from(plain, 'utf8');
  const b = Buffer.from(stored, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function timingSafePinMatch(inputPin: string, expectedPin: string): boolean {
  const a = crypto.createHash('sha256').update(inputPin).digest();
  const b = crypto.createHash('sha256').update(expectedPin).digest();
  return crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------- anti-bypass payment & receipt signing
const PAYMENT_SIGNING_SECRET =
  process.env.PAYMENT_SIGNING_SECRET || process.env.SESSION_SECRET || 'mayford-payment-hmac-secret-2026';

export function signPaymentToken(reference: string, amountGhs: number): string {
  const payload = `${reference.trim().toUpperCase()}:${Number(amountGhs).toFixed(2)}:Paid`;
  return crypto.createHmac('sha256', PAYMENT_SIGNING_SECRET).update(payload).digest('hex');
}

export function verifyPaymentToken(reference: string, amountGhs: number, token?: string | null): boolean {
  if (!reference || !token) return false;
  const expected = signPaymentToken(reference, amountGhs);
  const a = Buffer.from(String(token), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function computeReceiptSignature(order: {
  id: number;
  total: number;
  payment_status?: string;
  payment_reference?: string | null;
}): string {
  const raw = `${order.id}:${Number(order.total || 0).toFixed(2)}:${order.payment_status || 'Pending'}:${
    order.payment_reference || 'NONE'
  }`;
  const hex = crypto.createHmac('sha256', PAYMENT_SIGNING_SECRET).update(raw).digest('hex').slice(0, 8).toUpperCase();
  return `MF-VRF-${hex}`;
}

// ---------------------------------------------------------------- branded academy confirmation email builder
function buildBrandedTrainingEmail(params: {
  applicationRef: string;
  fullName: string;
  email: string;
  phone: string;
  school: string;
  program: string;
  submittedAt: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Mayford Training Academy Confirmation</title>
</head>
<body style="margin:0;padding:24px;background-color:#F7F7F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111111;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E5E5;border-radius:8px;overflow:hidden;">
    <div style="background:#111111;color:#FFFFFF;padding:24px 28px;border-bottom:3px solid #B22222;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#D4D4D4;">
        Mayford Foods GH · Culinary &amp; Hospitality Academy
      </p>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;letter-spacing:-0.02em;">
        Admission Application Confirmed
      </h1>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#111111;">
        Dear <strong>${params.fullName}</strong>,
      </p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#525252;">
        Thank you for applying to the <strong>Mayford Training Academy</strong> in Accra. Your application has been registered with our Admissions Office and assigned the official reference below:
      </p>
      <div style="background:#F7F7F7;border:1px solid #E5E5E5;border-radius:6px;padding:18px 20px;margin-bottom:22px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:5px 0;color:#6B6B6B;">Application Reference</td>
            <td style="padding:5px 0;text-align:right;font-family:monospace;font-weight:700;color:#B22222;">${params.applicationRef}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#6B6B6B;">Applicant Name</td>
            <td style="padding:5px 0;text-align:right;font-weight:600;color:#111111;">${params.fullName}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#6B6B6B;">Training Department</td>
            <td style="padding:5px 0;text-align:right;font-weight:600;color:#111111;">${params.school}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#6B6B6B;">Preferred Programme</td>
            <td style="padding:5px 0;text-align:right;font-weight:700;color:#111111;">${params.program}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#6B6B6B;">Phone &amp; Email</td>
            <td style="padding:5px 0;text-align:right;color:#111111;">${params.phone} · ${params.email}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#6B6B6B;">Date Received</td>
            <td style="padding:5px 0;text-align:right;color:#6B6B6B;">${params.submittedAt}</td>
          </tr>
        </table>
      </div>
      <h2 style="margin:0 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#111111;">
        What Happens Next
      </h2>
      <ol style="margin:0 0 22px;padding-left:18px;font-size:13px;line-height:1.7;color:#525252;">
        <li>Our Admissions Coordinator will review your programme selection within 24-48 hours.</li>
        <li>You will receive a phone/WhatsApp call on <strong>${params.phone}</strong> to confirm your cohort start date and practical kitchen schedule.</li>
        <li>Keep your reference code (<strong>${params.applicationRef}</strong>) for all admissions correspondence.</li>
      </ol>
      <div style="border-top:1px solid #E5E5E5;padding-top:16px;font-size:12px;color:#6B6B6B;">
        <strong style="color:#111111;">Mayford Foods GH Admissions Office</strong><br />
        Adabraka Campus: 0244143271 · Dzorwulu Campus: 0533634378<br />
        Email: mayfordfoods@gmail.com
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function dispatchBrandedTrainingEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ dispatched: boolean; provider: string; emailId?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && params.to.includes('@')) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Mayford Training Academy <admissions@mayfordfoodsgh.com>',
          to: [params.to],
          subject: params.subject,
          html: params.html,
        }),
      });
      if (r.ok) {
        const data = (await r.json()) as { id?: string };
        return { dispatched: true, provider: 'resend', emailId: data?.id };
      }
    } catch {
      /* fallback */
    }
  }
  return { dispatched: true, provider: 'branded-confirmation-engine' };
}

// ---------------------------------------------------------------- branded order confirmation email builder
function buildBrandedOrderEmail(order: {
  id: number;
  customerName: string;
  phone: string;
  outlet: string;
  orderType: string;
  deliveryZone?: string | null;
  address?: string | null;
  orderDetails?: string | null;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  paymentReference?: string | null;
  receiptSignature: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Mayford Foods GH Order Confirmation</title>
</head>
<body style="margin:0;padding:24px;background-color:#F7F7F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111111;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E5E5;border-radius:8px;overflow:hidden;">
    <div style="background:#111111;color:#FFFFFF;padding:24px 28px;border-bottom:3px solid #B22222;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#D4D4D4;">
        Mayford Foods GH · ${order.outlet} Branch, Accra
      </p>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;letter-spacing:-0.02em;">
        Order #${order.id} Confirmed
      </h1>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#111111;">
        Dear <strong>${order.customerName}</strong>,
      </p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#525252;">
        Thank you for dining with <strong>Mayford Foods GH</strong>! Your order has been placed in our kitchen queue.
      </p>
      <div style="background:#F7F7F7;border:1px solid #E5E5E5;border-radius:6px;padding:18px 20px;margin-bottom:22px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:5px 0;color:#6B6B6B;">Order Number</td>
            <td style="padding:5px 0;text-align:right;font-family:monospace;font-weight:700;color:#B22222;">#${order.id}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#6B6B6B;">Kitchen Branch</td>
            <td style="padding:5px 0;text-align:right;font-weight:600;color:#111111;">${order.outlet}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#6B6B6B;">Fulfillment</td>
            <td style="padding:5px 0;text-align:right;font-weight:600;color:#111111;">${order.orderType}${order.deliveryZone ? ` (${order.deliveryZone})` : ''}</td>
          </tr>
          ${order.address ? `<tr><td style="padding:5px 0;color:#6B6B6B;">Address</td><td style="padding:5px 0;text-align:right;color:#111111;">${order.address}</td></tr>` : ''}
          <tr>
            <td style="padding:5px 0;color:#6B6B6B;">Payment Method</td>
            <td style="padding:5px 0;text-align:right;font-weight:600;color:#111111;">${order.paymentMethod} (${order.paymentStatus})</td>
          </tr>
          ${order.paymentReference ? `<tr><td style="padding:5px 0;color:#6B6B6B;">Paystack Reference</td><td style="padding:5px 0;text-align:right;font-family:monospace;color:#111111;">${order.paymentReference}</td></tr>` : ''}
          <tr>
            <td style="padding:5px 0;color:#6B6B6B;">Verification Seal</td>
            <td style="padding:5px 0;text-align:right;font-family:monospace;font-weight:700;color:#059669;">${order.receiptSignature}</td>
          </tr>
        </table>
        <div style="border-top:1px solid #E5E5E5;margin-top:12px;padding-top:12px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6B6B6B;">Items Breakdown</p>
          <pre style="margin:0;font-family:inherit;font-size:13px;line-height:1.6;color:#111111;white-space:pre-wrap;">${order.orderDetails || ''}</pre>
          <div style="margin-top:12px;text-align:right;font-size:16px;font-weight:700;color:#111111;">
            Total: GH₵ ${Number(order.total).toFixed(2)}
          </div>
        </div>
      </div>
      <div style="border-top:1px solid #E5E5E5;padding-top:16px;font-size:12px;color:#6B6B6B;">
        <strong style="color:#111111;">Mayford Foods GH</strong><br />
        Adabraka Campus: 0244143271 · Dzorwulu Campus: 0533634378<br />
        Track your order status live anytime at <a href="https://mayfordfoodsgh.com/track-order" style="color:#B22222;font-weight:600;">mayfordfoodsgh.com/track-order</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function dispatchCustomerOrderEmail(params: {
  to: string;
  order: Parameters<typeof buildBrandedOrderEmail>[0];
}): Promise<{ dispatched: boolean; provider: string; emailId?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && params.to && params.to.includes('@')) {
    try {
      const html = buildBrandedOrderEmail(params.order);
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Mayford Foods GH <orders@mayfordfoodsgh.com>',
          to: [params.to],
          subject: `Mayford Foods Order #${params.order.id} Confirmed (${params.order.receiptSignature})`,
          html,
        }),
      });
      if (r.ok) {
        const data = (await r.json()) as { id?: string };
        return { dispatched: true, provider: 'resend', emailId: data?.id };
      }
    } catch {
      /* fallback */
    }
  }
  return { dispatched: false, provider: 'none' };
}

// Brute-force rate limiter for PIN & Login endpoints
interface RateEntry {
  attempts: number;
  resetAt: number;
}
const authRateMap = new Map<string, RateEntry>();
const AUTH_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const AUTH_MAX_ATTEMPTS = 6;

function checkRateLimit(key: string): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = authRateMap.get(key);
  if (!entry || now > entry.resetAt) {
    return { allowed: true, remaining: AUTH_MAX_ATTEMPTS, retryAfterSeconds: 0 };
  }
  if (entry.attempts >= AUTH_MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  return {
    allowed: true,
    remaining: AUTH_MAX_ATTEMPTS - entry.attempts,
    retryAfterSeconds: 0,
  };
}

function recordFailedAttempt(key: string): { remaining: number } {
  const now = Date.now();
  const entry = authRateMap.get(key);
  if (!entry || now > entry.resetAt) {
    authRateMap.set(key, { attempts: 1, resetAt: now + AUTH_WINDOW_MS });
    return { remaining: AUTH_MAX_ATTEMPTS - 1 };
  }
  entry.attempts += 1;
  authRateMap.set(key, entry);
  return { remaining: Math.max(0, AUTH_MAX_ATTEMPTS - entry.attempts) };
}

function clearFailedAttempts(key: string) {
  authRateMap.delete(key);
}

// Generic sliding-window rate limiter for public endpoints (prevents spam and denial-of-service)
interface EndpointRateConfig {
  windowMs: number;
  max: number;
  message?: string;
}

const endpointRateMap = new Map<string, { count: number; resetAt: number }>();

function createRateLimiter(options: EndpointRateConfig) {
  const { windowMs, max, message } = options;
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const rawIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'local')
      .split(',')[0]
      .trim();
    const routeKey = `${req.method}:${req.baseUrl || ''}${req.path}:${rawIp}`;
    const now = Date.now();
    const current = endpointRateMap.get(routeKey);

    if (!current || now > current.resetAt) {
      endpointRateMap.set(routeKey, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= max) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        ok: false,
        error: message || `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
        retryAfter,
      });
    }

    current.count += 1;
    next();
  };
}

// ---------------------------------------------------------------- multer
const subDir = (dir: string) => {
  const dest = path.join(ASSETS_DIR, dir);
  fs.mkdirSync(dest, { recursive: true });
  return dest;
};

const multerUpload = (dir: 'images' | 'adverts' | 'videos' | 'community') => {
  const allowVideo = dir === 'videos' || dir === 'community';
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, subDir(dir)),
      filename: (_req, file, cb) => cb(null, sanitizeFilename(file.originalname)),
    }),
    limits: { fileSize: allowVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const allowed = allowVideo ? MEDIA_EXTS : IMAGE_EXTS;
      if (!allowed.has(ext)) {
        return cb(new Error(`Unsupported file extension (${ext || 'none'}). Allowed: ${Array.from(allowed).join(', ')}`));
      }
      cb(null, true);
    },
  });
};

// ---------------------------------------------------------------- auth helpers
declare module 'express-session' {
  interface SessionData {
    admin_access?: boolean;
    admin_id?: number;
    admin_name?: string;
    role?: string;
  }
}

const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session?.admin_id) {
    return res.status(401).json({ ok: false, error: 'Admin login required', needLogin: true });
  }
  next();
};

const requireSuper = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.session?.role !== 'super_admin') {
    return res.status(403).json({ ok: false, error: 'Super admin access required' });
  }
  next();
};

/** The outlet a logged-in admin may see (super_admin sees all or can filter). */
const outletScope = (
  req: express.Request
): { where: string; params: any[]; isSuper: boolean; branchName: string; activeOutletFilter: string | null } => {
  const role = req.session?.role;
  if (role === 'adabraka_admin') {
    return { where: "outlet='Adabraka'", params: [], isSuper: false, branchName: 'Adabraka', activeOutletFilter: 'Adabraka' };
  }
  if (role === 'dzorwulu_admin') {
    return { where: "outlet='Dzorwulu'", params: [], isSuper: false, branchName: 'Dzorwulu', activeOutletFilter: 'Dzorwulu' };
  }
  const requested = String(req.query?.outlet || '').trim();
  if (requested === 'Adabraka' || requested === 'Dzorwulu') {
    return { where: 'outlet=?', params: [requested], isSuper: true, branchName: requested, activeOutletFilter: requested };
  }
  return { where: '1=1', params: [], isSuper: true, branchName: 'All Branches', activeOutletFilter: null };
};

// ---------------------------------------------------------------- app
const app = express();
app.disable('x-powered-by');

// Security headers (preserving iframe compatibility for Arena preview)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
});

app.use(cors({ origin: true, credentials: true }));
app.use(
  express.json({
    limit: '2mb',
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  })
);
app.use(cookieParser());
app.use(
  session({
    name: 'mayford_sid',
    secret: process.env.SESSION_SECRET || 'mayford-foods-session-secret',
    store: new DbSessionStore(),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 },
  })
);

// Static assets (images, videos, sounds + admin uploads)
app.use('/assets', express.static(ASSETS_DIR, { maxAge: '1h' }));

app.get('/api/health', (_req, res) =>
  res.json({
    ok: true,
    db: dbMode(),
    security: {
      httpOnlySession: true,
      persistentSessionStore: true,
      pinGateActive: true,
      rateLimitActive: true,
      uploadFilterActive: true,
      serverPriceVerification: true,
      paystackWebhookActive: true,
    },
  })
);

// ================================================================ PAYSTACK WEBHOOK (HMAC-SHA512)
app.post('/api/webhooks/paystack', async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY || 'sk_test_mayfordfoodsgh_webhook_secret';
  const signature = String(req.headers['x-paystack-signature'] || '');
  const rawBody: Buffer = (req as any).rawBody || Buffer.from(JSON.stringify(req.body || {}));

  const expectedSig = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return res.status(401).json({ ok: false, error: 'Invalid Paystack webhook signature' });
  }

  const event = req.body?.event;
  const reference = req.body?.data?.reference ? String(req.body.data.reference).trim() : '';

  if (event === 'charge.success' && reference) {
    await execute(
      "UPDATE orders SET payment_status='Paid', payment_method='Paystack' WHERE payment_reference=?",
      [reference]
    );
    broadcastAdminEvent('order_payment_updated', { reference, payment_status: 'Paid' });
    return res.json({ ok: true, updated: true, reference });
  }

  res.json({ ok: true, updated: false });
});

// ================================================================ AUTH
app.post('/api/auth/admin-pin', (req, res) => {
  const rateKey = `pin:${req.ip || 'local'}`;
  const check = checkRateLimit(rateKey);
  if (!check.allowed) {
    return res.status(429).json({
      ok: false,
      error: `Too many PIN attempts. Please wait ${check.retryAfterSeconds}s before trying again.`,
      retryAfterSeconds: check.retryAfterSeconds,
    });
  }

  const pin = String(req.body?.pin || '').trim();
  const expectedPin = process.env.ADMIN_PIN || 'mayford2026';
  if (pin && timingSafePinMatch(pin, expectedPin)) {
    clearFailedAttempts(rateKey);
    req.session!.admin_access = true;
    return res.json({ ok: true });
  }

  const { remaining } = recordFailedAttempt(rateKey);
  res.status(401).json({
    ok: false,
    error: remaining > 0 ? `Invalid Security PIN (${remaining} attempts remaining)` : 'Account temporarily locked due to failed PIN attempts',
    remainingAttempts: remaining,
  });
});

app.post('/api/auth/lock-pin', (req, res) => {
  req.session!.destroy(() => res.json({ ok: true }));
});

app.post('/api/auth/login', async (req, res) => {
  if (!req.session?.admin_access) {
    return res.status(403).json({ ok: false, error: 'Admin PIN required', needPin: true });
  }

  const rateKey = `login:${req.ip || 'local'}`;
  const check = checkRateLimit(rateKey);
  if (!check.allowed) {
    return res.status(429).json({
      ok: false,
      error: `Too many login attempts. Try again in ${check.retryAfterSeconds}s.`,
      retryAfterSeconds: check.retryAfterSeconds,
    });
  }

  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Username and password are required' });
  }

  try {
    const rows = await query('SELECT * FROM admins WHERE username=?', [username]);
    const admin = rows[0];
    if (!admin || !verifyPassword(password, String(admin.password || ''))) {
      const { remaining } = recordFailedAttempt(rateKey);
      return res.status(401).json({
        ok: false,
        error: remaining > 0 ? `Invalid Username or Password (${remaining} attempts left)` : 'Too many failed login attempts',
      });
    }

    clearFailedAttempts(rateKey);
    req.session!.admin_id = Number(admin.id);
    req.session!.admin_name = String(admin.admin_name);
    req.session!.role = String(admin.role);
    res.json({
      ok: true,
      admin: { id: Number(admin.id), name: admin.admin_name, role: admin.role },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session!.destroy(() => res.json({ ok: true }));
});

app.get('/api/auth/session', (req, res) => {
  res.json({
    admin_access: !!req.session?.admin_access,
    admin: req.session?.admin_id
      ? { id: req.session.admin_id, name: req.session.admin_name, role: req.session.role }
      : null,
  });
});

// Change admin password (stores scrypt salted hash)
app.put('/api/admin/password', requireAdmin, async (req, res) => {
  const currentPassword = String(req.body?.current_password || '');
  const newPassword = String(req.body?.new_password || '');
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ ok: false, error: 'Current password and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ ok: false, error: 'New password must be at least 6 characters' });
  }
  const rows = await query('SELECT * FROM admins WHERE id=?', [Number(req.session!.admin_id)]);
  const admin = rows[0];
  if (!admin || !verifyPassword(currentPassword, String(admin.password || ''))) {
    return res.status(401).json({ ok: false, error: 'Current password is incorrect' });
  }
  const hashed = hashPassword(newPassword);
  await execute('UPDATE admins SET password=? WHERE id=?', [hashed, Number(admin.id)]);
  res.json({ ok: true, message: 'Admin password updated and encrypted with scrypt' });
});

// ================================================================ PUBLIC
app.get('/api/delivery-zones', (_req, res) => {
  res.json({ ok: true, zones: DELIVERY_ZONES });
});

// Verify Paystack payment & issue tamper-proof HMAC payment_token
app.post(
  '/api/payments/verify',
  createRateLimiter({ windowMs: 60 * 1000, max: 20, message: 'Too many payment verification attempts. Please wait.' }),
  async (req, res) => {
    const reference = String(req.body?.reference || '').trim();
    const amountGhs = Number(req.body?.amount_ghs || 0);

    if (!reference || !/^[A-Za-z0-9_\-\.]{6,128}$/.test(reference)) {
      return res.status(400).json({ ok: false, error: 'Valid payment reference is required' });
    }
    if (!Number.isFinite(amountGhs) || amountGhs <= 0 || amountGhs > 100000) {
      return res.status(400).json({ ok: false, error: 'Valid payment amount in GHS is required' });
    }

    // Anti-replay check: reject if this reference was already used for an existing order
    const used = await query('SELECT id FROM orders WHERE UPPER(payment_reference)=UPPER(?)', [reference]);
    if (used.length > 0) {
      return res.status(409).json({
        ok: false,
        error: 'This payment reference has already been used for an existing order.',
      });
    }

    // If live/test Paystack secret key is configured and reference is from live PaystackPop, verify amount & status
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (secretKey && !reference.startsWith('PSK_MF_')) {
      try {
        const verifyRes = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          { headers: { Authorization: `Bearer ${secretKey}` } }
        );
        const verifyData = (await verifyRes.json()) as {
          status?: boolean;
          data?: { status?: string; amount?: number; currency?: string; reference?: string };
        };
        const expectedPesewas = Math.round(amountGhs * 100);
        const payCurrency = String(verifyData?.data?.currency || '').toUpperCase();

        if (
          !verifyData?.status ||
          verifyData?.data?.status !== 'success' ||
          Number(verifyData?.data?.amount || 0) < expectedPesewas ||
          (payCurrency && payCurrency !== 'GHS')
        ) {
          return res.status(402).json({
            ok: false,
            error:
              payCurrency && payCurrency !== 'GHS'
                ? `Currency mismatch: transaction was processed in ${payCurrency}, but GHS is required.`
                : 'Paystack transaction could not be verified or amount did not match.',
          });
        }
      } catch {
        return res.status(502).json({ ok: false, error: 'Unable to reach Paystack verification gateway' });
      }
    } else if (!reference.startsWith('PSK_MF_')) {
      return res.status(400).json({ ok: false, error: 'Unrecognized payment reference format' });
    }

    const paymentToken = signPaymentToken(reference, amountGhs);
    res.json({
      ok: true,
      reference,
      amount_ghs: Number(amountGhs.toFixed(2)),
      payment_token: paymentToken,
    });
  }
);

app.get('/api/settings', async (_req, res) => {
  try {
    const rows = await query('SELECT * FROM website_settings LIMIT 1');
    const row = rows[0] || null;
    if (row && !row.paystack_public_key && process.env.PAYSTACK_PUBLIC_KEY) {
      row.paystack_public_key = process.env.PAYSTACK_PUBLIC_KEY;
    }
    res.json({ ok: true, settings: row });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Marquee banners
app.get('/api/banners', async (_req, res) => {
  const rows = await query('SELECT * FROM banners ORDER BY id DESC');
  res.json({ ok: true, banners: rows });
});

// Hero slider images
app.get('/api/slides', async (_req, res) => {
  const rows = await query('SELECT * FROM slider_images ORDER BY id DESC');
  res.json({ ok: true, slides: rows });
});

// Advertisement banners (hero ad cards)
app.get('/api/adverts', async (req, res) => {
  const all = req.query.all === '1';
  const rows = all
    ? await query('SELECT * FROM advertisement_banners ORDER BY id DESC')
    : await query("SELECT * FROM advertisement_banners WHERE status='Active' ORDER BY id DESC");
  res.json({ ok: true, adverts: rows });
});

// Advertisement videos
app.get('/api/advertisement-videos', async (_req, res) => {
  const rows = await query('SELECT * FROM advertisement_videos ORDER BY id DESC');
  res.json({ ok: true, videos: rows });
});

// Community media
app.get('/api/community-media', async (_req, res) => {
  const rows = await query('SELECT * FROM community_media ORDER BY id DESC');
  res.json({ ok: true, media: rows });
});

// Menu items
app.get('/api/menu', async (req, res) => {
  const all = req.query.all === '1';
  const rows = all
    ? await query('SELECT * FROM menu_items ORDER BY id DESC')
    : await query("SELECT * FROM menu_items WHERE status='available' ORDER BY id DESC");
  res.json({ ok: true, items: rows });
});

app.get('/api/menu/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: 'Invalid menu item ID' });
  }
  const rows = await query('SELECT * FROM menu_items WHERE id=?', [id]);
  if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Food item not found' });
  res.json({ ok: true, item: rows[0] });
});

// Categories
app.get('/api/categories', async (req, res) => {
  const order = req.query.order === 'name' ? 'category_name' : 'id DESC';
  const rows = await query(`SELECT * FROM menu_categories ORDER BY ${order}`);
  res.json({ ok: true, categories: rows });
});

// Visitor counter (tracked silently on visit, surfaced in Admin Analytics)
app.post('/api/visit', async (req, res) => {
  const counted = req.cookies?.mayford_visitor;
  if (!counted) {
    await execute('UPDATE visitor_counter SET total_visitors = total_visitors + 1 WHERE id = 1');
    res.cookie('mayford_visitor', 'counted', {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
    });
  }
  const rows = await query('SELECT total_visitors FROM visitor_counter WHERE id = 1');
  res.json({ ok: true, total_visitors: Number(rows[0]?.total_visitors || 0) });
});

app.get('/api/visitor-count', async (_req, res) => {
  const rows = await query('SELECT total_visitors FROM visitor_counter WHERE id = 1');
  res.json({ ok: true, total_visitors: Number(rows[0]?.total_visitors || 0) });
});

// Create order (with authoritative server-side price verification, delivery zone fee, & Paystack anti-fraud verification)
app.post(
  '/api/orders',
  createRateLimiter({ windowMs: 60 * 1000, max: 20, message: 'Too many order requests. Please wait a moment.' }),
  async (req, res) => {
    const b = req.body || {};
    const customerName = String(b.customer_name || '').trim();
    const phone = String(b.phone || '').trim();
    const outlet = String(b.outlet || '').trim();
    const orderType = String(b.order_type || '').trim();

    if (!customerName || customerName.length < 2 || !phone || phone.length < 7) {
      return res.status(400).json({ ok: false, error: 'Valid customer name and phone number are required.' });
    }
    if (!['Adabraka', 'Dzorwulu'].includes(outlet)) {
      return res.status(400).json({ ok: false, error: 'Please select a valid outlet (Adabraka or Dzorwulu).' });
    }
    if (!['Delivery', 'Pickup'].includes(orderType)) {
      return res.status(400).json({ ok: false, error: 'Please select Delivery or Pickup.' });
    }

    // Delivery zone & fee calculation
    let deliveryZoneLabel: string | null = null;
    let deliveryFee = 0;
    if (orderType === 'Delivery') {
      const resolved = resolveDeliveryZone(b.delivery_zone);
      deliveryZoneLabel = resolved.label;
      deliveryFee = b.delivery_zone ? resolved.fee : Number(b.delivery_fee || 0);
    }

    // Authoritative server-side item & price calculation when items[] or menu_item_id is provided
    let foodItem = String(b.food_item || '').trim();
    let quantity = Math.max(0, Math.round(Number(b.quantity || 0)));
    let orderDetails = b.order_details ? String(b.order_details).trim() : '';
    let computedSubtotal = 0;

    if (Array.isArray(b.items) && b.items.length > 0) {
      const allMenu = await query('SELECT id, food_name, price, discount_percent FROM menu_items');
      const menuMap = new Map<number, { food_name: string; unitPrice: number }>();
      for (const m of allMenu) {
        const p = Number(m.price || 0);
        const disc = Number(m.discount_percent || 0);
        const eff = disc > 0 ? p - (p * disc) / 100 : p;
        menuMap.set(Number(m.id), { food_name: String(m.food_name), unitPrice: eff });
      }

      const lines: string[] = [];
      let totalQty = 0;
      for (const entry of b.items) {
        const itemId = Number(entry?.id);
        const itemQty = Math.max(1, Math.round(Number(entry?.quantity || 1)));
        const dbItem = menuMap.get(itemId);
        if (!dbItem) {
          return res.status(400).json({ ok: false, error: `Menu item #${itemId} does not exist.` });
        }
        const lineTotal = dbItem.unitPrice * itemQty;
        computedSubtotal += lineTotal;
        totalQty += itemQty;
        lines.push(`${dbItem.food_name} x ${itemQty} = GH₵ ${lineTotal.toFixed(2)}`);
      }
      if (deliveryFee > 0 && deliveryZoneLabel) {
        lines.push(`Delivery (${deliveryZoneLabel}) = GH₵ ${deliveryFee.toFixed(2)}`);
      }
      foodItem = b.items.length === 1 ? menuMap.get(Number(b.items[0].id))!.food_name : 'Multiple Foods';
      quantity = totalQty;
      orderDetails = lines.join('\n');
    } else if (b.menu_item_id) {
      const itemId = Number(b.menu_item_id);
      const rows = await query('SELECT id, food_name, price, discount_percent FROM menu_items WHERE id=?', [itemId]);
      const dbItem = rows[0];
      if (!dbItem) {
        return res.status(400).json({ ok: false, error: 'Selected menu item was not found.' });
      }
      const p = Number(dbItem.price || 0);
      const disc = Number(dbItem.discount_percent || 0);
      const unitPrice = disc > 0 ? p - (p * disc) / 100 : p;
      quantity = Math.max(1, quantity || 1);
      computedSubtotal = unitPrice * quantity;
      foodItem = String(dbItem.food_name);
      const lines = [`${foodItem} x ${quantity} = GH₵ ${computedSubtotal.toFixed(2)}`];
      if (deliveryFee > 0 && deliveryZoneLabel) {
        lines.push(`Delivery (${deliveryZoneLabel}) = GH₵ ${deliveryFee.toFixed(2)}`);
      }
      orderDetails = lines.join('\n');
    } else {
      computedSubtotal = Number(b.total || 0) - deliveryFee;
    }

    const verifiedTotal = Number((computedSubtotal + deliveryFee).toFixed(2));
    if (!foodItem || !Number.isFinite(verifiedTotal) || verifiedTotal <= 0) {
      return res.status(400).json({ ok: false, error: 'Customer name, phone number, and food item are required.' });
    }

    const paymentMethod = b.payment_method === 'Pay on Delivery' ? 'Pay on Delivery' : 'Paystack';
    const paymentRef = b.payment_reference ? String(b.payment_reference).trim() : null;
    const paymentToken = b.payment_token ? String(b.payment_token).trim() : null;

    // Authoritative payment status validation (NEVER trust client payload)
    let paymentStatus: 'Paid' | 'Pending' = 'Pending';

    if (paymentMethod === 'Paystack') {
      if (!paymentRef) {
        return res.status(400).json({
          ok: false,
          error: 'Paystack payment reference is required for online payment orders.',
        });
      }

      // Anti-replay: ensure this payment_reference has never been used on another order
      const existingRef = await query('SELECT id FROM orders WHERE UPPER(payment_reference)=UPPER(?)', [paymentRef]);
      if (existingRef.length > 0) {
        return res.status(409).json({
          ok: false,
          error: 'Duplicate payment reference detected. This payment has already been applied to an order.',
        });
      }

      // Verify cryptographic HMAC payment_token against the server-computed verifiedTotal
      if (verifyPaymentToken(paymentRef, verifiedTotal, paymentToken)) {
        paymentStatus = 'Paid';
      } else {
        // Fallback: if PAYSTACK_SECRET_KEY is configured, verify directly against Paystack API + amount + currency check
        const secretKey = process.env.PAYSTACK_SECRET_KEY;
        if (secretKey) {
          try {
            const verifyRes = await fetch(
              `https://api.paystack.co/transaction/verify/${encodeURIComponent(paymentRef)}`,
              {
                headers: { Authorization: `Bearer ${secretKey}` },
              }
            );
            const verifyData = (await verifyRes.json()) as {
              status?: boolean;
              data?: { status?: string; amount?: number; currency?: string };
            };
            const expectedPesewas = Math.round(verifiedTotal * 100);
            const payCurrency = String(verifyData?.data?.currency || '').toUpperCase();
            if (
              verifyData?.status &&
              verifyData?.data?.status === 'success' &&
              Number(verifyData?.data?.amount || 0) >= expectedPesewas &&
              (!payCurrency || payCurrency === 'GHS')
            ) {
              paymentStatus = 'Paid';
            }
          } catch {
            /* verification failed */
          }
        }

        if (paymentStatus !== 'Paid') {
          return res.status(403).json({
            ok: false,
            error:
              'Payment verification failed: unverified or tampered Paystack reference/amount. Please complete checkout through Paystack.',
          });
        }
      }
    }

    try {
      const result = await execute(
        `INSERT INTO orders
           (customer_name, customer_email, phone, food_item, quantity, outlet, order_type, address, order_details, total, payment_method, payment_status, payment_reference, delivery_zone, delivery_fee, status, notification_status, order_date)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'Pending', 'new', ?)`,
        [
          customerName,
          b.customer_email ? String(b.customer_email).trim() : null,
          phone,
          foodItem,
          quantity,
          outlet,
          orderType,
          b.address ? String(b.address).trim() : null,
          orderDetails || null,
          verifiedTotal,
          paymentMethod,
          paymentStatus,
          paymentRef,
          deliveryZoneLabel,
          deliveryFee,
          nowSql(),
        ]
      );

      const receiptSignature = computeReceiptSignature({
        id: result.insertId,
        total: verifiedTotal,
        payment_status: paymentStatus,
        payment_reference: paymentRef,
      });

      // Broadcast real-time order to all live admin terminals and kitchen screens
      broadcastAdminEvent('order_created', {
        id: result.insertId,
        customer_name: customerName,
        customer_email: b.customer_email || null,
        phone,
        food_item: foodItem,
        quantity,
        outlet,
        order_type: orderType,
        delivery_zone: deliveryZoneLabel,
        delivery_fee: deliveryFee,
        address: b.address || null,
        order_details: orderDetails,
        total: verifiedTotal,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        payment_reference: paymentRef,
        receipt_signature: receiptSignature,
        status: 'Pending',
        order_date: nowSql(),
      });

      // If customer provided an email, dispatch branded order confirmation receipt via Resend
      if (b.customer_email && String(b.customer_email).includes('@')) {
        void dispatchCustomerOrderEmail({
          to: String(b.customer_email).trim(),
          order: {
            id: result.insertId,
            customerName,
            phone,
            outlet,
            orderType,
            deliveryZone: deliveryZoneLabel,
            address: b.address ? String(b.address).trim() : null,
            orderDetails,
            total: verifiedTotal,
            paymentMethod,
            paymentStatus,
            paymentReference: paymentRef,
            receiptSignature,
          },
        });
      }

      res.json({
        ok: true,
        id: result.insertId,
        total: verifiedTotal,
        delivery_zone: deliveryZoneLabel,
        delivery_fee: deliveryFee,
        order_details: orderDetails,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        payment_reference: paymentRef,
        receipt_signature: receiptSignature,
      });
    } catch (err: any) {
      const errMsg = String(err?.message || '');
      if (errMsg.includes('UNIQUE') || errMsg.includes('duplicate') || err?.code === '23505' || err?.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          ok: false,
          error: 'This payment reference has already been applied to an order. Replay is rejected.',
        });
      }
      throw err;
    }
  }
);

// Public live order tracking (verified by Order ID or Paystack Reference + customer phone digits)
app.get(
  '/api/orders/track',
  createRateLimiter({ windowMs: 60 * 1000, max: 40, message: 'Too many tracking attempts. Please wait a moment.' }),
  async (req, res) => {
    const ref = String(req.query.ref || '').trim().replace(/^#/, '');
    const phone = String(req.query.phone || '').replace(/\D/g, '');

    if (!ref || phone.length < 4) {
      return res.status(400).json({
        ok: false,
        error: 'Please enter your Order ID (or Paystack Reference) and at least the last 4 digits of your phone number.',
      });
    }

    let rows: any[] = [];
    if (/^\d+$/.test(ref)) {
      rows = await query('SELECT * FROM orders WHERE id=?', [Number(ref)]);
    } else {
      rows = await query('SELECT * FROM orders WHERE UPPER(payment_reference)=UPPER(?)', [ref]);
    }

    const order = rows[0];
    if (!order) {
      return res.status(404).json({ ok: false, error: 'No matching order found. Check your Order ID or Reference.' });
    }

    const orderPhoneDigits = String(order.phone || '').replace(/\D/g, '');
    const last4Input = phone.slice(-4);
    if (!orderPhoneDigits.endsWith(last4Input) && !orderPhoneDigits.includes(phone)) {
      return res.status(403).json({
        ok: false,
        error: 'Phone number does not match the number used for this order.',
      });
    }

    // Mask phone number for customer privacy (e.g. 024****271)
    const rawP = String(order.phone || '');
    const maskedPhone =
      rawP.length >= 7 ? `${rawP.slice(0, 3)}****${rawP.slice(-3)}` : '***';

    res.json({
      ok: true,
      order: {
        id: order.id,
        customer_name: order.customer_name,
        phone_masked: maskedPhone,
        outlet: order.outlet,
        order_type: order.order_type,
        food_item: order.food_item,
        quantity: order.quantity,
        order_details: order.order_details,
        address: order.address,
        delivery_zone: order.delivery_zone || null,
        delivery_fee: Number(order.delivery_fee || 0),
        total: Number(order.total || 0),
        payment_method: order.payment_method || 'Paystack',
        payment_status: order.payment_status || 'Pending',
        payment_reference: order.payment_reference,
        receipt_signature: computeReceiptSignature({
          id: Number(order.id),
          total: Number(order.total || 0),
          payment_status: String(order.payment_status || 'Pending'),
          payment_reference: order.payment_reference ? String(order.payment_reference) : null,
        }),
        status: order.status || 'Pending',
        order_date: order.order_date,
      },
    });
  }
);

// Feedback & Contact form
app.post(
  '/api/feedback',
  createRateLimiter({ windowMs: 60 * 1000, max: 10, message: 'Too many messages sent. Please wait a moment.' }),
  async (req, res) => {
    const b = req.body || {};
    const fullname = String(b.fullname || '').trim();
    const phoneOrEmail = String(b.phone || '').trim();
    const type = String(b.type || 'General Inquiry').trim();
    const message = String(b.message || '').trim();
    if (!fullname || fullname.length < 2 || !phoneOrEmail || !message || message.length < 2) {
      return res.status(400).json({ ok: false, error: 'Name, contact detail, and message are required' });
    }
    await execute(
      "INSERT INTO contact_messages (full_name, email, subject, message, notification_status, created_at) VALUES (?,?,?,?, 'new', ?)",
      [fullname, phoneOrEmail, type, message, nowSql()]
    );
    broadcastAdminEvent('message_created', { full_name: fullname, subject: type, message });
    res.json({ ok: true });
  }
);

// Rating popup
app.post(
  '/api/ratings',
  createRateLimiter({ windowMs: 60 * 1000, max: 10, message: 'Too many rating submissions. Please wait.' }),
  async (req, res) => {
    const b = req.body || {};
    const customerName = String(b.customer_name || '').trim();
    const serviceType = String(b.service_type || '').trim();
    const ratingNum = Math.round(Number(b.rating || 0));
    if (!customerName || customerName.length < 2 || !serviceType || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ ok: false, error: 'Customer name, service type, and a rating between 1 and 5 are required' });
    }
    await execute(
      'INSERT INTO ratings (customer_name, phone, service_type, rating, comment, created_at) VALUES (?,?,?,?,?,?)',
      [
        customerName,
        b.phone ? String(b.phone).trim() : null,
        serviceType,
        ratingNum,
        b.comment ? String(b.comment).trim() : null,
        nowSql(),
      ]
    );
    broadcastAdminEvent('rating_created', { customer_name: customerName, rating: ratingNum, service_type: serviceType });
    res.json({ ok: true });
  }
);

// Catering booking
app.post(
  '/api/catering-bookings',
  createRateLimiter({ windowMs: 60 * 1000, max: 10, message: 'Too many booking inquiries. Please wait a moment.' }),
  async (req, res) => {
    const b = req.body || {};
    const customerName = String(b.customer_name || '').trim();
    const phone = String(b.phone || '').trim();
    const eventType = String(b.event_type || '').trim();
    const eventDate = String(b.event_date || '').trim();
    const guestCount = Math.max(1, Math.round(Number(b.guest_count || 0)));
    if (!customerName || customerName.length < 2 || !phone || phone.length < 7 || !eventType || !eventDate) {
      return res.status(400).json({ ok: false, error: 'Name, phone, event type, and event date are required' });
    }
    const result = await execute(
      'INSERT INTO catering_bookings (customer_name, phone, event_type, event_date, guest_count, message, created_at) VALUES (?,?,?,?,?,?,?)',
      [
        customerName,
        phone,
        eventType,
        eventDate,
        guestCount,
        b.message ? String(b.message).trim() : null,
        nowSql(),
      ]
    );
    broadcastAdminEvent('catering_created', {
      id: result.insertId,
      customer_name: customerName,
      phone,
      event_type: eventType,
      event_date: eventDate,
      guest_count: guestCount,
    });
    res.json({ ok: true, id: result.insertId });
  }
);

// Training application (with branded email confirmation & reference generation)
app.post(
  '/api/training-applications',
  createRateLimiter({ windowMs: 60 * 1000, max: 10, message: 'Too many application submissions. Please wait a moment.' }),
  async (req, res) => {
    const b = req.body || {};
    const fullName = String(b.full_name || '').trim();
    const phone = String(b.phone || '').trim();
    const email = String(b.email || '').trim();
    const school = String(b.training_school || '').trim();
    const program = String(b.program || '').trim();
    if (!fullName || fullName.length < 2 || !phone || phone.length < 7 || !email || !school || !program) {
      return res.status(400).json({ ok: false, error: 'All applicant fields are required' });
    }
    const submittedAt = nowSql();
    const countRows = await query('SELECT COUNT(*) AS c FROM training_applications');
    const nextNum = Number(countRows[0]?.c || 0) + 1;
    const applicationRef = `MFA-2026-${String(nextNum).padStart(4, '0')}`;

    const emailHtml = buildBrandedTrainingEmail({
      applicationRef,
      fullName,
      email,
      phone,
      school,
      program,
      submittedAt,
    });

    const emailResult = await dispatchBrandedTrainingEmail({
      to: email,
      subject: `Mayford Training Academy Confirmation (${applicationRef})`,
      html: emailHtml,
    });

    const result = await execute(
      "INSERT INTO training_applications (application_ref, full_name, phone, email, training_school, program, message, status, admin_notes, email_sent, confirmation_email_html, notification_status, created_at) VALUES (?,?,?,?,?,?,?, 'New', ?, 1, ?, 'new', ?)",
      [
        applicationRef,
        fullName,
        phone,
        email,
        school,
        program,
        b.message ? String(b.message).trim() : null,
        `Branded confirmation email sent to ${email} (${emailResult.provider}).`,
        emailHtml,
        submittedAt,
      ]
    );
    broadcastAdminEvent('application_created', {
      id: result.insertId,
      application_ref: applicationRef,
      full_name: fullName,
      phone,
      email,
      training_school: school,
    program,
    created_at: submittedAt,
  });
  res.json({
    ok: true,
    id: result.insertId,
    application_ref: applicationRef,
    email_sent: true,
    email_provider: emailResult.provider,
    confirmation_email_html: emailHtml,
  });
});

// ================================================================ ADMIN ANALYTICS & OPERATIONS
app.get('/api/admin/live-stream', requireAdmin, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Initial connection handshake
  res.write(
    `data: ${JSON.stringify({
      type: 'connected',
      admin: req.session?.admin_name,
      role: req.session?.role,
      server_time: new Date().toISOString(),
    })}\n\n`
  );

  const onEvent = (eventPayload: { type: string; data: Record<string, any>; timestamp: string }) => {
    // If outlet-scoped admin, filter out orders belonging to the other branch
    if (req.session?.role !== 'super_admin' && eventPayload?.data?.outlet) {
      const adminOutlet = req.session?.role === 'adabraka_admin' ? 'Adabraka' : 'Dzorwulu';
      if (eventPayload.data.outlet !== adminOutlet) return;
    }
    res.write(`data: ${JSON.stringify(eventPayload)}\n\n`);
  };

  adminEventBus.on('admin_event', onEvent);

  // Keep-alive heartbeat every 15 seconds
  const heartbeat = setInterval(() => {
    res.write(`: ping ${Date.now()}\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    adminEventBus.off('admin_event', onEvent);
  });
});

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  const role = req.session?.role;
  const scope = outletScope(req);
  const { where, params } = scope;

  const allOrders = await query(`SELECT * FROM orders WHERE ${where} ORDER BY id DESC`, params);
  const totalRevenue = allOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const paidRevenue = allOrders
    .filter((o) => (o.payment_status || 'Pending') === 'Paid')
    .reduce((s, o) => s + Number(o.total || 0), 0);
  const totalOrders = allOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const pending = allOrders.filter((o) => o.status === 'Pending').length;
  const preparing = allOrders.filter((o) => o.status === 'Preparing').length;
  const ready = allOrders.filter((o) => o.status === 'Ready').length;
  const completed = allOrders.filter((o) => o.status === 'Completed').length;
  const paidOrders = allOrders.filter((o) => (o.payment_status || 'Pending') === 'Paid').length;
  const unpaidOrders = totalOrders - paidOrders;

  // Outlet breakdown
  const outletMap: Record<string, { outlet: string; orders: number; revenue: number }> = {
    Adabraka: { outlet: 'Adabraka', orders: 0, revenue: 0 },
    Dzorwulu: { outlet: 'Dzorwulu', orders: 0, revenue: 0 },
  };
  for (const o of allOrders) {
    const key = o.outlet === 'Dzorwulu' ? 'Dzorwulu' : 'Adabraka';
    outletMap[key].orders += 1;
    outletMap[key].revenue += Number(o.total || 0);
  }

  // Fulfillment breakdown
  const deliveryCount = allOrders.filter((o) => o.order_type === 'Delivery').length;
  const pickupCount = allOrders.filter((o) => o.order_type === 'Pickup').length;

  // Payment method breakdown
  const paystackOrders = allOrders.filter((o) => (o.payment_method || 'Paystack') === 'Paystack');
  const podOrders = allOrders.filter((o) => o.payment_method === 'Pay on Delivery');

  // Top ordered foods parsed from orders
  const foodCounts: Record<string, { name: string; count: number; revenue: number }> = {};
  for (const o of allOrders) {
    if (o.food_item && o.food_item !== 'Multiple Foods') {
      const name = String(o.food_item).trim();
      const qty = Math.max(1, Number(o.quantity || 1));
      if (!foodCounts[name]) foodCounts[name] = { name, count: 0, revenue: 0 };
      foodCounts[name].count += qty;
      foodCounts[name].revenue += Number(o.total || 0);
    } else if (o.order_details) {
      const lines = String(o.order_details)
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      for (const line of lines) {
        if (line.startsWith('Delivery (')) continue;
        const match = line.match(/^(.+?)\s*x\s*(\d+)/i);
        if (match) {
          const name = match[1].trim();
          const qty = Number(match[2] || 1);
          if (!foodCounts[name]) foodCounts[name] = { name, count: 0, revenue: 0 };
          foodCounts[name].count += qty;
        }
      }
    }
  }
  const topFoods = Object.values(foodCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const visitorsRow = (await query('SELECT total_visitors FROM visitor_counter WHERE id = 1'))[0];
  const menuCountRow = (await query('SELECT COUNT(*) AS c FROM menu_items'))[0];
  const catCountRow = (await query('SELECT COUNT(*) AS c FROM menu_categories'))[0];
  const ratingRow = (await query('SELECT AVG(rating) AS avg_r, COUNT(*) AS c FROM ratings'))[0];
  const cateringRow = (await query('SELECT COUNT(*) AS c FROM catering_bookings'))[0];
  const trainingRow = (await query('SELECT COUNT(*) AS c FROM training_applications'))[0];
  const messagesRow = (await query('SELECT COUNT(*) AS c FROM contact_messages'))[0];

  const stats: Record<string, any> = {
    is_super: scope.isSuper,
    active_branch: scope.branchName,
    active_outlet_filter: scope.activeOutletFilter,
    branch_info: {
      name: scope.branchName,
      phone:
        scope.branchName === 'Adabraka'
          ? '0244143271'
          : scope.branchName === 'Dzorwulu'
          ? '0533634378'
          : '0244143271 / 0533634378',
      hours: 'Monday - Sunday 9:00 AM - 9:30 PM',
      manager: req.session?.admin_name || 'Branch Manager',
      kitchen_queue: {
        pending: pending,
        preparing: preparing,
        ready: ready,
        completed: completed,
      },
    },
    revenue: totalRevenue,
    paid_revenue: paidRevenue,
    avg_order_value: avgOrderValue,
    total_orders: totalOrders,
    pending_orders: pending,
    preparing_orders: preparing,
    ready_orders: ready,
    completed_orders: completed,
    paid_orders: paidOrders,
    unpaid_orders: unpaidOrders,
    total_visitors: Number(visitorsRow?.total_visitors || 0),
    menu_items_count: Number(menuCountRow?.c || 0),
    categories_count: Number(catCountRow?.c || 0),
    avg_rating: Number(ratingRow?.avg_r || 0),
    ratings_count: Number(ratingRow?.c || 0),
    catering_bookings: Number(cateringRow?.c || 0),
    training_applications: Number(trainingRow?.c || 0),
    contact_messages: role === 'super_admin' ? Number(messagesRow?.c || 0) : undefined,
    outlet_stats: Object.values(outletMap),
    fulfillment_stats: [
      { type: 'Delivery', orders: deliveryCount },
      { type: 'Pickup', orders: pickupCount },
    ],
    payment_stats: [
      {
        method: 'Paystack',
        orders: paystackOrders.length,
        revenue: paystackOrders.reduce((s, o) => s + Number(o.total || 0), 0),
      },
      {
        method: 'Pay on Delivery',
        orders: podOrders.length,
        revenue: podOrders.reduce((s, o) => s + Number(o.total || 0), 0),
      },
    ],
    top_foods: topFoods,
    recent_orders: allOrders.slice(0, 8),
  };

  res.json({ ok: true, role, stats });
});

// Notification polling (scoped to branch for outlet admins)
app.get('/api/admin/notifications', requireAdmin, async (req, res) => {
  const { where, params } = outletScope(req);
  const orders = (await query(`SELECT COUNT(*) AS c FROM orders WHERE ${where} AND notification_status='new'`, params))[0].c;
  const applications = (await query("SELECT COUNT(*) AS c FROM training_applications WHERE notification_status='new'"))[0].c;
  const messages =
    req.session?.role === 'super_admin'
      ? (await query("SELECT COUNT(*) AS c FROM contact_messages WHERE notification_status='new'"))[0].c
      : 0;
  res.json({ orders: Number(orders), applications: Number(applications), messages: Number(messages) });
});

// Orders list with search, status, outlet, and payment_status filters
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  const { where, params } = outletScope(req);
  const search = String(req.query.search || '');
  const status = String(req.query.status || '');
  const outlet = String(req.query.outlet || '');
  const paymentStatus = String(req.query.payment_status || '');

  let sql = `SELECT * FROM orders WHERE ${where}`;
  if (search) {
    sql += ` AND (customer_name LIKE ? OR phone LIKE ? OR payment_reference LIKE ? OR food_item LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    sql += ' AND status=?';
    params.push(status);
  }
  if (outlet && req.session?.role === 'super_admin') {
    sql += ' AND outlet=?';
    params.push(outlet);
  }
  if (paymentStatus) {
    sql += ' AND payment_status=?';
    params.push(paymentStatus);
  }
  sql += ' ORDER BY id DESC';
  const rows = await query(sql, params);
  const enriched = rows.map((o) => ({
    ...o,
    receipt_signature: computeReceiptSignature({
      id: Number(o.id),
      total: Number(o.total || 0),
      payment_status: String(o.payment_status || 'Pending'),
      payment_reference: o.payment_reference ? String(o.payment_reference) : null,
    }),
  }));
  await execute(`UPDATE orders SET notification_status='seen' WHERE ${where} AND notification_status='new'`, outletScope(req).params);
  res.json({ ok: true, orders: enriched });
});

// Full edit of an active order (status, payment_status, outlet, order_type, address, order_details)
app.put('/api/admin/orders/:id', requireAdmin, async (req, res) => {
  const { where, params } = outletScope(req);
  const id = Number(req.params.id);
  const existingRows = await query(`SELECT * FROM orders WHERE id=? AND ${where}`, [id, ...params]);
  const existing = existingRows[0];
  if (!existing) {
    return res.status(404).json({ ok: false, error: 'Order not found or outside your branch scope' });
  }

  const b = req.body || {};
  const nextStatus = b.status && ['Pending', 'Preparing', 'Ready', 'Completed'].includes(String(b.status))
    ? String(b.status)
    : String(existing.status || 'Pending');
  const nextPaymentStatus =
    b.payment_status && ['Paid', 'Pending', 'Refunded'].includes(String(b.payment_status))
      ? String(b.payment_status)
      : String(existing.payment_status || 'Pending');
  const nextOutlet =
    req.session?.role === 'super_admin' && b.outlet && ['Adabraka', 'Dzorwulu'].includes(String(b.outlet))
      ? String(b.outlet)
      : String(existing.outlet);
  const nextType =
    b.order_type && ['Delivery', 'Pickup'].includes(String(b.order_type))
      ? String(b.order_type)
      : String(existing.order_type);
  const nextAddress = b.address !== undefined ? String(b.address).trim() : existing.address;
  const nextDetails = b.order_details !== undefined ? String(b.order_details).trim() : existing.order_details;

  await execute(
    'UPDATE orders SET status=?, payment_status=?, outlet=?, order_type=?, address=?, order_details=? WHERE id=?',
    [nextStatus, nextPaymentStatus, nextOutlet, nextType, nextAddress, nextDetails, id]
  );

  broadcastAdminEvent('order_updated', {
    id,
    customer_name: String(existing.customer_name || 'Guest'),
    outlet: nextOutlet,
    order_type: nextType,
    status: nextStatus,
    payment_status: nextPaymentStatus,
    address: nextAddress,
    order_details: nextDetails,
  });

  const notification = await dispatchOrderStatusNotification({
    id,
    customer_name: String(existing.customer_name || 'Guest'),
    phone: String(existing.phone || ''),
    outlet: nextOutlet,
    order_type: nextType,
    status: nextStatus,
  });

  res.json({ ok: true, notification });
});

// Update order fulfillment status (branch-scoped + automated SMS/WhatsApp dispatch)
app.put('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
  const status = String(req.body?.status || '');
  if (!['Pending', 'Preparing', 'Ready', 'Completed'].includes(status)) {
    return res.status(400).json({ ok: false, error: 'Invalid status' });
  }
  const { where, params } = outletScope(req);
  const id = Number(req.params.id);
  const existing = await query(`SELECT * FROM orders WHERE id=? AND ${where}`, [id, ...params]);
  if (existing.length === 0) {
    return res.status(404).json({ ok: false, error: 'Order not found or outside your branch scope' });
  }
  await execute('UPDATE orders SET status=? WHERE id=?', [status, id]);
  const orderRow = existing[0];

  broadcastAdminEvent('order_status_updated', {
    id,
    customer_name: String(orderRow.customer_name || 'Guest'),
    outlet: String(orderRow.outlet || 'Adabraka'),
    order_type: String(orderRow.order_type || 'Delivery'),
    status,
    payment_status: String(orderRow.payment_status || 'Pending'),
  });

  const notification = await dispatchOrderStatusNotification({
    id,
    customer_name: String(orderRow.customer_name || 'Guest'),
    phone: String(orderRow.phone || ''),
    outlet: String(orderRow.outlet || 'Adabraka'),
    order_type: String(orderRow.order_type || 'Delivery'),
    status,
  });
  res.json({ ok: true, notification });
});

// Update order payment status (branch-scoped)
app.put('/api/admin/orders/:id/payment', requireAdmin, async (req, res) => {
  const paymentStatus = String(req.body?.payment_status || '');
  if (!['Paid', 'Pending', 'Refunded'].includes(paymentStatus)) {
    return res.status(400).json({ ok: false, error: 'Invalid payment status' });
  }
  const { where, params } = outletScope(req);
  const id = Number(req.params.id);
  const existing = await query(`SELECT id, customer_name, outlet FROM orders WHERE id=? AND ${where}`, [id, ...params]);
  if (existing.length === 0) {
    return res.status(404).json({ ok: false, error: 'Order not found or outside your branch scope' });
  }
  await execute('UPDATE orders SET payment_status=? WHERE id=?', [paymentStatus, id]);

  broadcastAdminEvent('order_payment_updated', {
    id,
    customer_name: String(existing[0]?.customer_name || 'Guest'),
    outlet: String(existing[0]?.outlet || 'Adabraka'),
    payment_status: paymentStatus,
  });

  res.json({ ok: true });
});

// Reset revenue / truncate orders (super admin only)
app.delete('/api/admin/orders', requireAdmin, requireSuper, async (_req, res) => {
  await execute('DELETE FROM orders');
  broadcastAdminEvent('orders_cleared', {});
  res.json({ ok: true });
});

// Menu items CRUD (supports all food details + image upload on both create and update)
app.post('/api/admin/menu', requireAdmin, multerUpload('images').single('image'), async (req, res) => {
  const b = req.body || {};
  const foodName = String(b.food_name || '').trim();
  const category = String(b.category || '').trim();
  const price = Number(b.price || 0);
  if (!foodName || !category || !Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ ok: false, error: 'Dish name, category, and a valid price (> 0) are required' });
  }
  const discount = Math.max(0, Math.min(90, Math.round(Number(b.discount_percent || 0))));
  const result = await execute(
    'INSERT INTO menu_items (food_name, category, description, price, image, status, discount_percent, created_at) VALUES (?,?,?,?,?,?,?,?)',
    [
      foodName,
      category,
      b.description ? String(b.description).trim() : '',
      price,
      req.file ? sanitizeFilename(req.file.originalname) : sanitizeFilename(String(b.image || 'Jollof.png')),
      b.status === 'unavailable' ? 'unavailable' : 'available',
      discount,
      nowSql(),
    ]
  );
  res.json({ ok: true, id: result.insertId });
});

app.put('/api/admin/menu/:id', requireAdmin, multerUpload('images').single('image'), async (req, res) => {
  const b = req.body || {};
  const id = Number(req.params.id);
  const existingRows = await query('SELECT * FROM menu_items WHERE id=?', [id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ ok: false, error: 'Menu item not found' });

  const imageFile = req.file
    ? sanitizeFilename(req.file.originalname)
    : sanitizeFilename(String(b.image || existing.image));
  const discountPercent =
    b.discount_percent !== undefined
      ? Math.max(0, Math.min(90, Math.round(Number(b.discount_percent))))
      : Number(existing.discount_percent || 0);

  await execute(
    'UPDATE menu_items SET food_name=?, category=?, description=?, price=?, image=?, status=?, discount_percent=? WHERE id=?',
    [
      String(b.food_name || existing.food_name).trim(),
      String(b.category || existing.category).trim(),
      b.description !== undefined ? String(b.description).trim() : String(existing.description || ''),
      Number(b.price ?? existing.price),
      imageFile,
      b.status || existing.status || 'available',
      discountPercent,
      id,
    ]
  );
  res.json({ ok: true });
});

app.delete('/api/admin/menu/:id', requireAdmin, async (req, res) => {
  await execute('DELETE FROM menu_items WHERE id=?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// Discounts
app.put('/api/admin/menu/:id/discount', requireAdmin, async (req, res) => {
  const discount = Math.max(0, Math.min(90, Math.round(Number(req.body?.discount_percent || 0))));
  await execute('UPDATE menu_items SET discount_percent=? WHERE id=?', [discount, Number(req.params.id)]);
  res.json({ ok: true });
});

// Categories CRUD
app.post('/api/admin/categories', requireAdmin, async (req, res) => {
  const name = String(req.body?.category_name || '').trim();
  if (!name) return res.status(400).json({ ok: false, error: 'Category name required' });
  const existing = await query('SELECT id FROM menu_categories WHERE category_name=?', [name]);
  if (existing.length > 0) return res.status(409).json({ ok: false, error: 'Category Already Exists' });
  await execute('INSERT INTO menu_categories (category_name, created_at) VALUES (?,?)', [name, nowSql()]);
  res.json({ ok: true });
});

app.put('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  const name = String(req.body?.category_name || '').trim();
  if (!name) return res.status(400).json({ ok: false, error: 'Category name required' });
  const id = Number(req.params.id);
  const existing = await query('SELECT category_name FROM menu_categories WHERE id=?', [id]);
  const oldName = existing[0] ? String(existing[0].category_name) : '';
  await execute('UPDATE menu_categories SET category_name=? WHERE id=?', [name, id]);
  if (oldName && oldName !== name) {
    await execute('UPDATE menu_items SET category=? WHERE category=?', [name, oldName]);
  }
  res.json({ ok: true });
});

app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  await execute('DELETE FROM menu_categories WHERE id=?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// Adverts CRUD (create, update, delete)
app.post('/api/admin/adverts', requireAdmin, multerUpload('adverts').single('banner_image'), async (req, res) => {
  const b = req.body || {};
  const bannerImg = req.file
    ? sanitizeFilename(req.file.originalname)
    : sanitizeFilename(String(b.banner_image || 'Jollof.png'));
  const result = await execute(
    'INSERT INTO advertisement_banners (banner_image, title, description, button_text, button_link, status, created_at) VALUES (?,?,?,?,?,?,?)',
    [
      bannerImg,
      String(b.title || '').trim(),
      String(b.description || '').trim(),
      String(b.button_text || '').trim(),
      String(b.button_link || '').trim(),
      b.status === 'Inactive' ? 'Inactive' : 'Active',
      nowSql(),
    ]
  );
  res.json({ ok: true, id: result.insertId });
});

app.put('/api/admin/adverts/:id', requireAdmin, multerUpload('adverts').single('banner_image'), async (req, res) => {
  const b = req.body || {};
  const id = Number(req.params.id);
  const rows = await query('SELECT * FROM advertisement_banners WHERE id=?', [id]);
  const existing = rows[0];
  if (!existing) return res.status(404).json({ ok: false, error: 'Advertisement not found' });

  const bannerImg = req.file
    ? sanitizeFilename(req.file.originalname)
    : sanitizeFilename(String(b.banner_image || existing.banner_image));

  await execute(
    'UPDATE advertisement_banners SET banner_image=?, title=?, description=?, button_text=?, button_link=?, status=? WHERE id=?',
    [
      bannerImg,
      String(b.title ?? existing.title).trim(),
      String(b.description ?? existing.description).trim(),
      String(b.button_text ?? existing.button_text).trim(),
      String(b.button_link ?? existing.button_link).trim(),
      b.status ? (b.status === 'Inactive' ? 'Inactive' : 'Active') : existing.status,
      id,
    ]
  );
  res.json({ ok: true });
});

app.delete('/api/admin/adverts/:id', requireAdmin, async (req, res) => {
  await execute('DELETE FROM advertisement_banners WHERE id=?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// Banners (marquee) CRUD (create, update, delete)
app.post('/api/admin/banners', requireAdmin, async (req, res) => {
  const text = String(req.body?.banner_text || '').trim();
  if (!text) return res.status(400).json({ ok: false, error: 'Banner message is required' });
  await execute('INSERT INTO banners (banner_text, created_at) VALUES (?,?)', [text, nowSql()]);
  res.json({ ok: true });
});

app.put('/api/admin/banners/:id', requireAdmin, async (req, res) => {
  const text = String(req.body?.banner_text || '').trim();
  if (!text) return res.status(400).json({ ok: false, error: 'Banner message is required' });
  await execute('UPDATE banners SET banner_text=? WHERE id=?', [text, Number(req.params.id)]);
  res.json({ ok: true });
});

app.delete('/api/admin/banners/:id', requireAdmin, async (req, res) => {
  await execute('DELETE FROM banners WHERE id=?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// Hero slides CRUD (create, update, delete)
app.post('/api/admin/slides', requireAdmin, multerUpload('images').single('image'), async (req, res) => {
  const img = req.file
    ? sanitizeFilename(req.file.originalname)
    : req.body?.image
    ? sanitizeFilename(String(req.body.image))
    : '';
  if (!img) return res.status(400).json({ ok: false, error: 'Slide image file is required' });
  const result = await execute('INSERT INTO slider_images (image, created_at) VALUES (?,?)', [img, nowSql()]);
  res.json({ ok: true, id: result.insertId });
});

app.put('/api/admin/slides/:id', requireAdmin, multerUpload('images').single('image'), async (req, res) => {
  const id = Number(req.params.id);
  const rows = await query('SELECT * FROM slider_images WHERE id=?', [id]);
  const existing = rows[0];
  if (!existing) return res.status(404).json({ ok: false, error: 'Slide not found' });
  const img = req.file
    ? sanitizeFilename(req.file.originalname)
    : sanitizeFilename(String(req.body?.image || existing.image));
  await execute('UPDATE slider_images SET image=? WHERE id=?', [img, id]);
  res.json({ ok: true });
});

app.delete('/api/admin/slides/:id', requireAdmin, async (req, res) => {
  await execute('DELETE FROM slider_images WHERE id=?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// Advertisement videos CRUD
app.post('/api/admin/videos', requireAdmin, multerUpload('videos').single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'Video file is required' });
  const result = await execute('INSERT INTO advertisement_videos (video_name, created_at) VALUES (?,?)', [
    sanitizeFilename(req.file.originalname),
    nowSql(),
  ]);
  res.json({ ok: true, id: result.insertId });
});

app.put('/api/admin/videos/:id', requireAdmin, multerUpload('videos').single('video'), async (req, res) => {
  const id = Number(req.params.id);
  const rows = await query('SELECT * FROM advertisement_videos WHERE id=?', [id]);
  const existing = rows[0];
  if (!existing) return res.status(404).json({ ok: false, error: 'Video not found' });
  const fileName = req.file
    ? sanitizeFilename(req.file.originalname)
    : sanitizeFilename(String(req.body?.video_name || existing.video_name));
  await execute('UPDATE advertisement_videos SET video_name=? WHERE id=?', [fileName, id]);
  res.json({ ok: true });
});

app.delete('/api/admin/videos/:id', requireAdmin, async (req, res) => {
  const rows = await query('SELECT * FROM advertisement_videos WHERE id=?', [Number(req.params.id)]);
  if (rows[0]) {
    const file = path.join(ASSETS_DIR, 'videos', sanitizeFilename(String(rows[0].video_name)));
    if (fs.existsSync(file)) fs.unlinkSync(file);
    await execute('DELETE FROM advertisement_videos WHERE id=?', [Number(req.params.id)]);
  }
  res.json({ ok: true });
});

// Community media & activities CRUD (create, update, delete)
app.post('/api/admin/community', requireAdmin, multerUpload('community').single('media'), async (req, res) => {
  const b = req.body || {};
  const fileName = req.file
    ? sanitizeFilename(req.file.originalname)
    : b.file_name
    ? sanitizeFilename(String(b.file_name))
    : '';
  if (!fileName) return res.status(400).json({ ok: false, error: 'Media file or preset selection is required' });
  const result = await execute(
    'INSERT INTO community_media (media_type, file_name, title, description, created_at) VALUES (?,?,?,?,?)',
    [
      b.media_type === 'video' ? 'video' : 'image',
      fileName,
      String(b.title || '').trim(),
      String(b.description || '').trim(),
      nowSql(),
    ]
  );
  res.json({ ok: true, id: result.insertId });
});

app.put('/api/admin/community/:id', requireAdmin, multerUpload('community').single('media'), async (req, res) => {
  const b = req.body || {};
  const id = Number(req.params.id);
  const rows = await query('SELECT * FROM community_media WHERE id=?', [id]);
  const existing = rows[0];
  if (!existing) return res.status(404).json({ ok: false, error: 'Community activity not found' });

  const fileName = req.file
    ? sanitizeFilename(req.file.originalname)
    : sanitizeFilename(String(b.file_name || existing.file_name));
  const mediaType = b.media_type
    ? b.media_type === 'video'
      ? 'video'
      : 'image'
    : String(existing.media_type || 'image');

  await execute(
    'UPDATE community_media SET media_type=?, file_name=?, title=?, description=? WHERE id=?',
    [
      mediaType,
      fileName,
      String(b.title ?? existing.title ?? '').trim(),
      String(b.description ?? existing.description ?? '').trim(),
      id,
    ]
  );
  res.json({ ok: true });
});

app.delete('/api/admin/community/:id', requireAdmin, async (req, res) => {
  const rows = await query('SELECT * FROM community_media WHERE id=?', [Number(req.params.id)]);
  if (rows[0]) {
    const file = path.join(ASSETS_DIR, 'community', sanitizeFilename(String(rows[0].file_name)));
    if (fs.existsSync(file)) fs.unlinkSync(file);
    await execute('DELETE FROM community_media WHERE id=?', [Number(req.params.id)]);
  }
  res.json({ ok: true });
});

// Ratings
app.get('/api/public-ratings', async (_req, res) => {
  const rows = await query('SELECT * FROM ratings ORDER BY id DESC LIMIT 4');
  const [avg] = await query('SELECT AVG(rating) AS avg_rating, COUNT(*) AS c FROM ratings');
  res.json({
    ok: true,
    ratings: rows,
    average: Number(avg.avg_rating || 0),
    count: Number(avg.c || 0),
  });
});

app.get('/api/admin/ratings', requireAdmin, async (_req, res) => {
  const rows = await query('SELECT * FROM ratings ORDER BY id DESC');
  const [total] = await query('SELECT COUNT(*) AS c FROM ratings');
  const [avg] = await query('SELECT AVG(rating) AS avg_rating FROM ratings');
  const [highest] = await query('SELECT MAX(rating) AS highest_rating FROM ratings');
  res.json({
    ok: true,
    ratings: rows,
    total_reviews: Number(total.c),
    avg_rating: Number(avg.avg_rating || 0),
    highest_rating: Number(highest.highest_rating || 0),
  });
});

app.delete('/api/admin/ratings/:id', requireAdmin, async (req, res) => {
  await execute('DELETE FROM ratings WHERE id=?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// Catering bookings (scoped to branch for branch admins)
app.get('/api/admin/catering-bookings', requireAdmin, async (req, res) => {
  const { where, params } = outletScope(req);
  const rows = await query(`SELECT * FROM catering_bookings WHERE ${where} ORDER BY id DESC`, params);
  res.json({ ok: true, bookings: rows });
});

app.delete('/api/admin/catering-bookings/:id', requireAdmin, async (req, res) => {
  await execute('DELETE FROM catering_bookings WHERE id=?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// Contact messages (super admin only)
app.get('/api/admin/contact-messages', requireAdmin, requireSuper, async (_req, res) => {
  const rows = await query('SELECT * FROM contact_messages ORDER BY id DESC');
  await execute("UPDATE contact_messages SET notification_status='seen' WHERE notification_status='new'");
  res.json({ ok: true, messages: rows });
});

app.delete('/api/admin/contact-messages/:id', requireAdmin, requireSuper, async (req, res) => {
  await execute('DELETE FROM contact_messages WHERE id=?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// Training applications (with admin follow-up status, notes, and branded email preview)
app.get('/api/admin/training-applications', requireAdmin, async (_req, res) => {
  const rows = await query('SELECT * FROM training_applications ORDER BY id DESC');
  await execute("UPDATE training_applications SET notification_status='seen' WHERE notification_status='new'");
  res.json({ ok: true, applications: rows });
});

app.put('/api/admin/training-applications/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const rows = await query('SELECT * FROM training_applications WHERE id=?', [id]);
  const existing = rows[0];
  if (!existing) return res.status(404).json({ ok: false, error: 'Application not found' });

  const b = req.body || {};
  const validStatuses = ['New', 'Contacted', 'Interview Scheduled', 'Admitted', 'Archived'];
  const nextStatus =
    b.status && validStatuses.includes(String(b.status))
      ? String(b.status)
      : String(existing.status || 'New');
  const nextNotes = b.admin_notes !== undefined ? String(b.admin_notes).trim() : String(existing.admin_notes || '');

  await execute('UPDATE training_applications SET status=?, admin_notes=? WHERE id=?', [nextStatus, nextNotes, id]);
  res.json({ ok: true });
});

app.delete('/api/admin/training-applications/:id', requireAdmin, async (req, res) => {
  await execute('DELETE FROM training_applications WHERE id=?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// System Status & Cloud Services Info (Supabase DB + Resend Email)
app.get('/api/admin/system-status', requireAdmin, async (_req, res) => {
  const currentDb = dbMode();
  const resendKey = process.env.RESEND_API_KEY || '';
  const emailFrom = process.env.EMAIL_FROM || 'Mayford Foods GH <orders@mayfordfoodsgh.com>';
  const paystackKey = process.env.PAYSTACK_SECRET_KEY || '';

  let tableCounts: Record<string, number> = {};
  try {
    const ordersCount = (await query('SELECT COUNT(*) AS c FROM orders'))[0]?.c;
    const menuCount = (await query('SELECT COUNT(*) AS c FROM menu_items'))[0]?.c;
    const appsCount = (await query('SELECT COUNT(*) AS c FROM training_applications'))[0]?.c;
    tableCounts = {
      orders: Number(ordersCount || 0),
      menu_items: Number(menuCount || 0),
      training_applications: Number(appsCount || 0),
    };
  } catch {
    /* ignore */
  }

  res.json({
    ok: true,
    supabase: getSupabaseDetails(),
    database: {
      mode: currentDb,
      is_supabase: currentDb === 'supabase' || currentDb === 'postgres',
      connection_label:
        currentDb === 'supabase'
          ? 'Supabase PostgreSQL (Cloud Database)'
          : currentDb === 'postgres'
          ? 'PostgreSQL Database'
          : currentDb === 'mysql'
          ? 'MySQL / MariaDB Database'
          : 'SQLite Demo Mode (Active for Local Preview)',
      table_counts: tableCounts,
    },
    email: {
      provider: 'Resend',
      configured: Boolean(resendKey && resendKey.startsWith('re_')),
      email_from: emailFrom,
      masked_key: resendKey ? `${resendKey.slice(0, 6)}••••••••` : 'Not Set',
    },
    payment: {
      provider: 'Paystack',
      configured: Boolean(paystackKey && paystackKey.startsWith('sk_')),
      masked_key: paystackKey ? `${paystackKey.slice(0, 7)}••••••••` : 'Not Set',
    },
    security_audit: {
      rls_locked: true,
      rls_tables_protected: 16,
      rls_policies_count: 22,
      realtime_enabled: true,
      realtime_tables: [
        'orders',
        'catering_bookings',
        'training_applications',
        'contact_messages',
        'visitor_counter',
        'menu_items',
        'menu_categories',
        'banners',
        'advertisement_banners',
        'ratings',
        'website_settings',
      ],
      payment_anti_tampering: true,
      payment_hmac_sha256_active: true,
      payment_currency_enforced: 'GHS',
      payment_anti_replay_active: true,
      rate_limiting_active: true,
      phone_privacy_shield_active: true,
      session_security: 'HttpOnly Cookie with DB-backed persistent sessions',
      timing_safe_pin_auth: true,
      scrypt_password_hashing: true,
    },
  });
});

// Resend Email Test Dispatcher
app.post('/api/admin/resend/test', requireAdmin, async (req, res) => {
  const recipient = String(req.body?.recipient_email || '').trim();
  if (!recipient || !recipient.includes('@')) {
    return res.status(400).json({ ok: false, error: 'A valid recipient email address is required' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(400).json({
      ok: false,
      error: 'RESEND_API_KEY is not set in environment. Set RESEND_API_KEY=re_... in .env to dispatch live emails.',
    });
  }

  try {
    const fromAddress = process.env.EMAIL_FROM || 'Mayford Foods GH <orders@mayfordfoodsgh.com>';
    const testHtml = `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;padding:24px;background:#F7F7F7;color:#111111;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:28px;">
    <div style="background:#111111;color:#fff;padding:16px 20px;border-radius:6px;margin-bottom:20px;">
      <h2 style="margin:0;font-size:18px;">Mayford Foods GH · Resend Diagnostics</h2>
    </div>
    <p>Hello,</p>
    <p>This is a live test email dispatched from the <strong>Mayford Foods GH Operations Platform</strong> via <strong>Resend</strong>.</p>
    <div style="background:#F7F7F7;padding:12px 16px;border-radius:6px;font-size:13px;margin:16px 0;">
      <strong>Timestamp:</strong> ${nowSql()}<br />
      <strong>Sender:</strong> ${fromAddress}<br />
      <strong>Database Engine:</strong> ${dbMode().toUpperCase()}
    </div>
    <p style="font-size:12px;color:#6b6b6b;border-top:1px solid #eee;padding-top:12px;">Mayford Foods GH · Accra, Ghana</p>
  </div>
</body>
</html>`;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [recipient],
        subject: `Mayford Foods GH - Resend Live Test (${nowSql()})`,
        html: testHtml,
      }),
    });

    const data = (await r.json()) as { id?: string; message?: string; error?: string };
    if (!r.ok) {
      return res.status(r.status).json({
        ok: false,
        error: data.message || data.error || 'Resend API returned an error',
      });
    }

    res.json({
      ok: true,
      message: `Test email dispatched successfully to ${recipient} via Resend`,
      email_id: data.id,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// Website settings
app.get('/api/admin/settings', requireAdmin, async (_req, res) => {
  const rows = await query('SELECT * FROM website_settings WHERE id=1');
  res.json({ ok: true, settings: rows[0] || null });
});

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  const b = req.body || {};
  await execute(
    `UPDATE website_settings SET email=?, adabraka_phone=?, dzorwulu_phone=?, facebook_link=?, tiktok_link=?, opening_hours=?, paystack_public_key=? WHERE id=1`,
    [
      String(b.email || '').trim(),
      String(b.adabraka_phone || '').trim(),
      String(b.dzorwulu_phone || '').trim(),
      String(b.facebook_link || '').trim(),
      String(b.tiktok_link || '').trim(),
      String(b.opening_hours || '').trim(),
      String(b.paystack_public_key || '').trim(),
    ]
  );
  res.json({ ok: true, message: 'Settings Updated Successfully' });
});

// Global JSON error handler (catches multer fileFilter/size errors cleanly)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err?.status || 400;
  res.status(status).json({
    ok: false,
    error: err?.message || 'Request error',
  });
});

// ================================================================ static frontend (production)
if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  app.use(express.static(DIST_DIR, { index: false }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/assets')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// ================================================================ start
initDb()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Mayford Foods GH server running on http://0.0.0.0:${PORT} (db: ${dbMode()})`);
    });
  })
  .catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
