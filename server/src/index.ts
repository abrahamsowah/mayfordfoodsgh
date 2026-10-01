/**
 * Mayford Foods GH — API server (v2)
 *
 * Express + TypeScript, MySQL with an automatic SQLite demo fallback.
 * Hardened: helmet, CORS allowlist, CSRF origin check, rate limiting,
 * scrypt passwords, database-backed sessions, audit logging — and Paystack
 * payments with HMAC-verified webhooks.
 */
import path from 'path';
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config(); // also honour server/.env
import crypto from 'crypto';
import fs from 'fs';
import express, { type NextFunction, type Request, type Response } from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import multer from 'multer';

import { initDb, query, execute, queryOne, nowSql, dbMode } from './db';
import { DIST_DIR, ASSETS_DIR, PUBLIC_DIR, DATA_DIR } from './paths';
import { DbSessionStore } from './session-store';
import {
  HttpError,
  LOCKOUT_MAX_FAILURES,
  allowedOrigins,
  clean,
  clearFailures,
  clientIp,
  csrfGuard,
  hashPassword,
  hashIp,
  isHashed,
  optionalPhone,
  rateLimit,
  recentFailures,
  requireEmail,
  requireInt,
  requireText,
  rotateSession,
  timingSafeStringEqual,
  verifyPassword,
} from './security';
import { recordAudit, recordSystemEvent } from './audit';
import { createOrder, markOrderPaid, publicTrackUrl } from './orders';
import {
  initialiseTransaction,
  paystackEnabled,
  paystackStatus,
  upsertPaymentRecord,
  verifyTransaction,
  verifyWebhookSignature,
} from './payments';
import { brandWrap, sendMail, settings as storeSettings } from './notify';
import { adminRouter } from './admin-routes';
import { customerRouter, trackingRouter } from './customer-routes';
import { loadStoreConfig } from './catalog';

const PORT = Number(process.env.PORT || 4000);
const IS_PROD = process.env.NODE_ENV === 'production';

declare module 'express-session' {
  interface SessionData {
    admin_access?: boolean;
    admin_id?: number;
    admin_name?: string;
    role?: string;
  }
}

/* ==================================================================
   Session secret — persisted so logins survive restarts
================================================================== */
function sessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) return process.env.SESSION_SECRET;
  if (process.env.SESSION_SECRET) console.warn('[security] SESSION_SECRET is shorter than 32 characters — consider lengthening it.');
  const file = path.join(DATA_DIR, '.session-secret');
  try {
    if (fs.existsSync(file)) {
      const saved = fs.readFileSync(file, 'utf8').trim();
      if (saved.length >= 32) return saved;
    }
  } catch {
    /* fall through */
  }
  const secret = crypto.randomBytes(48).toString('hex');
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, secret, { mode: 0o600 });
    console.warn(`[security] SESSION_SECRET not set — generated one at ${file} (set SESSION_SECRET in production).`);
  } catch {
    console.warn('[security] SESSION_SECRET not set — using an in-memory value; sessions will reset on restart.');
  }
  return secret;
}

/* ==================================================================
   App + middleware
================================================================== */
const app = express();
app.disable('x-powered-by');
// Behind a reverse proxy / load balancer: trust the first hop so secure
// cookies and real client IPs work.
app.set('trust proxy', 1);

/* ---------- 1. Paystack webhook (raw body, before any JSON parser) ---------- */
app.post('/api/payments/webhook/paystack', express.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body || ''));
  const signature = req.headers['x-paystack-signature'];
  if (!verifyWebhookSignature(raw, signature)) {
    console.warn('[paystack] webhook rejected: invalid signature');
    return res.status(401).json({ ok: false, error: 'Invalid signature' });
  }
  // Acknowledge immediately — Paystack retries anything that is not a 2xx.
  res.status(200).json({ ok: true });
  let event: any = null;
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    return;
  }
  void handlePaystackEvent(event).catch((err) => console.error('[paystack] webhook handling failed:', err));
});

/* ---------- 2. Security headers ---------- */
app.use(
  helmet({
    contentSecurityPolicy: IS_PROD
      ? {
          useDefaults: false,
          directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'"],
            'style-src': ["'self'", "'unsafe-inline'"],
            'img-src': ["'self'", 'data:', 'blob:'],
            'media-src': ["'self'", 'data:', 'blob:'],
            'font-src': ["'self'", 'data:'],
            'connect-src': ["'self'"],
            'frame-ancestors': IS_PROD ? ["'self'"] : ['*'],
            'base-uri': ["'self'"],
            'form-action': ["'self'"],
          },
        }
      : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    hsts: IS_PROD ? { maxAge: 15_552_000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

/* ---------- 3. CORS (allowlist + credentials) ---------- */
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const host = req.headers.host;
  const isSameHost = Boolean(origin && host && (origin === `http://${host}` || origin === `https://${host}`));
  const isDevPreview = !IS_PROD && Boolean(origin && /^https?:\/\/[^/]+\.(e2b\.app|arena\.ai)$/i.test(origin));
  const allowed = !origin || isSameHost || isDevPreview || allowedOrigins().includes(origin);

  if (origin && allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    if (!allowed) return res.status(403).json({ ok: false, error: 'Origin not allowed' });
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '600');
    return res.sendStatus(204);
  }
  if (!allowed) return res.status(403).json({ ok: false, error: 'Request blocked: origin not allowed.' });
  next();
});

/* ---------- 4. Body parsers ---------- */
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: false, limit: '512kb' }));
app.use(cookieParser());

/* ---------- 5. CSRF: reject cross-origin state changing calls ---------- */
app.use(csrfGuard);

/* ---------- 6. Sessions (database-backed) ---------- */
app.use(
  session({
    name: 'mayford_sid',
    store: new DbSessionStore(),
    secret: sessionSecret(),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: 'auto',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    },
  })
);

/* ---------- 7. Static media ---------- */
app.use(
  '/assets',
  express.static(ASSETS_DIR, {
    maxAge: '7d',
    index: false,
    dotfiles: 'deny',
    setHeaders: (res, filePath) => {
      if (!IS_PROD) res.setHeader('Cache-Control', 'no-cache');
      if (/\.(mp4|webm|mov|m4v)$/i.test(filePath)) res.setHeader('Accept-Ranges', 'bytes');
    },
  })
);

/* ---------- 8. Baseline API rate limit ---------- */
app.use('/api', rateLimit({ windowMs: 15 * 60_000, max: 900, keyPrefix: 'api', message: 'Too many requests from this device. Please wait a moment.' }));

/* ---------- helpers ---------- */
function safe(fn: (req: Request, res: Response) => Promise<any>) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      const message = err instanceof HttpError ? err.message : 'Something went wrong. Please try again.';
      if (status >= 500) console.error('[api]', req.method, req.originalUrl, err);
      if (res.headersSent) return;
      res.status(status).json({ ok: false, error: message });
    }
  };
}

const logAttempt = (scope: string, identifier: string, req: Request, success: boolean) =>
  execute('INSERT INTO login_attempts (scope, identifier, ip, success, created_at) VALUES (?,?,?,?,?)', [
    scope,
    identifier.slice(0, 190),
    clientIp(req),
    success ? 1 : 0,
    nowSql(),
  ]).catch(() => undefined);

/* ==================================================================
   HEALTH
================================================================== */
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    db: dbMode(),
    service: 'mayford-foods-gh-api',
    version: '2.0.0',
    time: nowSql(),
    uptime_seconds: Math.round(process.uptime()),
  });
});

/* ==================================================================
   AUTH — admin
================================================================== */
const pinLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, keyPrefix: 'pin', message: 'Too many PIN attempts. Please wait 15 minutes.' });
const loginLimiter = rateLimit({ windowMs: 15 * 60_000, max: 12, keyPrefix: 'alogin', message: 'Too many sign-in attempts. Please wait a few minutes.' });

app.post(
  '/api/auth/admin-pin',
  pinLimiter,
  safe(async (req, res) => {
    const pin = clean(req.body?.pin, 60);
    const expected = String(process.env.ADMIN_PIN || 'mayford2026');
    const ok = timingSafeStringEqual(pin, expected);
    await logAttempt('admin_pin', clientIp(req), req, ok);
    if (!ok) throw new HttpError(401, 'Invalid PIN');
    // Fresh session id once the gate is passed (session fixation defence).
    await rotateSession(req);
    req.session.admin_access = true;
    if (!process.env.ADMIN_PIN) console.warn('[security] Using the default admin PIN. Set ADMIN_PIN in the environment.');
    res.json({ ok: true });
  })
);

app.post(
  '/api/auth/login',
  loginLimiter,
  safe(async (req, res) => {
    if (!req.session?.admin_access) throw new HttpError(403, 'Admin PIN required', 'NEED_PIN');
    const username = clean(req.body?.username, 60).toLowerCase();
    const password = String(req.body?.password || '');
    if (!username || !password) throw new HttpError(400, 'Enter your username and password.');
    if ((await recentFailures('admin_login', username)) >= LOCKOUT_MAX_FAILURES) {
      throw new HttpError(429, 'Too many failed sign-in attempts for this account. Please try again in a few minutes.');
    }
    const admin = await queryOne('SELECT * FROM admins WHERE LOWER(username) = ?', [username]);
    // verifyPassword runs a real hash round even for unknown usernames, so a
    // missing account cannot be told apart from a wrong password by timing.
    const ok = verifyPassword(admin ? String(admin.password) : null, password);
    await logAttempt('admin_login', username, req, ok && !!admin);
    if (!admin || !ok) throw new HttpError(401, 'Invalid Username or Password');
    await clearFailures('admin_login', username);

    // Upgrade legacy plaintext passwords the first time someone signs in.
    if (!isHashed(String(admin.password))) {
      await execute('UPDATE admins SET password = ? WHERE id = ?', [hashPassword(password), Number(admin.id)]);
    }

    await rotateSession(req);
    req.session.admin_id = Number(admin.id);
    req.session.admin_name = String(admin.admin_name);
    req.session.role = String(admin.role);
    req.session.admin_access = true;
    await recordAudit(req, { action: 'admin.login', entity: 'admin', entityId: admin.id });
    res.json({ ok: true, admin: { id: Number(admin.id), name: admin.admin_name, role: admin.role } });
  })
);

app.post(
  '/api/auth/logout',
  safe(async (req, res) => {
    if (req.session?.admin_id) await recordAudit(req, { action: 'admin.logout', entity: 'admin', entityId: req.session.admin_id });
    req.session.destroy(() => res.json({ ok: true }));
  })
);

app.get('/api/auth/session', (req, res) => {
  res.json({
    ok: true,
    admin_access: !!req.session?.admin_access,
    admin: req.session?.admin_id ? { id: req.session.admin_id, name: req.session.admin_name, role: req.session.role } : null,
    customer: req.session?.customer_id
      ? { id: req.session.customer_id, name: req.session.customer_name, email: req.session.customer_email }
      : null,
  });
});

/* ==================================================================
   PUBLIC — settings, content, menu
================================================================== */
app.get(
  '/api/settings',
  safe(async (_req, res) => {
    const row = await queryOne('SELECT * FROM website_settings LIMIT 1');
    const config = await loadStoreConfig();
    res.json({
      ok: true,
      settings: row || null,
      store: {
        currency: 'GHS',
        delivery_fee: config.deliveryFee,
        free_delivery_over: config.freeDeliveryOver,
        paystack_enabled: config.paystackEnabled && paystackEnabled(),
      },
    });
  })
);

app.get('/api/banners', safe(async (_req, res) => res.json({ ok: true, banners: await query('SELECT * FROM banners ORDER BY id DESC') })));
app.get('/api/slides', safe(async (_req, res) => res.json({ ok: true, slides: await query('SELECT * FROM slider_images ORDER BY id DESC') })));

app.get(
  '/api/adverts',
  safe(async (req, res) => {
    const all = req.query.all === '1';
    const rows = all
      ? await query('SELECT * FROM advertisement_banners ORDER BY id DESC')
      : await query("SELECT * FROM advertisement_banners WHERE status = 'Active' ORDER BY id DESC");
    res.json({ ok: true, adverts: rows });
  })
);

app.get('/api/advertisement-videos', safe(async (_req, res) => res.json({ ok: true, videos: await query('SELECT * FROM advertisement_videos ORDER BY id DESC') })));
app.get('/api/community-media', safe(async (_req, res) => res.json({ ok: true, media: await query('SELECT * FROM community_media ORDER BY id DESC') })));

app.get(
  '/api/menu',
  safe(async (req, res) => {
    const all = req.query.all === '1' && Boolean(req.session?.admin_id);
    const rows = all
      ? await query('SELECT * FROM menu_items ORDER BY id DESC')
      : await query("SELECT * FROM menu_items WHERE status = 'available' ORDER BY id DESC");
    res.json({ ok: true, items: rows });
  })
);

app.get(
  '/api/menu/:id',
  safe(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(404, 'Food item not found');
    const rows = await query('SELECT * FROM menu_items WHERE id = ?', [id]);
    const item = rows[0];
    // Dishes pulled from the menu stay invisible to the public — staff still see them.
    if (!item || (String(item.status) !== 'available' && !req.session?.admin_id)) {
      throw new HttpError(404, 'Food item not found');
    }
    res.json({ ok: true, item });
  })
);

app.get(
  '/api/categories',
  safe(async (req, res) => {
    const order = req.query.order === 'name' ? 'category_name' : 'id DESC';
    res.json({ ok: true, categories: await query(`SELECT * FROM menu_categories ORDER BY ${order}`) });
  })
);

app.get(
  '/api/public-ratings',
  safe(async (_req, res) => {
    const rows = await query('SELECT * FROM ratings ORDER BY id DESC LIMIT 6');
    const avg = await queryOne('SELECT AVG(rating) AS avg_rating, COUNT(*) AS c FROM ratings');
    res.json({ ok: true, ratings: rows, average: Number(avg?.avg_rating || 0), count: Number(avg?.c || 0) });
  })
);

/* ==================================================================
   PUBLIC — visitor counter + traffic analytics
================================================================== */
function deviceFrom(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return 'tablet';
  if (/mobi|android|iphone|ipod|windows phone/.test(ua)) return 'mobile';
  return 'desktop';
}

function sourceFrom(referrer: string): string {
  if (!referrer) return 'direct';
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    if (/google|bing|duckduckgo|yahoo|ecosia/.test(host)) return `search:${host}`;
    if (/facebook|instagram|tiktok|twitter|x\.com|whatsapp|linkedin|youtube/.test(host)) return `social:${host}`;
    return host;
  } catch {
    return 'unknown';
  }
}

app.post(
  '/api/visits',
  rateLimit({ windowMs: 60_000, max: 60, keyPrefix: 'visit', message: 'Too many requests.' }),
  safe(async (req, res) => {
    const pathName = clean(req.body?.path, 190) || '/';
    const referrer = clean(req.body?.referrer, 400);
    const ua = String(req.headers['user-agent'] || '');
    const ip = clientIp(req);
    // One "visitor" per browser per day, tracked with a cookie; page views
    // are counted every time.
    const countedToday = req.cookies?.mayford_visitor === new Date().toISOString().slice(0, 10);
    const sessionKey = clean(req.cookies?.mayford_visitor_key, 64) || crypto.randomBytes(12).toString('hex');

    await execute(
      `INSERT INTO page_views (path, referrer, source, device, session_key, customer_id, ip_hash, created_at) VALUES (?,?,?,?,?,?,?,?)`,
      [
        pathName.slice(0, 190),
        referrer.slice(0, 400) || null,
        sourceFrom(referrer).slice(0, 60),
        deviceFrom(ua),
        sessionKey,
        req.session?.customer_id ?? null,
        hashIp(ip),
        nowSql(),
      ]
    );

    if (!countedToday) {
      await execute('UPDATE visitor_counter SET total_visitors = total_visitors + 1 WHERE id = 1');
    }
    res.cookie('mayford_visitor', new Date().toISOString().slice(0, 10), { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' });
    if (!req.cookies?.mayford_visitor_key) {
      res.cookie('mayford_visitor_key', sessionKey, { maxAge: 400 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' });
    }
    const total = await queryOne('SELECT total_visitors FROM visitor_counter WHERE id = 1');
    res.json({ ok: true, total_visitors: Number(total?.total_visitors || 0) });
  })
);

/** Legacy endpoint used by the original front-end (counts once per day). */
app.post(
  '/api/visit',
  rateLimit({ windowMs: 15 * 60_000, max: 120, keyPrefix: 'visit-old', message: 'Too many requests.' }),
  safe(async (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    if (req.cookies?.mayford_visitor !== today) {
      await execute('UPDATE visitor_counter SET total_visitors = total_visitors + 1 WHERE id = 1');
      res.cookie('mayford_visitor', today, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' });
    }
    const rows = await query('SELECT total_visitors FROM visitor_counter WHERE id = 1');
    res.json({ ok: true, total_visitors: Number(rows[0]?.total_visitors || 0) });
  })
);

app.get(
  '/api/visitor-count',
  safe(async (_req, res) => {
    const rows = await query('SELECT total_visitors FROM visitor_counter WHERE id = 1');
    res.json({ ok: true, total_visitors: Number(rows[0]?.total_visitors || 0) });
  })
);

/* ==================================================================
   PUBLIC — orders
================================================================== */
app.post(
  '/api/orders',
  rateLimit({ windowMs: 60 * 60_000, max: 40, keyPrefix: 'order', message: 'Too many orders in a short time. Please call us on WhatsApp.' }),
  safe(async (req, res) => {
    const b = req.body || {};
    const created = await createOrder({
      customer_id: req.session?.customer_id ?? null,
      customer_name: b.customer_name,
      phone: b.phone,
      email: b.email ?? req.session?.customer_email,
      outlet: b.outlet,
      order_type: b.order_type,
      address: b.address,
      order_details: b.order_details ?? b.notes,
      items: b.items,
      legacy_food_item: b.food_item,
      legacy_quantity: b.quantity,
      payment_method: b.payment_method,
    });
    const order = created.order;
    await recordAudit(req, { action: 'order.create', entity: 'order', entityId: order.id, meta: { code: order.order_code, total: Number(order.total) } });
    res.json({
      ok: true,
      id: Number(order.id),
      order_code: order.order_code,
      tracking_token: created.tracking_token,
      track_url: publicTrackUrl(created.tracking_token),
      whatsapp_url: created.whatsapp_url,
      subtotal: Number(order.subtotal || 0),
      delivery_fee: Number(order.delivery_fee || 0),
      total: Number(order.total),
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      status: order.status,
      lines: created.lines.map((l) => ({ id: l.menu_item_id, name: l.food_name, quantity: l.quantity, unit_price: l.unit_price, line_total: l.line_total })),
    });
  })
);

/* ==================================================================
   PAYMENTS — Paystack
================================================================== */
app.get(
  '/api/payments/status',
  safe(async (_req, res) => {
    const gateway = await paystackStatus();
    res.json({
      ok: true,
      provider: 'paystack',
      enabled: gateway.enabled,
      mode: gateway.mode,
      currency: 'GHS',
      public_key: gateway.enabled ? gateway.public_key : null,
      channels: ['mobile_money', 'card', 'bank_transfer'],
    });
  })
);

/** Starts a Paystack transaction for an order the customer owns (tracking token). */
app.post(
  '/api/payments/initialize',
  rateLimit({ windowMs: 15 * 60_000, max: 30, keyPrefix: 'payinit' }),
  safe(async (req, res) => {
    if (!paystackEnabled()) throw new HttpError(503, 'Online payment is not available yet. Please choose "Pay on delivery" or order on WhatsApp.');
    const token = clean(req.body?.token, 80);
    const order = await queryOne('SELECT * FROM orders WHERE tracking_token = ?', [token]);
    if (!order) throw new HttpError(404, 'We could not find that order.');
    if (String(order.payment_status) === 'paid') return res.json({ ok: true, already_paid: true });
    if (String(order.status).startsWith('Cancelled')) throw new HttpError(409, 'This order was cancelled.');

    const store = await storeSettings();
    const email =
      (order.email && String(order.email)) ||
      req.session?.customer_email ||
      `orders+${String(order.order_code || order.id).toLowerCase()}@mayfordfoodsgh.com`;
    const reference = `${order.order_code || `MF-${order.id}`}-${Date.now().toString(36).toUpperCase()}`;

    const init = await initialiseTransaction({
      email,
      amountGhs: Number(order.total),
      reference,
      orderId: Number(order.id),
      orderCode: String(order.order_code || `MF-${order.id}`),
      customerName: String(order.customer_name),
      phone: String(order.phone),
      metadata: { outlet: order.outlet, order_type: order.order_type },
    });

    await execute("UPDATE orders SET payment_method = 'paystack', payment_reference = ?, updated_at = ? WHERE id = ?", [
      init.reference,
      nowSql(),
      Number(order.id),
    ]);
    await upsertPaymentRecord({ orderId: Number(order.id), reference: init.reference, amountGhs: Number(order.total), status: 'pending', payload: init });
    await recordAudit(req, { action: 'payment.initialize', entity: 'order', entityId: order.id, meta: { reference: init.reference, amount: Number(order.total) } });
    res.json({ ok: true, reference: init.reference, authorization_url: init.authorization_url, access_code: init.access_code, public_key: paystackPublicSafe() });
  })
);

function paystackPublicSafe(): string | null {
  return paystackEnabled() ? String(process.env.PAYSTACK_PUBLIC_KEY || '') || null : null;
}

/** Verifies a payment after the customer returns from Paystack. */
app.post(
  '/api/payments/confirm',
  rateLimit({ windowMs: 15 * 60_000, max: 60, keyPrefix: 'payconfirm' }),
  safe(async (req, res) => {
    const token = clean(req.body?.token, 80);
    const reference = clean(req.body?.reference, 120);
    const order = token
      ? await queryOne('SELECT * FROM orders WHERE tracking_token = ?', [token])
      : await queryOne('SELECT * FROM orders WHERE payment_reference = ?', [reference]);
    if (!order) throw new HttpError(404, 'We could not find that order.');
    if (!paystackEnabled()) throw new HttpError(503, 'Payments are not configured on this server.');
    if (String(order.payment_status) === 'paid') return res.json({ ok: true, status: 'success', already_paid: true, total: Number(order.total) });
    if (!reference) throw new HttpError(400, 'Payment reference is required.');

    const verified = await verifyTransaction(reference);
    await upsertPaymentRecord({
      orderId: Number(order.id),
      reference,
      amountGhs: verified.amountGhs,
      status: verified.status,
      channel: verified.channel,
      payload: verified.raw,
      paidAt: verified.paidAt ? verified.paidAt.replace('T', ' ').slice(0, 19) : null,
    });

    if (verified.status !== 'success') {
      await recordSystemEvent({ action: 'payment.not_successful', entity: 'order', entityId: order.id, meta: { reference, status: verified.status } });
      return res.json({ ok: true, status: verified.status, charged: false });
    }
    const expected = Number(order.total);
    if (verified.currency !== 'GHS' || Math.abs(verified.amountGhs - expected) > 0.01) {
      await recordAudit(req, {
        action: 'payment.amount_mismatch',
        entity: 'order',
        entityId: order.id,
        meta: { expected, got: verified.amountGhs, currency: verified.currency, reference },
      });
      throw new HttpError(409, 'The payment amount did not match this order. Please contact us on WhatsApp so we can sort it out.');
    }
    await markOrderPaid(order, { reference, channel: verified.channel, method: 'paystack' });
    await recordAudit(req, { action: 'payment.confirmed', entity: 'order', entityId: order.id, meta: { reference, amount: verified.amountGhs, channel: verified.channel } });
    res.json({ ok: true, status: 'success', charged: true, total: verified.amountGhs, channel: verified.channel });
  })
);

/* ==================================================================
   PUBLIC — feedback, ratings, catering, training
================================================================== */
const formLimiter = rateLimit({ windowMs: 60 * 60_000, max: 30, keyPrefix: 'form', message: 'Too many submissions. Please try again later or call us.' });

app.post(
  '/api/feedback',
  rateLimit({ windowMs: 15 * 60_000, max: 20, keyPrefix: 'feedback', message: 'You have sent us a lot of messages. Please give us a moment to reply.' }),
  formLimiter,
  safe(async (req, res) => {
    const b = req.body || {};
    const full_name = requireText(b.fullname ?? b.full_name, 'Full name', { min: 2, max: 120 });
    const contactEmail = clean(b.email ?? b.phone, 190);
    const email = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(contactEmail) ? contactEmail.toLowerCase() : contactEmail || 'unknown@mayfordfoodsgh.local';
    const subject = clean(b.type ?? b.subject, 190) || 'Website feedback';
    const message = requireText(b.message, 'Message', { min: 3, max: 2000 });
    await execute(
      "INSERT INTO contact_messages (full_name, email, subject, message, status, notification_status, created_at) VALUES (?,?,?,?, 'New', 'new', ?)",
      [full_name, email, subject, message, nowSql()]
    );
    const store = await storeSettings();
    await sendMail({
      to: store.email,
      subject: `Website feedback: ${subject}`,
      body: brandWrap('New feedback / enquiry', [`Name: ${full_name}`, `Contact: ${clean(b.phone, 40) || email}`, '', message]),
      relatedType: 'feedback',
    });
    await recordAudit(req, { action: 'feedback.submit', entity: 'contact_message', meta: { subject } });
    res.json({ ok: true });
  })
);

app.post(
  '/api/ratings',
  rateLimit({ windowMs: 15 * 60_000, max: 20, keyPrefix: 'rating', message: 'Too many reviews from this device. Please try again later.' }),
  formLimiter,
  safe(async (req, res) => {
    const b = req.body || {};
    const customer_name = requireText(b.customer_name, 'Your name', { min: 2, max: 120 });
    const phone = optionalPhone(b.phone);
    const service_type = clean(b.service_type, 60) || 'Dining';
    const rating = requireInt(b.rating, 'Rating', { min: 1, max: 5 });
    const comment = clean(b.comment, 1000) || null;
    const result = await execute('INSERT INTO ratings (customer_name, phone, service_type, rating, comment, created_at) VALUES (?,?,?,?,?,?)', [
      customer_name,
      phone,
      service_type,
      rating,
      comment,
      nowSql(),
    ]);
    await recordAudit(req, { action: 'rating.submit', entity: 'rating', entityId: result.insertId, meta: { rating } });
    res.json({ ok: true });
  })
);

app.post(
  '/api/catering-bookings',
  rateLimit({ windowMs: 15 * 60_000, max: 12, keyPrefix: 'catering', message: 'Too many booking requests. Please call us instead.' }),
  formLimiter,
  safe(async (req, res) => {
    const b = req.body || {};
    const customer_name = requireText(b.customer_name, 'Full name', { min: 2, max: 120 });
    const phone = optionalPhone(b.phone);
    if (!phone) throw new HttpError(400, 'Phone number is required.');
    const event_type = requireText(b.event_type, 'Event type', { min: 2, max: 80 });
    const event_date = clean(b.event_date, 40);
    const guest_count = requireInt(b.guest_count, 'Guest count', { min: 1, max: 10000 });
    const message = clean(b.message, 2000) || null;
    const result = await execute(
      "INSERT INTO catering_bookings (customer_name, phone, event_type, event_date, guest_count, message, status, created_at) VALUES (?,?,?,?,?,?, 'New', ?)",
      [customer_name, phone, event_type, event_date, guest_count, message, nowSql()]
    );
    const store = await storeSettings();
    await sendMail({
      to: store.email,
      subject: `Catering booking: ${event_type} (${guest_count} guests)`,
      body: brandWrap('New catering booking', [
        `Name: ${customer_name}`,
        `Phone: ${phone}`,
        `Event: ${event_type} on ${event_date || 'date not given'}`,
        `Guests: ${guest_count}`,
        '',
        message || 'No extra notes.',
      ]),
      relatedType: 'catering_booking',
      relatedId: result.insertId,
    });
    await recordAudit(req, { action: 'catering.submit', entity: 'booking', entityId: result.insertId, meta: { event_type, guest_count } });
    res.json({ ok: true, id: result.insertId });
  })
);

app.post(
  '/api/training-applications',
  rateLimit({ windowMs: 15 * 60_000, max: 12, keyPrefix: 'training', message: 'Too many applications from this device. Please try again later.' }),
  formLimiter,
  safe(async (req, res) => {
    const b = req.body || {};
    const full_name = requireText(b.full_name, 'Full name', { min: 2, max: 120 });
    const phone = optionalPhone(b.phone);
    if (!phone) throw new HttpError(400, 'Phone number is required.');
    const email = requireEmail(b.email);
    const training_school = requireText(b.training_school, 'Training school', { min: 2, max: 120 });
    const program = requireText(b.program, 'Program', { min: 2, max: 120 });
    const message = clean(b.message, 2000) || null;
    const result = await execute(
      "INSERT INTO training_applications (full_name, phone, email, training_school, program, message, status, notification_status, created_at) VALUES (?,?,?,?,?,?, 'New', 'new', ?)",
      [full_name, phone, email, training_school, program, message, nowSql()]
    );
    const store = await storeSettings();
    await sendMail({
      to: store.email,
      subject: `Training application: ${program}`,
      body: brandWrap('New training application', [
        `Name: ${full_name}`,
        `Phone: ${phone}`,
        `Email: ${email}`,
        `School: ${training_school}`,
        `Program: ${program}`,
        '',
        message || 'No extra notes.',
      ]),
      relatedType: 'training_application',
      relatedId: result.insertId,
    });
    res.json({ ok: true, id: result.insertId });
  })
);

/* ==================================================================
   Routers
================================================================== */
app.use(customerRouter);
app.use(trackingRouter);
app.use(adminRouter);

/* ==================================================================
   Paystack webhook processing
================================================================== */
async function handlePaystackEvent(event: any) {
  const data = event?.data || {};
  const reference = String(data.reference || '');
  if (!reference || !paystackEnabled()) return;
  if (event.event !== 'charge.success' && event.event !== 'charge.failed' && event.event !== 'transfer.success') {
    await recordSystemEvent({ action: 'payment.webhook_ignored', entity: 'payment', entityId: reference, meta: { event: event.event } });
    return;
  }

  // Never trust the payload alone — re-verify with the API.
  let verified;
  try {
    verified = await verifyTransaction(reference);
  } catch (err) {
    await recordSystemEvent({ action: 'payment.webhook_verify_failed', entity: 'payment', entityId: reference, meta: { error: (err as Error).message } });
    return;
  }

  const orderId = Number(data?.metadata?.order_id || 0);
  const order =
    (orderId ? await queryOne('SELECT * FROM orders WHERE id = ?', [orderId]) : undefined) ||
    (await queryOne('SELECT * FROM orders WHERE payment_reference = ?', [reference])) ||
    (data?.metadata?.order_code ? await queryOne('SELECT * FROM orders WHERE order_code = ?', [String(data.metadata.order_code)]) : undefined);

  await upsertPaymentRecord({
    orderId: order ? Number(order.id) : null,
    reference,
    amountGhs: verified.amountGhs,
    status: verified.status,
    channel: verified.channel,
    payload: verified.raw,
    paidAt: verified.paidAt ? verified.paidAt.replace('T', ' ').slice(0, 19) : null,
  });

  if (!order) {
    await recordSystemEvent({ action: 'payment.webhook_unmatched', entity: 'payment', entityId: reference, meta: { amount: verified.amountGhs } });
    return;
  }
  if (verified.status !== 'success') {
    await recordSystemEvent({ action: 'payment.webhook_not_success', entity: 'order', entityId: order.id, meta: { reference, status: verified.status } });
    return;
  }
  const expected = Number(order.total);
  if (verified.currency !== 'GHS' || Math.abs(verified.amountGhs - expected) > 0.01) {
    await recordSystemEvent({
      action: 'payment.webhook_amount_mismatch',
      entity: 'order',
      entityId: order.id,
      meta: { expected, got: verified.amountGhs, currency: verified.currency, reference },
    });
    return;
  }
  if (String(order.payment_status) === 'paid') {
    await recordSystemEvent({ action: 'payment.webhook_duplicate', entity: 'order', entityId: order.id, meta: { reference } });
    return;
  }
  await markOrderPaid(order, { reference, channel: verified.channel, method: 'paystack' });
  await recordSystemEvent({ action: 'payment.webhook_confirmed', entity: 'order', entityId: order.id, meta: { reference, amount: verified.amountGhs } });
}

/* ==================================================================
   Errors + static frontend
================================================================== */
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'That file is too large. Please choose a smaller file.' : `Upload failed: ${err.message}`;
    return res.status(400).json({ ok: false, error: message });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ ok: false, error: err.message });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ ok: false, error: 'Invalid request body.' });
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ ok: false, error: 'That request was too large. Please shorten it and try again.' });
  }
  if (err?.type === 'encoding.unsupported' || err?.type === 'charset.unsupported') {
    return res.status(415).json({ ok: false, error: 'Unsupported content type.' });
  }
  console.error('[api] unhandled error:', err);
  if (!IS_PROD) return res.status(500).json({ ok: false, error: String(err?.message || err) });
  return res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
});

app.use('/api', (_req, res) => res.status(404).json({ ok: false, error: 'Endpoint not found' }));

if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  app.use(express.static(DIST_DIR, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/assets')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else if (fs.existsSync(path.join(PUBLIC_DIR, 'index.html'))) {
  app.use(express.static(PUBLIC_DIR, { index: false }));
}

/* ==================================================================
   Startup
================================================================== */
async function hashLegacyPasswords(): Promise<void> {
  const admins = await query('SELECT id, username, password FROM admins');
  let upgraded = 0;
  for (const admin of admins) {
    if (!isHashed(String(admin.password))) {
      await execute('UPDATE admins SET password = ? WHERE id = ?', [hashPassword(String(admin.password)), Number(admin.id)]);
      upgraded += 1;
    }
  }
  if (upgraded > 0) console.log(`[security] Hashed ${upgraded} legacy admin password(s) with scrypt.`);
  const weak = admins.filter((a) => String(a.password) === '123456');
  if (weak.length > 0) console.warn(`[security] ${weak.length} admin account(s) still use the default password "123456". Change them in Admin → Settings → Team.`);

  // Same protection for customer rows (demo seeds ship plaintext passwords).
  const customers = await query('SELECT id, password_hash FROM customers');
  let upgradedCustomers = 0;
  for (const customer of customers) {
    if (!isHashed(String(customer.password_hash))) {
      await execute('UPDATE customers SET password_hash = ? WHERE id = ?', [
        hashPassword(String(customer.password_hash)),
        Number(customer.id),
      ]);
      upgradedCustomers += 1;
    }
  }
  if (upgradedCustomers > 0) console.log(`[security] Hashed ${upgradedCustomers} legacy customer password(s) with scrypt.`);
}

async function start() {
  await initDb();
  await hashLegacyPasswords();
  if (!process.env.SESSION_SECRET) console.warn('[security] Set SESSION_SECRET in the environment for stable sessions across restarts.');
  if (!paystackEnabled()) console.warn('[payments] Paystack keys not configured — set PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY to accept online payments.');
  if (process.env.ADMIN_PIN === undefined) console.warn('[security] ADMIN_PIN not set — the default PIN is in use. Change it in production.');

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mayford Foods GH API v2 running on http://0.0.0.0:${PORT} (db: ${dbMode()}, env: ${IS_PROD ? 'production' : 'development'})`);
  });
}

void start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});

export { app };
