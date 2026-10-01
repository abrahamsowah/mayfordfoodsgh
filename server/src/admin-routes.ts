/**
 * Admin API — dashboard, order management, menu, content, customers,
 * analytics, payments and the audit trail.
 *
 * Every mutation is validated, scoped by role (outlet managers only touch
 * their own outlet) and written to the audit log.
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { execute, nowSql, query, queryOne } from './db';
import { ASSETS_DIR } from './paths';
import {
  HttpError,
  clean,
  hashPassword,
  oneOf,
  optionalPhone,
  passwordProblem,
  rateLimit,
  requireInt,
  requireMoney,
  requireText,
  safeFilename,
  verifyPassword,
} from './security';
import { listAudit, recordAudit } from './audit';
import { analyticsSummary, rangeStart, type Range } from './analytics';
import { advanceOrder, ORDER_STATUSES, orderDetail, markOrderPaid } from './orders';
import { paystackEnabled, paystackStatus, verifyTransaction, upsertPaymentRecord, paginatedPayments } from './payments';

export const adminRouter = Router();

declare module 'express-session' {
  interface SessionData {
    admin_access?: boolean;
    admin_id?: number;
    admin_name?: string;
    role?: string;
  }
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.admin_id) return res.status(401).json({ ok: false, error: 'Admin login required', needLogin: true });
  next();
};

export const requireSuper = (req: Request, res: Response, next: NextFunction) => {
  if (req.session?.role !== 'super_admin') return res.status(403).json({ ok: false, error: 'Super admin access required' });
  next();
};

/** The outlet a logged-in admin may see (super_admin sees all). */
function outletScope(req: Request): { where: string; params: any[] } {
  const role = req.session?.role;
  if (role === 'adabraka_admin') return { where: 'outlet = ?', params: ['Adabraka'] };
  if (role === 'dzorwulu_admin') return { where: 'outlet = ?', params: ['Dzorwulu'] };
  return { where: '1=1', params: [] };
}

/** Blocks staff from touching records that belong to another outlet. */
async function assertOutletAccess(req: Request, table: 'orders', id: number): Promise<void> {
  const order = await queryOne(`SELECT outlet FROM ${table} WHERE id = ?`, [id]);
  if (!order) throw new HttpError(404, 'Record not found.');
  const role = req.session?.role;
  if (role === 'adabraka_admin' && String(order.outlet) !== 'Adabraka') throw new HttpError(403, 'This order belongs to another outlet.');
  if (role === 'dzorwulu_admin' && String(order.outlet) !== 'Dzorwulu') throw new HttpError(403, 'This order belongs to another outlet.');
}

function safe(fn: (req: Request, res: Response) => Promise<any>) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      const message = err instanceof HttpError ? err.message : 'Something went wrong. Please try again.';
      if (status >= 500) console.error('[admin]', req.method, req.originalUrl, err);
      if (res.headersSent) return;
      res.status(status).json({ ok: false, error: message });
    }
  };
}

/* ------------------------------------------------------------------
   Uploads — server-generated filenames, type allowlist, size caps
------------------------------------------------------------------ */
function uploader(dir: string, kind: 'image' | 'video' | 'audio' | 'any') {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        const dest = path.join(ASSETS_DIR, dir);
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
      },
      filename: (_req, file, cb) => {
        try {
          cb(null, safeFilename(file.originalname, kind));
        } catch (err) {
          cb(err as Error, '');
        }
      },
    }),
    limits: { fileSize: kind === 'video' ? 250 * 1024 * 1024 : 25 * 1024 * 1024, files: 1 },
  });
}

/** Removes an uploaded file if it lives under the assets folder. */
function removeUpload(dir: string, filename: unknown) {
  const name = path.basename(String(filename || ''));
  if (!name || name === '.' || name === '..') return;
  const file = path.join(ASSETS_DIR, dir, name);
  if (file.startsWith(ASSETS_DIR) && fs.existsSync(file)) {
    try {
      fs.unlinkSync(file);
    } catch {
      /* ignore */
    }
  }
}

/* ==================================================================
   Dashboard
================================================================== */
adminRouter.get(
  '/api/admin/stats',
  requireAdmin,
  safe(async (req, res) => {
    const role = req.session?.role;
    const { where, params } = outletScope(req);
    const revenueRow = await queryOne(`SELECT SUM(total) AS total_revenue FROM orders WHERE ${where}`, params);
    const pending = await queryOne(`SELECT COUNT(*) AS c FROM orders WHERE ${where} AND status = 'Pending'`, params);
    const inProgress = await queryOne(`SELECT COUNT(*) AS c FROM orders WHERE ${where} AND status IN ('Confirmed','Preparing','Ready','Out for delivery')`, params);
    const completed = await queryOne(`SELECT COUNT(*) AS c FROM orders WHERE ${where} AND status = 'Completed'`, params);
    const paid = await queryOne(`SELECT COALESCE(SUM(total),0) AS v FROM orders WHERE ${where} AND payment_status = 'paid'`, params);
    const today = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    const todayStart = `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())} 00:00:00`;
    const todayOrders = await queryOne(`SELECT COUNT(*) AS c, COALESCE(SUM(total),0) AS v FROM orders WHERE ${where} AND order_date >= ?`, [...params, todayStart]);
    const todayPaid = await queryOne(
      `SELECT COALESCE(SUM(total),0) AS v FROM orders WHERE ${where} AND payment_status = 'paid' AND order_date >= ?`,
      [...params, todayStart]
    );

    const stats: Record<string, any> = {
      revenue: Number(revenueRow?.total_revenue || 0),
      paid_revenue: Number(paid?.v || 0),
      pending_orders: Number(pending?.c || 0),
      in_progress_orders: Number(inProgress?.c || 0),
      completed_orders: Number(completed?.c || 0),
      today_orders: Number(todayOrders?.c || 0),
      today_revenue: Number(todayOrders?.v || 0),
      today_paid_revenue: Number(todayPaid?.v || 0),
    };
    if (role === 'super_admin') {
      const catering = await queryOne('SELECT COUNT(*) AS c FROM catering_bookings');
      const messages = await queryOne('SELECT COUNT(*) AS c FROM contact_messages');
      const applications = await queryOne('SELECT COUNT(*) AS c FROM training_applications');
      const customers = await queryOne('SELECT COUNT(*) AS c FROM customers');
      const visitors = await queryOne('SELECT total_visitors FROM visitor_counter WHERE id = 1');
      const ratings = await queryOne('SELECT COUNT(*) AS c, AVG(rating) AS avg_rating FROM ratings');
      const views = await queryOne('SELECT COUNT(DISTINCT session_key) AS v, COUNT(*) AS p FROM page_views WHERE created_at >= ?', [todayStart]);
      Object.assign(stats, {
        catering_bookings: Number(catering?.c || 0),
        contact_messages: Number(messages?.c || 0),
        training_applications: Number(applications?.c || 0),
        customers: Number(customers?.c || 0),
        total_visitors: Number(visitors?.total_visitors || 0),
        today_visitors: Number(views?.v || 0),
        today_page_views: Number(views?.p || 0),
        ratings_count: Number(ratings?.c || 0),
        ratings_average: Number(ratings?.avg_rating || 0),
      });
    }
    res.json({ ok: true, role, stats });
  })
);

adminRouter.get(
  '/api/admin/notifications',
  requireAdmin,
  safe(async (req, res) => {
    const { where, params } = outletScope(req);
    const orders = await queryOne(`SELECT COUNT(*) AS c FROM orders WHERE ${where} AND notification_status = 'new'`, params);
    const applications = await queryOne("SELECT COUNT(*) AS c FROM training_applications WHERE notification_status = 'new'");
    const messages = await queryOne("SELECT COUNT(*) AS c FROM contact_messages WHERE notification_status = 'new'");
    const unpaid = await queryOne(`SELECT COUNT(*) AS c FROM orders WHERE ${where} AND payment_status = 'unpaid' AND payment_method = 'paystack'`, params);
    res.json({
      orders: Number(orders?.c || 0),
      applications: Number(applications?.c || 0),
      messages: Number(messages?.c || 0),
      pending_payments: Number(unpaid?.c || 0),
    });
  })
);

adminRouter.get(
  '/api/admin/analytics',
  requireAdmin,
  safe(async (req, res) => {
    const range = (['today', '7d', '30d', '90d', 'ytd', 'all'] as Range[]).includes(req.query.range as Range)
      ? (req.query.range as Range)
      : '30d';
    const summary = await analyticsSummary(range);
    if (req.session?.role !== 'super_admin') {
      // Outlet managers only see their own numbers.
      const { where, params } = outletScope(req);
      const from = rangeStart(range);
      const scoped = await queryOne(
        `SELECT COUNT(*) AS orders, COALESCE(SUM(total),0) AS value FROM orders WHERE ${where} ${from ? 'AND order_date >= ?' : ''}`,
        [...params, ...(from ? [from] : [])]
      );
      summary.sales.orders = Number(scoped?.orders || 0);
      summary.sales.revenue = Number(scoped?.value || 0);
      summary.traffic.top_pages = [];
      summary.customers.top = [];
    }
    res.json({ ok: true, analytics: summary });
  })
);

adminRouter.get(
  '/api/admin/audit-logs',
  requireAdmin,
  safe(async (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const data = await listAudit({
      limit,
      offset,
      action: clean(req.query.action, 80) || undefined,
      actorType: clean(req.query.actor_type, 20) || undefined,
      search: clean(req.query.search, 80) || undefined,
    });
    res.json({ ok: true, ...data, limit, offset });
  })
);

/* ==================================================================
   Orders
================================================================== */
adminRouter.get(
  '/api/admin/orders',
  requireAdmin,
  safe(async (req, res) => {
    const { where, params } = outletScope(req);
    const search = clean(req.query.search, 80);
    const status = clean(req.query.status, 40);
    const payment = clean(req.query.payment_status, 20);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
    let sql = `SELECT * FROM orders WHERE ${where}`;
    if (search) {
      sql += ' AND (customer_name LIKE ? OR phone LIKE ? OR order_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (payment) {
      sql += ' AND payment_status = ?';
      params.push(payment);
    }
    sql += ` ORDER BY id DESC LIMIT ${limit}`;
    const rows = await query(sql, params);
    await execute(`UPDATE orders SET notification_status = 'seen' WHERE notification_status = 'new' AND ${where}`, params);
    res.json({ ok: true, orders: rows });
  })
);

adminRouter.get(
  '/api/admin/orders/:id',
  requireAdmin,
  safe(async (req, res) => {
    const id = Number(req.params.id);
    await assertOutletAccess(req, 'orders', id);
    const order = await queryOne('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) throw new HttpError(404, 'Order not found.');
    res.json({ ok: true, ...(await orderDetail(order)) });
  })
);

adminRouter.put(
  '/api/admin/orders/:id/status',
  requireAdmin,
  safe(async (req, res) => {
    const id = Number(req.params.id);
    await assertOutletAccess(req, 'orders', id);
    const status = oneOf(req.body?.status, ORDER_STATUSES, 'Status');
    if (status === 'Cancelled' && !clean(req.body?.reason, 200)) {
      throw new HttpError(400, 'Please give a reason for cancelling the order.');
    }
    const courier_phone = req.body?.courier_phone ? optionalPhone(req.body.courier_phone, 'Rider phone') : null;
    const eta = req.body?.eta_minutes !== undefined && req.body?.eta_minutes !== '' ? requireInt(req.body.eta_minutes, 'ETA', { min: 5, max: 240 }) : null;
    await advanceOrder(id, status, {
      note: clean(req.body?.note, 300) || null,
      actor: req.session?.admin_name || 'admin',
      courier_name: clean(req.body?.courier_name, 120) || null,
      courier_phone,
      eta_minutes: eta,
      reason: clean(req.body?.reason, 200) || null,
    });
    await recordAudit(req, { action: 'order.status', entity: 'order', entityId: id, meta: { status, courier: req.body?.courier_name || null } });
    res.json({ ok: true, status });
  })
);

adminRouter.put(
  '/api/admin/orders/:id/payment',
  requireAdmin,
  safe(async (req, res) => {
    const id = Number(req.params.id);
    await assertOutletAccess(req, 'orders', id);
    const order = await queryOne('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) throw new HttpError(404, 'Order not found.');
    const method = oneOf(req.body?.payment_method ?? 'cash', ['cash', 'momo', 'paystack', 'bank'] as const, 'Payment method');
    const reference = clean(req.body?.reference, 120) || null;
    if (String(order.payment_status) === 'paid') return res.json({ ok: true, already_paid: true });
    await markOrderPaid(order, { reference, method, channel: method });
    if (reference) await upsertPaymentRecord({ orderId: id, reference, amountGhs: Number(order.total), status: 'success', channel: method });
    await recordAudit(req, { action: 'order.payment_recorded', entity: 'order', entityId: id, meta: { method, reference, amount: Number(order.total) } });
    res.json({ ok: true });
  })
);

adminRouter.delete(
  '/api/admin/orders/:id',
  requireAdmin,
  requireSuper,
  safe(async (req, res) => {
    const id = Number(req.params.id);
    const order = await queryOne('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) throw new HttpError(404, 'Order not found.');
    await execute('DELETE FROM order_items WHERE order_id = ?', [id]);
    await execute('DELETE FROM order_events WHERE order_id = ?', [id]);
    await execute('DELETE FROM orders WHERE id = ?', [id]);
    await recordAudit(req, { action: 'order.delete', entity: 'order', entityId: id, meta: { code: order.order_code, total: Number(order.total) } });
    res.json({ ok: true });
  })
);

/**
 * Reset the revenue figures. Destructive — super admin only, explicit
 * confirmation, and the financial `payments` ledger is kept intact.
 */
adminRouter.delete(
  '/api/admin/orders',
  requireAdmin,
  requireSuper,
  rateLimit({ windowMs: 60 * 60_000, max: 5, keyPrefix: 'reset' }),
  safe(async (req, res) => {
    const confirm = clean(req.body?.confirm ?? req.query.confirm, 20);
    if (confirm !== 'RESET') throw new HttpError(400, 'Type RESET to confirm clearing the order history.');
    const counts = await queryOne('SELECT COUNT(*) AS c FROM orders');
    await execute('DELETE FROM order_items');
    await execute('DELETE FROM order_events');
    await execute('DELETE FROM orders');
    await execute('UPDATE visitor_counter SET total_visitors = total_visitors WHERE id = 1');
    await recordAudit(req, { action: 'order.reset_all', entity: 'orders', meta: { deleted: Number(counts?.c || 0) } });
    res.json({ ok: true, deleted: Number(counts?.c || 0) });
  })
);

/* ==================================================================
   Customers
================================================================== */
adminRouter.get(
  '/api/admin/customers',
  requireAdmin,
  requireSuper,
  safe(async (req, res) => {
    const search = clean(req.query.search, 80);
    const params: any[] = [];
    let where = '1=1';
    if (search) {
      where += ' AND (c.full_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const customers = await query(
      `SELECT c.id, c.full_name, c.email, c.phone, c.status, c.marketing_opt_in, c.created_at, c.last_login_at,
              (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS orders_count,
              (SELECT COALESCE(SUM(o.total),0) FROM orders o WHERE o.customer_id = c.id) AS total_spent,
              (SELECT MAX(o.order_date) FROM orders o WHERE o.customer_id = c.id) AS last_order_at
       FROM customers c WHERE ${where} ORDER BY c.id DESC LIMIT 300`,
      params
    );
    res.json({ ok: true, customers });
  })
);

adminRouter.put(
  '/api/admin/customers/:id/status',
  requireAdmin,
  requireSuper,
  safe(async (req, res) => {
    const status = oneOf(req.body?.status, ['active', 'disabled'] as const, 'Status');
    await execute('UPDATE customers SET status = ? WHERE id = ?', [status, Number(req.params.id)]);
    await recordAudit(req, { action: 'customer.status', entity: 'customer', entityId: req.params.id, meta: { status } });
    res.json({ ok: true });
  })
);

/* ==================================================================
   Payments
================================================================== */
adminRouter.get(
  '/api/admin/payments',
  requireAdmin,
  requireSuper,
  safe(async (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const data = await paginatedPayments(limit, offset);
    res.json({ ok: true, ...data, gateway: await paystackStatus() });
  })
);

adminRouter.get(
  '/api/admin/payments/status',
  requireAdmin,
  requireSuper,
  safe(async (_req, res) => {
    res.json({ ok: true, gateway: await paystackStatus() });
  })
);

/** Re-checks a transaction directly with Paystack (recovery for missed webhooks). */
adminRouter.post(
  '/api/admin/payments/:reference/verify',
  requireAdmin,
  requireSuper,
  safe(async (req, res) => {
    if (!paystackEnabled()) throw new HttpError(503, 'Paystack keys are not configured on the server.');
    const reference = clean(req.params.reference, 120);
    const payment = await queryOne('SELECT * FROM payments WHERE reference = ?', [reference]);
    const order = payment?.order_id
      ? await queryOne('SELECT * FROM orders WHERE id = ?', [Number(payment.order_id)])
      : await queryOne('SELECT * FROM orders WHERE payment_reference = ?', [reference]);
    const verified = await verifyTransaction(reference);
    await upsertPaymentRecord({
      orderId: order ? Number(order.id) : null,
      reference,
      amountGhs: verified.amountGhs,
      status: verified.status,
      channel: verified.channel,
      payload: verified.raw,
      paidAt: verified.paidAt ? verified.paidAt.replace('T', ' ').slice(0, 19) : null,
    });
    let markedPaid = false;
    if (verified.status === 'success' && order) {
      const expected = Number(order.total);
      if (Math.abs(verified.amountGhs - expected) > 0.01) {
        await recordAudit(req, { action: 'payment.amount_mismatch', entity: 'order', entityId: order.id, meta: { expected, got: verified.amountGhs, reference } });
      } else if (String(order.payment_status) !== 'paid') {
        await markOrderPaid(order, { reference, channel: verified.channel, method: 'paystack' });
        markedPaid = true;
      }
    }
    await recordAudit(req, { action: 'payment.verify', entity: 'payment', entityId: reference, meta: { status: verified.status, markedPaid } });
    res.json({ ok: true, status: verified.status, amount: verified.amountGhs, channel: verified.channel, marked_paid: markedPaid });
  })
);

/* ==================================================================
   Menu, categories, discounts
================================================================== */
const menuImage = uploader('images', 'image');

adminRouter.post(
  '/api/admin/menu',
  requireAdmin,
  menuImage.single('image'),
  safe(async (req, res) => {
    const food_name = requireText(req.body?.food_name, 'Food name', { min: 2, max: 190 });
    const category = requireText(req.body?.category, 'Category', { min: 2, max: 80 });
    const description = clean(req.body?.description, 1000);
    const price = requireMoney(req.body?.price, 'Price', { min: 0.5 });
    const status = oneOf(req.body?.status ?? 'available', ['available', 'unavailable'] as const, 'Status');
    const result = await execute(
      'INSERT INTO menu_items (food_name, category, description, price, image, status, discount_percent, created_at) VALUES (?,?,?,?,?,?,0,?)',
      [food_name, category, description, price, req.file ? req.file.filename : clean(req.body?.image, 200), status, nowSql()]
    );
    await recordAudit(req, { action: 'menu.create', entity: 'menu_item', entityId: result.insertId, meta: { food_name, price } });
    res.json({ ok: true, id: result.insertId });
  })
);

adminRouter.put(
  '/api/admin/menu/:id',
  requireAdmin,
  safe(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await queryOne('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (!existing) throw new HttpError(404, 'Menu item not found.');
    const food_name = requireText(req.body?.food_name ?? existing.food_name, 'Food name', { min: 2, max: 190 });
    const category = requireText(req.body?.category ?? existing.category, 'Category', { min: 2, max: 80 });
    const description = clean(req.body?.description ?? existing.description, 1000);
    const price = requireMoney(req.body?.price ?? existing.price, 'Price', { min: 0.5 });
    const status = oneOf(req.body?.status ?? existing.status, ['available', 'unavailable'] as const, 'Status');
    await execute('UPDATE menu_items SET food_name = ?, category = ?, description = ?, price = ?, status = ? WHERE id = ?', [
      food_name,
      category,
      description,
      price,
      status,
      id,
    ]);
    await recordAudit(req, { action: 'menu.update', entity: 'menu_item', entityId: id, meta: { food_name, price, status } });
    res.json({ ok: true });
  })
);

adminRouter.delete(
  '/api/admin/menu/:id',
  requireAdmin,
  safe(async (req, res) => {
    const id = Number(req.params.id);
    const item = await queryOne('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (!item) throw new HttpError(404, 'Menu item not found.');
    removeUpload('images', item.image);
    await execute('DELETE FROM menu_items WHERE id = ?', [id]);
    await recordAudit(req, { action: 'menu.delete', entity: 'menu_item', entityId: id, meta: { food_name: item.food_name } });
    res.json({ ok: true });
  })
);

adminRouter.put(
  '/api/admin/menu/:id/discount',
  requireAdmin,
  safe(async (req, res) => {
    const discount = requireInt(req.body?.discount_percent ?? 0, 'Discount', { min: 0, max: 90 });
    await execute('UPDATE menu_items SET discount_percent = ? WHERE id = ?', [discount, Number(req.params.id)]);
    await recordAudit(req, { action: 'menu.discount', entity: 'menu_item', entityId: req.params.id, meta: { discount } });
    res.json({ ok: true });
  })
);

adminRouter.put(
  '/api/admin/menu/:id/status',
  requireAdmin,
  safe(async (req, res) => {
    const status = oneOf(req.body?.status, ['available', 'unavailable'] as const, 'Status');
    await execute('UPDATE menu_items SET status = ? WHERE id = ?', [status, Number(req.params.id)]);
    await recordAudit(req, { action: 'menu.status', entity: 'menu_item', entityId: req.params.id, meta: { status } });
    res.json({ ok: true });
  })
);

adminRouter.post(
  '/api/admin/categories',
  requireAdmin,
  safe(async (req, res) => {
    const name = requireText(req.body?.category_name, 'Category name', { min: 2, max: 80 });
    const existing = await queryOne('SELECT id FROM menu_categories WHERE category_name = ?', [name]);
    if (existing) throw new HttpError(409, 'Category Already Exists');
    const result = await execute('INSERT INTO menu_categories (category_name, created_at) VALUES (?,?)', [name, nowSql()]);
    await recordAudit(req, { action: 'category.create', entity: 'category', entityId: result.insertId, meta: { name } });
    res.json({ ok: true });
  })
);

adminRouter.put(
  '/api/admin/categories/:id',
  requireAdmin,
  safe(async (req, res) => {
    const name = requireText(req.body?.category_name, 'Category name', { min: 2, max: 80 });
    await execute('UPDATE menu_categories SET category_name = ? WHERE id = ?', [name, Number(req.params.id)]);
    await recordAudit(req, { action: 'category.update', entity: 'category', entityId: req.params.id, meta: { name } });
    res.json({ ok: true });
  })
);

adminRouter.delete(
  '/api/admin/categories/:id',
  requireAdmin,
  safe(async (req, res) => {
    await execute('DELETE FROM menu_categories WHERE id = ?', [Number(req.params.id)]);
    await recordAudit(req, { action: 'category.delete', entity: 'category', entityId: req.params.id });
    res.json({ ok: true });
  })
);

/* ==================================================================
   Content: adverts, banners, slides, videos, community
================================================================== */
const advertImage = uploader('adverts', 'image');
adminRouter.post(
  '/api/admin/adverts',
  requireAdmin,
  advertImage.single('banner_image'),
  safe(async (req, res) => {
    const title = requireText(req.body?.title, 'Title', { min: 2, max: 190 });
    const result = await execute(
      'INSERT INTO advertisement_banners (banner_image, title, description, button_text, button_link, status, created_at) VALUES (?,?,?,?,?,?,?)',
      [
        req.file ? req.file.filename : '',
        title,
        clean(req.body?.description, 600),
        clean(req.body?.button_text, 60) || 'Order Now',
        clean(req.body?.button_link, 300) || '/menu',
        oneOf(req.body?.status ?? 'Active', ['Active', 'Inactive'] as const, 'Status'),
        nowSql(),
      ]
    );
    await recordAudit(req, { action: 'advert.create', entity: 'advert', entityId: result.insertId, meta: { title } });
    res.json({ ok: true, id: result.insertId });
  })
);

adminRouter.put(
  '/api/admin/adverts/:id',
  requireAdmin,
  safe(async (req, res) => {
    await execute('UPDATE advertisement_banners SET title = ?, description = ?, button_text = ?, button_link = ?, status = ? WHERE id = ?', [
      requireText(req.body?.title, 'Title', { min: 2, max: 190 }),
      clean(req.body?.description, 600),
      clean(req.body?.button_text, 60) || 'Order Now',
      clean(req.body?.button_link, 300) || '/menu',
      oneOf(req.body?.status ?? 'Active', ['Active', 'Inactive'] as const, 'Status'),
      Number(req.params.id),
    ]);
    await recordAudit(req, { action: 'advert.update', entity: 'advert', entityId: req.params.id });
    res.json({ ok: true });
  })
);

adminRouter.delete(
  '/api/admin/adverts/:id',
  requireAdmin,
  safe(async (req, res) => {
    const row = await queryOne('SELECT * FROM advertisement_banners WHERE id = ?', [Number(req.params.id)]);
    if (row) removeUpload('adverts', row.banner_image);
    await execute('DELETE FROM advertisement_banners WHERE id = ?', [Number(req.params.id)]);
    await recordAudit(req, { action: 'advert.delete', entity: 'advert', entityId: req.params.id });
    res.json({ ok: true });
  })
);

adminRouter.post(
  '/api/admin/banners',
  requireAdmin,
  safe(async (req, res) => {
    const text = requireText(req.body?.banner_text, 'Banner text', { min: 2, max: 190 });
    const result = await execute('INSERT INTO banners (banner_text, created_at) VALUES (?,?)', [text, nowSql()]);
    await recordAudit(req, { action: 'banner.create', entity: 'banner', entityId: result.insertId, meta: { text } });
    res.json({ ok: true });
  })
);

adminRouter.delete(
  '/api/admin/banners/:id',
  requireAdmin,
  safe(async (req, res) => {
    await execute('DELETE FROM banners WHERE id = ?', [Number(req.params.id)]);
    await recordAudit(req, { action: 'banner.delete', entity: 'banner', entityId: req.params.id });
    res.json({ ok: true });
  })
);

const slideImage = uploader('images', 'image');
adminRouter.post(
  '/api/admin/slides',
  requireAdmin,
  slideImage.single('image'),
  safe(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Choose an image to upload.');
    const result = await execute('INSERT INTO slider_images (image, created_at) VALUES (?,?)', [req.file.filename, nowSql()]);
    await recordAudit(req, { action: 'slide.create', entity: 'slide', entityId: result.insertId });
    res.json({ ok: true, id: result.insertId });
  })
);

adminRouter.delete(
  '/api/admin/slides/:id',
  requireAdmin,
  safe(async (req, res) => {
    const row = await queryOne('SELECT * FROM slider_images WHERE id = ?', [Number(req.params.id)]);
    if (row) removeUpload('images', row.image);
    await execute('DELETE FROM slider_images WHERE id = ?', [Number(req.params.id)]);
    await recordAudit(req, { action: 'slide.delete', entity: 'slide', entityId: req.params.id });
    res.json({ ok: true });
  })
);

const videoUpload = uploader('videos', 'video');
adminRouter.post(
  '/api/admin/videos',
  requireAdmin,
  videoUpload.single('video'),
  safe(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Choose a video to upload.');
    const result = await execute('INSERT INTO advertisement_videos (video_name, created_at) VALUES (?,?)', [req.file.filename, nowSql()]);
    await recordAudit(req, { action: 'video.create', entity: 'video', entityId: result.insertId, meta: { name: req.file.filename } });
    res.json({ ok: true, id: result.insertId });
  })
);

adminRouter.delete(
  '/api/admin/videos/:id',
  requireAdmin,
  safe(async (req, res) => {
    const row = await queryOne('SELECT * FROM advertisement_videos WHERE id = ?', [Number(req.params.id)]);
    if (row) {
      removeUpload('videos', row.video_name);
      await execute('DELETE FROM advertisement_videos WHERE id = ?', [Number(req.params.id)]);
    }
    await recordAudit(req, { action: 'video.delete', entity: 'video', entityId: req.params.id });
    res.json({ ok: true });
  })
);

const communityUpload = uploader('community', 'any');
adminRouter.post(
  '/api/admin/community',
  requireAdmin,
  communityUpload.single('media'),
  safe(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Choose a photo or video to upload.');
    const type = oneOf(req.body?.media_type ?? 'image', ['image', 'video'] as const, 'Media type');
    const result = await execute('INSERT INTO community_media (media_type, file_name, created_at) VALUES (?,?,?)', [type, req.file.filename, nowSql()]);
    await recordAudit(req, { action: 'community.create', entity: 'community', entityId: result.insertId });
    res.json({ ok: true, id: result.insertId });
  })
);

adminRouter.delete(
  '/api/admin/community/:id',
  requireAdmin,
  safe(async (req, res) => {
    const row = await queryOne('SELECT * FROM community_media WHERE id = ?', [Number(req.params.id)]);
    if (row) {
      removeUpload('community', row.file_name);
      await execute('DELETE FROM community_media WHERE id = ?', [Number(req.params.id)]);
    }
    await recordAudit(req, { action: 'community.delete', entity: 'community', entityId: req.params.id });
    res.json({ ok: true });
  })
);

/* ==================================================================
   Ratings / bookings / messages / applications
================================================================== */
adminRouter.get(
  '/api/admin/ratings',
  requireAdmin,
  safe(async (_req, res) => {
    const rows = await query('SELECT * FROM ratings ORDER BY id DESC');
    const total = await queryOne('SELECT COUNT(*) AS c FROM ratings');
    const avg = await queryOne('SELECT AVG(rating) AS avg_rating FROM ratings');
    const highest = await queryOne('SELECT MAX(rating) AS highest_rating FROM ratings');
    res.json({
      ok: true,
      ratings: rows,
      total_reviews: Number(total?.c || 0),
      avg_rating: Number(avg?.avg_rating || 0),
      highest_rating: Number(highest?.highest_rating || 0),
    });
  })
);

adminRouter.put(
  '/api/admin/ratings/:id/reply',
  requireAdmin,
  safe(async (req, res) => {
    const reply = requireText(req.body?.reply, 'Reply', { min: 2, max: 600 });
    await execute('UPDATE ratings SET reply = ? WHERE id = ?', [reply, Number(req.params.id)]);
    await recordAudit(req, { action: 'rating.reply', entity: 'rating', entityId: req.params.id });
    res.json({ ok: true });
  })
);

adminRouter.delete(
  '/api/admin/ratings/:id',
  requireAdmin,
  safe(async (req, res) => {
    await execute('DELETE FROM ratings WHERE id = ?', [Number(req.params.id)]);
    await recordAudit(req, { action: 'rating.delete', entity: 'rating', entityId: req.params.id });
    res.json({ ok: true });
  })
);

adminRouter.get(
  '/api/admin/catering-bookings',
  requireAdmin,
  safe(async (_req, res) => {
    res.json({ ok: true, bookings: await query('SELECT * FROM catering_bookings ORDER BY id DESC') });
  })
);

adminRouter.put(
  '/api/admin/catering-bookings/:id',
  requireAdmin,
  safe(async (req, res) => {
    const status = oneOf(req.body?.status, ['New', 'Contacted', 'Confirmed', 'Completed', 'Cancelled'] as const, 'Status');
    await execute('UPDATE catering_bookings SET status = ? WHERE id = ?', [status, Number(req.params.id)]);
    await recordAudit(req, { action: 'booking.status', entity: 'booking', entityId: req.params.id, meta: { status } });
    res.json({ ok: true });
  })
);

adminRouter.delete(
  '/api/admin/catering-bookings/:id',
  requireAdmin,
  safe(async (req, res) => {
    await execute('DELETE FROM catering_bookings WHERE id = ?', [Number(req.params.id)]);
    await recordAudit(req, { action: 'booking.delete', entity: 'booking', entityId: req.params.id });
    res.json({ ok: true });
  })
);

adminRouter.get(
  '/api/admin/contact-messages',
  requireAdmin,
  requireSuper,
  safe(async (_req, res) => {
    const rows = await query('SELECT * FROM contact_messages ORDER BY id DESC');
    await execute("UPDATE contact_messages SET notification_status = 'seen' WHERE notification_status = 'new'");
    res.json({ ok: true, messages: rows });
  })
);

adminRouter.put(
  '/api/admin/contact-messages/:id',
  requireAdmin,
  requireSuper,
  safe(async (req, res) => {
    const status = oneOf(req.body?.status, ['New', 'Read', 'Replied', 'Closed'] as const, 'Status');
    await execute('UPDATE contact_messages SET status = ? WHERE id = ?', [status, Number(req.params.id)]);
    res.json({ ok: true });
  })
);

adminRouter.delete(
  '/api/admin/contact-messages/:id',
  requireAdmin,
  requireSuper,
  safe(async (req, res) => {
    await execute('DELETE FROM contact_messages WHERE id = ?', [Number(req.params.id)]);
    await recordAudit(req, { action: 'message.delete', entity: 'message', entityId: req.params.id });
    res.json({ ok: true });
  })
);

adminRouter.get(
  '/api/admin/training-applications',
  requireAdmin,
  safe(async (_req, res) => {
    const rows = await query('SELECT * FROM training_applications ORDER BY id DESC');
    await execute("UPDATE training_applications SET notification_status = 'seen' WHERE notification_status = 'new'");
    res.json({ ok: true, applications: rows });
  })
);

adminRouter.put(
  '/api/admin/training-applications/:id',
  requireAdmin,
  safe(async (req, res) => {
    const status = oneOf(req.body?.status, ['New', 'Reviewing', 'Accepted', 'Declined'] as const, 'Status');
    await execute('UPDATE training_applications SET status = ? WHERE id = ?', [status, Number(req.params.id)]);
    await recordAudit(req, { action: 'application.status', entity: 'application', entityId: req.params.id, meta: { status } });
    res.json({ ok: true });
  })
);

adminRouter.delete(
  '/api/admin/training-applications/:id',
  requireAdmin,
  safe(async (req, res) => {
    await execute('DELETE FROM training_applications WHERE id = ?', [Number(req.params.id)]);
    await recordAudit(req, { action: 'application.delete', entity: 'application', entityId: req.params.id });
    res.json({ ok: true });
  })
);

/* ==================================================================
   Settings + admin accounts
================================================================== */
adminRouter.get(
  '/api/admin/settings',
  requireAdmin,
  safe(async (_req, res) => {
    const row = await queryOne('SELECT * FROM website_settings WHERE id = 1');
    res.json({ ok: true, settings: row || null, gateway: await paystackStatus() });
  })
);

adminRouter.put(
  '/api/admin/settings',
  requireAdmin,
  requireSuper,
  safe(async (req, res) => {
    const email = requireText(req.body?.email, 'Email', { min: 5, max: 190 });
    const adabraka = optionalPhone(req.body?.adabraka_phone, 'Adabraka phone');
    const dzorwulu = optionalPhone(req.body?.dzorwulu_phone, 'Dzorwulu phone');
    if (!adabraka || !dzorwulu) throw new HttpError(400, 'Both outlet phone numbers are required.');
    const deliveryFee = requireMoney(req.body?.delivery_fee ?? 0, 'Delivery fee', { min: 0, max: 500 });
    const freeOver = requireMoney(req.body?.free_delivery_over ?? 0, 'Free delivery threshold', { min: 0, max: 5000 });
    const paystackEnabledFlag = req.body?.paystack_enabled === undefined ? 1 : req.body.paystack_enabled ? 1 : 0;
    await execute(
      `UPDATE website_settings SET email = ?, adabraka_phone = ?, dzorwulu_phone = ?, facebook_link = ?, tiktok_link = ?, opening_hours = ?,
        delivery_fee = ?, free_delivery_over = ?, paystack_enabled = ? WHERE id = 1`,
      [
        email,
        adabraka,
        dzorwulu,
        clean(req.body?.facebook_link, 300),
        clean(req.body?.tiktok_link, 300),
        clean(req.body?.opening_hours, 190),
        deliveryFee,
        freeOver,
        paystackEnabledFlag,
      ]
    );
    await recordAudit(req, { action: 'settings.update', entity: 'settings', meta: { deliveryFee, freeOver, paystackEnabledFlag } });
    res.json({ ok: true, message: 'Settings Updated Successfully' });
  })
);

adminRouter.get(
  '/api/admin/admins',
  requireAdmin,
  requireSuper,
  safe(async (_req, res) => {
    res.json({ ok: true, admins: await query('SELECT id, admin_name, username, role, created_at FROM admins ORDER BY id ASC') });
  })
);

adminRouter.post(
  '/api/admin/admins',
  requireAdmin,
  requireSuper,
  rateLimit({ windowMs: 60 * 60_000, max: 20, keyPrefix: 'newadmin' }),
  safe(async (req, res) => {
    const admin_name = requireText(req.body?.admin_name, 'Full name', { min: 2, max: 120 });
    const username = clean(req.body?.username, 60).toLowerCase();
    if (!/^[a-z0-9._-]{3,60}$/.test(username)) throw new HttpError(400, 'Username must be 3-60 characters (letters, numbers, dot, dash, underscore).');
    const password = String(req.body?.password || '');
    const problem = passwordProblem(password);
    if (problem) throw new HttpError(400, problem);
    const role = oneOf(req.body?.role, ['super_admin', 'adabraka_admin', 'dzorwulu_admin'] as const, 'Role');
    const exists = await queryOne('SELECT id FROM admins WHERE username = ?', [username]);
    if (exists) throw new HttpError(409, 'That username is taken.');
    const result = await execute('INSERT INTO admins (admin_name, username, password, role, created_at) VALUES (?,?,?,?,?)', [
      admin_name,
      username,
      hashPassword(password),
      role,
      nowSql(),
    ]);
    await recordAudit(req, { action: 'admin.create', entity: 'admin', entityId: result.insertId, meta: { username, role } });
    res.json({ ok: true, id: result.insertId });
  })
);

adminRouter.put(
  '/api/admin/admins/:id/password',
  requireAdmin,
  requireSuper,
  safe(async (req, res) => {
    const id = Number(req.params.id);
    const admin = await queryOne('SELECT * FROM admins WHERE id = ?', [id]);
    if (!admin) throw new HttpError(404, 'Admin not found.');
    const newPassword = String(req.body?.new_password || '');
    const problem = passwordProblem(newPassword);
    if (problem) throw new HttpError(400, problem);
    // A super admin may reset any account; others must know the current password.
    if (id !== Number(req.session?.admin_id)) {
      const current = String(req.body?.current_password || '');
      if (!verifyPassword(String(admin.password), current)) throw new HttpError(401, 'Current password is incorrect.');
    }
    await execute('UPDATE admins SET password = ? WHERE id = ?', [hashPassword(newPassword), id]);
    await recordAudit(req, { action: 'admin.password_change', entity: 'admin', entityId: id });
    res.json({ ok: true });
  })
);

adminRouter.delete(
  '/api/admin/admins/:id',
  requireAdmin,
  requireSuper,
  safe(async (req, res) => {
    const id = Number(req.params.id);
    if (id === Number(req.session?.admin_id)) throw new HttpError(400, 'You cannot delete your own account.');
    const admins = await query('SELECT id, role FROM admins');
    if (admins.filter((a) => String(a.role) === 'super_admin').length <= 1 && String((await queryOne('SELECT role FROM admins WHERE id = ?', [id]))?.role) === 'super_admin') {
      throw new HttpError(400, 'At least one super admin must remain.');
    }
    await execute('DELETE FROM admins WHERE id = ?', [id]);
    await recordAudit(req, { action: 'admin.delete', entity: 'admin', entityId: id });
    res.json({ ok: true });
  })
);
