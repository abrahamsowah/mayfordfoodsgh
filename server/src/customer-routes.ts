/**
 * Customer accounts: register, sign in, order history, saved addresses,
 * reorder, password reset. Session-based (same cookie as admin, separate keys).
 */
import { Router, type Request, type Response } from 'express';
import { execute, nowSql, query, queryOne } from './db';
import {
  HttpError,
  clean,
  clientIp,
  hashPassword,
  hashToken,
  optionalPhone,
  passwordProblem,
  randomToken,
  rateLimit,
  requireEmail,
  requireText,
  verifyPassword,
} from './security';
import { recordAudit } from './audit';
import { brandWrap, sendMail, settings as storeSettings } from './notify';
import { orderDetail, publicTrackUrl } from './orders';

export const customerRouter = Router();

declare module 'express-session' {
  interface SessionData {
    customer_id?: number;
    customer_name?: string;
    customer_email?: string;
  }
}

const requireCustomer = (req: Request, res: Response, next: import('express').NextFunction) => {
  if (!req.session?.customer_id) {
    return res.status(401).json({ ok: false, error: 'Please sign in to your account.', needLogin: true });
  }
  next();
};

/** Wraps async handlers so a thrown error becomes a clean JSON response. */
function safe(fn: (req: Request, res: Response) => Promise<any>) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      const message = err instanceof HttpError ? err.message : 'Something went wrong. Please try again.';
      if (status >= 500) console.error('[customer]', err);
      res.status(status).json({ ok: false, error: message });
    }
  };
}

const publicCustomer = (row: any) => ({
  id: Number(row.id),
  full_name: row.full_name,
  email: row.email,
  phone: row.phone ?? null,
  marketing_opt_in: Number(row.marketing_opt_in) === 1,
  created_at: row.created_at,
  last_login_at: row.last_login_at ?? null,
});

async function logAttempt(scope: string, identifier: string, req: Request, success: boolean) {
  try {
    await execute('INSERT INTO login_attempts (scope, identifier, ip, success, created_at) VALUES (?,?,?,?,?)', [
      scope,
      identifier.slice(0, 190),
      clientIp(req),
      success ? 1 : 0,
      nowSql(),
    ]);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------
   Session
------------------------------------------------------------------ */
customerRouter.get(
  '/api/auth/customer/session',
  safe(async (req, res) => {
    if (!req.session?.customer_id) return res.json({ ok: true, customer: null });
    const customer = await queryOne('SELECT * FROM customers WHERE id = ?', [req.session.customer_id]);
    if (!customer || String(customer.status) !== 'active') {
      req.session.customer_id = undefined;
      return res.json({ ok: true, customer: null });
    }
    const orders = await queryOne('SELECT COUNT(*) AS c FROM orders WHERE customer_id = ?', [Number(customer.id)]);
    res.json({ ok: true, customer: publicCustomer(customer), orders_count: Number(orders?.c || 0) });
  })
);

/* ------------------------------------------------------------------
   Register / login / logout
------------------------------------------------------------------ */
customerRouter.post(
  '/api/auth/customer/register',
  rateLimit({ windowMs: 15 * 60_000, max: 10, keyPrefix: 'reg', message: 'Too many sign-up attempts. Please try again later.' }),
  safe(async (req, res) => {
    const full_name = requireText(req.body?.full_name, 'Full name', { min: 2, max: 120 });
    const email = requireEmail(req.body?.email);
    const phone = optionalPhone(req.body?.phone);
    const password = String(req.body?.password || '');
    const problem = passwordProblem(password);
    if (problem) throw new HttpError(400, problem);

    const existing = await queryOne('SELECT id FROM customers WHERE email = ?', [email]);
    if (existing) throw new HttpError(409, 'An account with this email already exists. Please sign in instead.');

    const marketing = req.body?.marketing_opt_in ? 1 : 0;
    const created = await execute(
      `INSERT INTO customers (full_name, email, phone, password_hash, marketing_opt_in, status, created_at) VALUES (?,?,?,?,?, 'active', ?)`,
      [full_name, email, phone, hashPassword(password), marketing, nowSql()]
    );

    // Claim any previous guest orders that used the same phone number.
    if (phone) {
      await execute('UPDATE orders SET customer_id = ? WHERE customer_id IS NULL AND phone = ?', [created.insertId, phone]);
    }

    req.session.customer_id = created.insertId;
    req.session.customer_name = full_name;
    req.session.customer_email = email;

    await recordAudit(req, { action: 'customer.register', entity: 'customer', entityId: created.insertId, meta: { email } });
    await sendMail({
      to: email,
      subject: 'Welcome to Mayford Foods GH',
      body: brandWrap(`Welcome, ${full_name}!`, [
        'Your Mayford Foods account is ready.',
        'You can now order, track your deliveries live and see your full order history.',
        '',
        `${process.env.APP_URL || 'https://mayfordfoodsgh.com'}/account`,
      ]),
      relatedType: 'customer',
      relatedId: created.insertId,
    });
    await logAttempt('customer_register', email, req, true);

    const customer = await queryOne('SELECT * FROM customers WHERE id = ?', [created.insertId]);
    res.json({ ok: true, customer: publicCustomer(customer) });
  })
);

customerRouter.post(
  '/api/auth/customer/login',
  rateLimit({ windowMs: 15 * 60_000, max: 12, keyPrefix: 'clogin', message: 'Too many sign-in attempts. Please wait a few minutes.' }),
  safe(async (req, res) => {
    const email = requireEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const customer = await queryOne('SELECT * FROM customers WHERE email = ?', [email]);
    const ok = customer ? verifyPassword(String(customer.password_hash), password) : false;
    await logAttempt('customer_login', email, req, ok);
    if (!customer) throw new HttpError(401, 'Email or password is incorrect.');
    if (String(customer.status) !== 'active') throw new HttpError(403, 'This account has been disabled. Please contact us on WhatsApp.');
    if (!ok) throw new HttpError(401, 'Email or password is incorrect.');

    req.session.customer_id = Number(customer.id);
    req.session.customer_name = String(customer.full_name);
    req.session.customer_email = String(customer.email);
    await execute('UPDATE customers SET last_login_at = ? WHERE id = ?', [nowSql(), Number(customer.id)]);
    await recordAudit(req, { action: 'customer.login', entity: 'customer', entityId: customer.id });

    res.json({ ok: true, customer: publicCustomer(customer) });
  })
);

customerRouter.post(
  '/api/auth/customer/logout',
  safe(async (req, res) => {
    if (req.session?.customer_id) await recordAudit(req, { action: 'customer.logout', entity: 'customer', entityId: req.session.customer_id });
    req.session.customer_id = undefined;
    req.session.customer_name = undefined;
    req.session.customer_email = undefined;
    res.json({ ok: true });
  })
);

/* ------------------------------------------------------------------
   Profile + password
------------------------------------------------------------------ */
customerRouter.post(
  '/api/customer/profile',
  requireCustomer,
  safe(async (req, res) => {
    const id = Number(req.session.customer_id);
    const full_name = requireText(req.body?.full_name, 'Full name', { min: 2, max: 120 });
    const phone = optionalPhone(req.body?.phone);
    const marketing = req.body?.marketing_opt_in ? 1 : 0;
    await execute('UPDATE customers SET full_name = ?, phone = ?, marketing_opt_in = ? WHERE id = ?', [full_name, phone, marketing, id]);
    req.session.customer_name = full_name;
    if (phone) await execute('UPDATE orders SET customer_id = ? WHERE customer_id IS NULL AND phone = ?', [id, phone]);
    await recordAudit(req, { action: 'customer.profile_update', entity: 'customer', entityId: id });
    const customer = await queryOne('SELECT * FROM customers WHERE id = ?', [id]);
    res.json({ ok: true, customer: publicCustomer(customer) });
  })
);

customerRouter.post(
  '/api/customer/password',
  requireCustomer,
  rateLimit({ windowMs: 15 * 60_000, max: 10, keyPrefix: 'cpw' }),
  safe(async (req, res) => {
    const id = Number(req.session.customer_id);
    const current = String(req.body?.current_password || '');
    const next = String(req.body?.new_password || '');
    const customer = await queryOne('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer || !verifyPassword(String(customer.password_hash), current)) throw new HttpError(401, 'Your current password is incorrect.');
    const problem = passwordProblem(next);
    if (problem) throw new HttpError(400, problem);
    await execute('UPDATE customers SET password_hash = ? WHERE id = ?', [hashPassword(next), id]);
    await recordAudit(req, { action: 'customer.password_change', entity: 'customer', entityId: id });
    res.json({ ok: true, message: 'Password updated.' });
  })
);

customerRouter.post(
  '/api/customer/password/forgot',
  rateLimit({ windowMs: 60 * 60_000, max: 5, keyPrefix: 'forgot' }),
  safe(async (req, res) => {
    const email = requireEmail(req.body?.email);
    const customer = await queryOne('SELECT id, full_name FROM customers WHERE email = ?', [email]);
    // Always answer the same way so the endpoint cannot be used to enumerate accounts.
    if (customer) {
      const token = randomToken(32);
      const expires = new Date(Date.now() + 60 * 60_000);
      const p = (n: number) => String(n).padStart(2, '0');
      const expiresSql = `${expires.getFullYear()}-${p(expires.getMonth() + 1)}-${p(expires.getDate())} ${p(expires.getHours())}:${p(expires.getMinutes())}:${p(expires.getSeconds())}`;
      await execute('INSERT INTO password_resets (customer_id, token_hash, expires_at, created_at) VALUES (?,?,?,?)', [
        Number(customer.id),
        hashToken(token),
        expiresSql,
        nowSql(),
      ]);
      const base = (process.env.APP_URL || 'https://mayfordfoodsgh.com').replace(/\/$/, '');
      await sendMail({
        to: email,
        subject: 'Reset your Mayford Foods password',
        body: brandWrap(`Hello ${customer.full_name}`, [
          'We received a request to reset your password.',
          `Open this link within the next hour: ${base}/account/reset?token=${token}`,
          '',
          'If you did not ask for this, you can safely ignore this email.',
        ]),
        relatedType: 'customer',
        relatedId: customer.id,
      });
      await recordAudit(req, { action: 'customer.password_reset_request', entity: 'customer', entityId: customer.id });
    }
    res.json({ ok: true, message: 'If that email is registered, a reset link is on its way.' });
  })
);

customerRouter.post(
  '/api/customer/password/reset',
  rateLimit({ windowMs: 60 * 60_000, max: 10, keyPrefix: 'reset' }),
  safe(async (req, res) => {
    const token = clean(req.body?.token, 200);
    const password = String(req.body?.new_password || '');
    const problem = passwordProblem(password);
    if (problem) throw new HttpError(400, problem);
    const row = await queryOne('SELECT * FROM password_resets WHERE token_hash = ? AND used_at IS NULL ORDER BY id DESC LIMIT 1', [hashToken(token)]);
    if (!row) throw new HttpError(400, 'This reset link is invalid or has already been used.');
    if (String(row.expires_at) < nowSql()) throw new HttpError(400, 'This reset link has expired. Please request a new one.');
    await execute('UPDATE customers SET password_hash = ? WHERE id = ?', [hashPassword(password), Number(row.customer_id)]);
    await execute('UPDATE password_resets SET used_at = ? WHERE id = ?', [nowSql(), Number(row.id)]);
    await recordAudit(req, { action: 'customer.password_reset', entity: 'customer', entityId: row.customer_id });
    res.json({ ok: true, message: 'Password updated. You can sign in now.' });
  })
);

/* ------------------------------------------------------------------
   Orders
------------------------------------------------------------------ */
customerRouter.get(
  '/api/customer/orders',
  requireCustomer,
  safe(async (req, res) => {
    const id = Number(req.session.customer_id);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const rows = await query('SELECT * FROM orders WHERE customer_id = ? ORDER BY id DESC LIMIT ' + limit, [id]);
    const orders = [];
    for (const row of rows) {
      const detail = await orderDetail(row);
      orders.push({ ...detail.order, items: detail.items, steps: detail.steps, payment: detail.payment, cancelled: detail.cancelled });
    }
    res.json({ ok: true, orders });
  })
);

customerRouter.get(
  '/api/customer/orders/:key',
  requireCustomer,
  safe(async (req, res) => {
    const id = Number(req.session.customer_id);
    const key = clean(req.params.key, 60);
    const order = await queryOne(
      /^\d+$/.test(key) ? 'SELECT * FROM orders WHERE id = ? AND customer_id = ?' : 'SELECT * FROM orders WHERE order_code = ? AND customer_id = ?',
      [/^\d+$/.test(key) ? Number(key) : key, id]
    );
    if (!order) throw new HttpError(404, 'Order not found in your account.');
    res.json({ ok: true, ...(await orderDetail(order)) });
  })
);

/** "Order again" — returns the item ids + quantities so the cart can be refilled. */
customerRouter.post(
  '/api/customer/orders/:id/reorder',
  requireCustomer,
  safe(async (req, res) => {
    const id = Number(req.session.customer_id);
    const order = await queryOne('SELECT * FROM orders WHERE id = ? AND customer_id = ?', [Number(req.params.id), id]);
    if (!order) throw new HttpError(404, 'Order not found in your account.');
    const items = await query(
      `SELECT oi.menu_item_id AS id, oi.food_name AS name, oi.quantity, mi.status, mi.price, mi.discount_percent, mi.image
       FROM order_items oi LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id WHERE oi.order_id = ?`,
      [Number(order.id)]
    );
    res.json({
      ok: true,
      outlet: order.outlet,
      order_type: order.order_type,
      address: order.address ?? null,
      lines: items.map((i) => ({
        id: i.id ? Number(i.id) : null,
        name: i.name,
        quantity: Number(i.quantity),
        available: String(i.status || '') === 'available',
        price: i.price != null ? Number(i.price) : null,
        discount_percent: Number(i.discount_percent || 0),
        image: i.image ?? null,
      })),
    });
  })
);

/* ------------------------------------------------------------------
   Saved addresses
------------------------------------------------------------------ */
customerRouter.get(
  '/api/customer/addresses',
  requireCustomer,
  safe(async (req, res) => {
    const rows = await query('SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, id DESC', [
      Number(req.session.customer_id),
    ]);
    res.json({ ok: true, addresses: rows });
  })
);

customerRouter.post(
  '/api/customer/addresses',
  requireCustomer,
  safe(async (req, res) => {
    const customerId = Number(req.session.customer_id);
    const label = clean(req.body?.label, 60) || 'Home';
    const address = requireText(req.body?.address, 'Address', { min: 5, max: 250 });
    const landmark = clean(req.body?.landmark, 190) || null;
    const existing = await query('SELECT id FROM customer_addresses WHERE customer_id = ?', [customerId]);
    const isDefault = req.body?.is_default || existing.length === 0 ? 1 : 0;
    if (isDefault) await execute('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?', [customerId]);
    const result = await execute('INSERT INTO customer_addresses (customer_id, label, address, landmark, is_default, created_at) VALUES (?,?,?,?,?,?)', [
      customerId,
      label,
      address,
      landmark,
      isDefault,
      nowSql(),
    ]);
    await recordAudit(req, { action: 'customer.address_add', entity: 'address', entityId: result.insertId });
    res.json({ ok: true, id: result.insertId });
  })
);

customerRouter.delete(
  '/api/customer/addresses/:id',
  requireCustomer,
  safe(async (req, res) => {
    await execute('DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?', [Number(req.params.id), Number(req.session.customer_id)]);
    await recordAudit(req, { action: 'customer.address_delete', entity: 'address', entityId: req.params.id });
    res.json({ ok: true });
  })
);

customerRouter.post(
  '/api/customer/addresses/:id/default',
  requireCustomer,
  safe(async (req, res) => {
    const customerId = Number(req.session.customer_id);
    await execute('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?', [customerId]);
    await execute('UPDATE customer_addresses SET is_default = 1 WHERE id = ? AND customer_id = ?', [Number(req.params.id), customerId]);
    res.json({ ok: true });
  })
);

/* ------------------------------------------------------------------
   Public order tracking (token or code + phone)
------------------------------------------------------------------ */
export const trackingRouter = Router();

trackingRouter.get(
  '/api/orders/track/:token',
  rateLimit({ windowMs: 15 * 60_000, max: 120, keyPrefix: 'track' }),
  safe(async (req, res) => {
    const token = clean(req.params.token, 80);
    const order = await queryOne('SELECT * FROM orders WHERE tracking_token = ?', [token]);
    if (!order) throw new HttpError(404, 'We could not find that order. Please check the tracking link.');
    const detail = await orderDetail(order);
    const store = await storeSettings();
    res.json({
      ok: true,
      ...detail,
      support: { adabraka: store.adabraka_phone, dzorwulu: store.dzorwulu_phone, email: store.email },
      track_url: publicTrackUrl(token),
    });
  })
);

trackingRouter.post(
  '/api/orders/lookup',
  rateLimit({ windowMs: 15 * 60_000, max: 20, keyPrefix: 'lookup', message: 'Too many lookups. Please wait a moment and try again.' }),
  safe(async (req, res) => {
    const code = clean(req.body?.order_code, 40).toUpperCase();
    const phone = optionalPhone(req.body?.phone, 'Phone number');
    if (!code || !phone) throw new HttpError(400, 'Enter your order code and the phone number used to order.');
    const order = await queryOne('SELECT * FROM orders WHERE (order_code = ? OR payment_reference = ?) AND phone = ?', [code, code, phone]);
    if (!order) throw new HttpError(404, 'No order matches that code and phone number.');
    const detail = await orderDetail(order);
    const store = await storeSettings();
    res.json({ ok: true, ...detail, tracking_token: order.tracking_token, support: { adabraka: store.adabraka_phone, dzorwulu: store.dzorwulu_phone, email: store.email } });
  })
);
