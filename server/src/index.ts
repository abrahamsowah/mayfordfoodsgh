/**
 * Mayford Foods GH — API server
 * Express + TypeScript + MySQL (with automatic SQLite demo fallback).
 * Replaces the original PHP endpoints one-to-one.
 */
import path from 'path';
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config(); // also honour server/.env
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import multer from 'multer';
import { initDb, query, execute, nowSql, dbMode } from './db';

// ---------------------------------------------------------------- config
const PORT = Number(process.env.PORT || 4000);
const PUBLIC_DIR = path.resolve(__dirname, '../../react/public');
const DIST_DIR = path.resolve(__dirname, '../../react/dist');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');

// ---------------------------------------------------------------- multer
const subDir = (dir: string) => {
  const dest = path.join(ASSETS_DIR, dir);
  fs.mkdirSync(dest, { recursive: true });
  return dest;
};
const multerUpload = (dir: string) =>
  multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, subDir(dir)),
      filename: (_req, file, cb) => cb(null, file.originalname),
    }),
    limits: { fileSize: 500 * 1024 * 1024 },
  });

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

/** The outlet a logged-in admin may see (super_admin sees all). */
const outletScope = (req: express.Request): { where: string; params: any[] } => {
  const role = req.session?.role;
  if (role === 'adabraka_admin') return { where: "outlet='Adabraka'", params: [] };
  if (role === 'dzorwulu_admin') return { where: "outlet='Dzorwulu'", params: [] };
  return { where: '1=1', params: [] };
};

// ---------------------------------------------------------------- app
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(
  session({
    name: 'mayford_sid',
    secret: process.env.SESSION_SECRET || 'mayford-foods-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 },
  })
);

// Static assets (images, videos, sounds + admin uploads)
app.use('/assets', express.static(ASSETS_DIR, { maxAge: '1h' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, db: dbMode() }));

// ================================================================ AUTH
// Admin PIN gate (original: admin-pin.php, PIN: mayford2026)
app.post('/api/auth/admin-pin', (req, res) => {
  const pin = String(req.body?.pin || '');
  if (pin === (process.env.ADMIN_PIN || 'mayford2026')) {
    req.session!.admin_access = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false, error: 'Invalid PIN' });
});

// Admin login (original: login.php — username/password from `admins`)
app.post('/api/auth/login', (req, res) => {
  if (!req.session?.admin_access) {
    return res.status(403).json({ ok: false, error: 'Admin PIN required', needPin: true });
  }
  const username = String(req.body?.username || '');
  const password = String(req.body?.password || '');
  query('SELECT * FROM admins WHERE username=? AND password=?', [username, password])
    .then((rows) => {
      if (rows.length === 0) {
        return res.status(401).json({ ok: false, error: 'Invalid Username or Password' });
      }
      const admin = rows[0];
      req.session!.admin_id = Number(admin.id);
      req.session!.admin_name = String(admin.admin_name);
      req.session!.role = String(admin.role);
      res.json({
        ok: true,
        admin: { id: Number(admin.id), name: admin.admin_name, role: admin.role },
      });
    })
    .catch((err) => res.status(500).json({ ok: false, error: String(err) }));
});

// Logout (original: logout.php)
app.post('/api/auth/logout', (req, res) => {
  req.session!.destroy(() => res.json({ ok: true }));
});

// Current session state
app.get('/api/auth/session', (req, res) => {
  res.json({
    admin_access: !!req.session?.admin_access,
    admin: req.session?.admin_id
      ? { id: req.session.admin_id, name: req.session.admin_name, role: req.session.role }
      : null,
  });
});

// ================================================================ PUBLIC
app.get('/api/settings', async (_req, res) => {
  try {
    const rows = await query('SELECT * FROM website_settings LIMIT 1');
    res.json({ ok: true, settings: rows[0] || null });
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

// Advertisement videos (home "Latest Advertisements")
app.get('/api/advertisement-videos', async (_req, res) => {
  const rows = await query('SELECT * FROM advertisement_videos ORDER BY id DESC');
  res.json({ ok: true, videos: rows });
});

// Community media (community page)
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
  const rows = await query('SELECT * FROM menu_items WHERE id=?', [Number(req.params.id)]);
  if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Food item not found' });
  res.json({ ok: true, item: rows[0] });
});

// Categories
app.get('/api/categories', async (req, res) => {
  const order = req.query.order === 'name' ? 'category_name' : 'id DESC';
  const rows = await query(`SELECT * FROM menu_categories ORDER BY ${order}`);
  res.json({ ok: true, categories: rows });
});

// Visitor counter (original: visitor_counter.php — 1 count per day per cookie)
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

// Create order (original: checkout.php + order.php)
app.post('/api/orders', async (req, res) => {
  const b = req.body || {};
  const result = await execute(
    `INSERT INTO orders
       (customer_name, phone, food_item, quantity, outlet, order_type, address, order_details, total, status, notification_status, order_date)
     VALUES (?,?,?,?,?,?,?,?,?, 'Pending', 'new', ?)`,
    [
      String(b.customer_name || ''),
      String(b.phone || ''),
      String(b.food_item || ''),
      Number(b.quantity || 0),
      String(b.outlet || ''),
      String(b.order_type || ''),
      b.address ? String(b.address) : null,
      b.order_details ? String(b.order_details) : null,
      Number(b.total || 0),
      nowSql(),
    ]
  );
  res.json({ ok: true, id: result.insertId });
});

// Feedback popup (original: save_feedback.php)
app.post('/api/feedback', async (req, res) => {
  const b = req.body || {};
  await execute(
    "INSERT INTO contact_messages (full_name, email, subject, message, notification_status, created_at) VALUES (?,?,?,?, 'new', ?)",
    [String(b.fullname || ''), String(b.phone || ''), String(b.type || ''), String(b.message || ''), nowSql()]
  );
  res.json({ ok: true });
});

// Rating popup (original: save_rating.php)
app.post('/api/ratings', async (req, res) => {
  const b = req.body || {};
  await execute(
    'INSERT INTO ratings (customer_name, phone, service_type, rating, comment, created_at) VALUES (?,?,?,?,?,?)',
    [
      String(b.customer_name || ''),
      b.phone ? String(b.phone) : null,
      String(b.service_type || ''),
      Number(b.rating || 0),
      b.comment ? String(b.comment) : null,
      nowSql(),
    ]
  );
  res.json({ ok: true });
});

// Catering booking (table existed before; form added in React app)
app.post('/api/catering-bookings', async (req, res) => {
  const b = req.body || {};
  const result = await execute(
    'INSERT INTO catering_bookings (customer_name, phone, event_type, event_date, guest_count, message, created_at) VALUES (?,?,?,?,?,?,?)',
    [
      String(b.customer_name || ''),
      String(b.phone || ''),
      String(b.event_type || ''),
      String(b.event_date || ''),
      Number(b.guest_count || 0),
      b.message ? String(b.message) : null,
      nowSql(),
    ]
  );
  res.json({ ok: true, id: result.insertId });
});

// Training application (original: save_training_application.php)
app.post('/api/training-applications', async (req, res) => {
  const b = req.body || {};
  const result = await execute(
    "INSERT INTO training_applications (full_name, phone, email, training_school, program, message, notification_status, created_at) VALUES (?,?,?,?,?,?, 'new', ?)",
    [
      String(b.full_name || ''),
      String(b.phone || ''),
      String(b.email || ''),
      String(b.training_school || ''),
      String(b.program || ''),
      b.message ? String(b.message) : null,
      nowSql(),
    ]
  );
  res.json({ ok: true, id: result.insertId });
});

// ================================================================ ADMIN
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  const role = req.session?.role;
  const { where, params } = outletScope(req);
  const revenueRow = (await query(`SELECT SUM(total) AS total_revenue FROM orders WHERE ${where}`, params))[0];
  const pending = (await query(`SELECT COUNT(*) AS c FROM orders WHERE ${where} AND status='Pending'`, params))[0].c;
  const completed = (await query(`SELECT COUNT(*) AS c FROM orders WHERE ${where} AND status='Completed'`, params))[0].c;
  const stats: Record<string, any> = {
    revenue: Number(revenueRow?.total_revenue || 0),
    pending_orders: Number(pending),
    completed_orders: Number(completed),
  };
  if (role === 'super_admin') {
    const catering = (await query('SELECT COUNT(*) AS c FROM catering_bookings'))[0].c;
    const messages = (await query('SELECT COUNT(*) AS c FROM contact_messages'))[0].c;
    const applications = (await query('SELECT COUNT(*) AS c FROM training_applications'))[0].c;
    const visitors = (await query('SELECT total_visitors FROM visitor_counter WHERE id = 1'))[0]?.total_visitors;
    Object.assign(stats, {
      catering_bookings: Number(catering),
      contact_messages: Number(messages),
      training_applications: Number(applications),
      total_visitors: Number(visitors || 0),
    });
  }
  res.json({ ok: true, role, stats });
});

// Notification polling (original: check-notifications.php)
app.get('/api/admin/notifications', requireAdmin, async (_req, res) => {
  const orders = (await query("SELECT COUNT(*) AS c FROM orders WHERE notification_status='new'"))[0].c;
  const applications = (await query("SELECT COUNT(*) AS c FROM training_applications WHERE notification_status='new'"))[0].c;
  const messages = (await query("SELECT COUNT(*) AS c FROM contact_messages WHERE notification_status='new'"))[0].c;
  res.json({ orders: Number(orders), applications: Number(applications), messages: Number(messages) });
});

// Orders (original: view-orders.php)
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  const { where, params } = outletScope(req);
  const search = String(req.query.search || '');
  const status = String(req.query.status || '');
  let sql = `SELECT * FROM orders WHERE ${where}`;
  if (search) {
    sql += ` AND (customer_name LIKE ? OR phone LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    sql += ' AND status=?';
    params.push(status);
  }
  sql += ' ORDER BY id DESC';
  const rows = await query(sql, params);
  await execute("UPDATE orders SET notification_status='seen' WHERE notification_status='new'");
  res.json({ ok: true, orders: rows });
});

// Update order status (original: update-status.php)
app.put('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
  const status = String(req.body?.status || '');
  if (!['Pending', 'Preparing', 'Ready', 'Completed'].includes(status)) {
    return res.status(400).json({ ok: false, error: 'Invalid status' });
  }
  await execute('UPDATE orders SET status=? WHERE id=?', [status, Number(req.params.id)]);
  res.json({ ok: true });
});

// Reset revenue / truncate orders (original: reset-revenue.php — super admin only)
app.delete('/api/admin/orders', requireAdmin, requireSuper, async (_req, res) => {
  await execute('DELETE FROM orders');
  res.json({ ok: true });
});

// Menu items CRUD
app.post('/api/admin/menu', requireAdmin, multerUpload('images').single('image'), async (req, res) => {
  const b = req.body || {};
  const result = await execute(
    'INSERT INTO menu_items (food_name, category, description, price, image, status, discount_percent, created_at) VALUES (?,?,?,?,?,?,0,?)',
    [
      String(b.food_name || ''),
      String(b.category || ''),
      b.description ? String(b.description) : '',
      Number(b.price || 0),
      req.file ? req.file.originalname : '',
      b.status || 'available',
      nowSql(),
    ]
  );
  res.json({ ok: true, id: result.insertId });
});

app.put('/api/admin/menu/:id', requireAdmin, async (req, res) => {
  const b = req.body || {};
  await execute(
    'UPDATE menu_items SET food_name=?, category=?, description=?, price=?, status=? WHERE id=?',
    [
      String(b.food_name || ''),
      String(b.category || ''),
      String(b.description || ''),
      Number(b.price || 0),
      b.status || 'available',
      Number(req.params.id),
    ]
  );
  res.json({ ok: true });
});

app.delete('/api/admin/menu/:id', requireAdmin, async (req, res) => {
  await execute('DELETE FROM menu_items WHERE id=?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// Discounts (original: add-discount.php)
app.put('/api/admin/menu/:id/discount', requireAdmin, async (req, res) => {
  const discount = Number(req.body?.discount_percent || 0);
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
  await execute('UPDATE menu_categories SET category_name=? WHERE id=?', [
    String(req.body?.category_name || ''),
    Number(req.params.id),
  ]);
  res.json({ ok: true });
});

app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  await execute('DELETE FROM menu_categories WHERE id=?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// Adverts (original: add-advert.php / view-adverts.php / delete-advert.php)
app.post('/api/admin/adverts', requireAdmin, multerUpload('adverts').single('banner_image'), async (req, res) => {
  const b = req.body || {};
  const result = await execute(
    'INSERT INTO advertisement_banners (banner_image, title, description, button_text, button_link, status, created_at) VALUES (?,?,?,?,?,?,?)',
    [
      req.file ? req.file.originalname : '',
      String(b.title || ''),
      String(b.description || ''),
      String(b.button_text || ''),
      String(b.button_link || ''),
      b.status || 'Active',
      nowSql(),
    ]
  );
  res.json({ ok: true, id: result.insertId });
});

app.delete('/api/admin/adverts/:id', requireAdmin, async (req, res) => {
  await execute('DELETE FROM advertisement_banners WHERE id=?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// Banners (marquee)
app.post('/api/admin/banners', requireAdmin, async (req, res) => {
  await execute('INSERT INTO banners (banner_text, created_at) VALUES (?,?)', [
    String(req.body?.banner_text || ''),
    nowSql(),
  ]);
  res.json({ ok: true });
});

app.delete('/api/admin/banners/:id', requireAdmin, async (req, res) => {
  await execute('DELETE FROM banners WHERE id=?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// Hero slides
app.post('/api/admin/slides', requireAdmin, multerUpload('images').single('image'), async (req, res) => {
  const result = await execute('INSERT INTO slider_images (image, created_at) VALUES (?,?)', [
    req.file ? req.file.originalname : '',
    nowSql(),
  ]);
  res.json({ ok: true, id: result.insertId });
});

app.delete('/api/admin/slides/:id', requireAdmin, async (req, res) => {
  await execute('DELETE FROM slider_images WHERE id=?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// Advertisement videos
app.post('/api/admin/videos', requireAdmin, multerUpload('videos').single('video'), async (req, res) => {
  const result = await execute('INSERT INTO advertisement_videos (video_name, created_at) VALUES (?,?)', [
    req.file ? req.file.originalname : '',
    nowSql(),
  ]);
  res.json({ ok: true, id: result.insertId });
});

app.delete('/api/admin/videos/:id', requireAdmin, async (req, res) => {
  const rows = await query('SELECT * FROM advertisement_videos WHERE id=?', [Number(req.params.id)]);
  if (rows[0]) {
    const file = path.join(ASSETS_DIR, 'videos', String(rows[0].video_name));
    if (fs.existsSync(file)) fs.unlinkSync(file);
    await execute('DELETE FROM advertisement_videos WHERE id=?', [Number(req.params.id)]);
  }
  res.json({ ok: true });
});

// Community media
app.post('/api/admin/community', requireAdmin, multerUpload('community').single('media'), async (req, res) => {
  const result = await execute('INSERT INTO community_media (media_type, file_name, created_at) VALUES (?,?,?)', [
    req.body?.media_type || 'image',
    req.file ? req.file.originalname : '',
    nowSql(),
  ]);
  res.json({ ok: true, id: result.insertId });
});

app.delete('/api/admin/community/:id', requireAdmin, async (req, res) => {
  const rows = await query('SELECT * FROM community_media WHERE id=?', [Number(req.params.id)]);
  if (rows[0]) {
    const file = path.join(ASSETS_DIR, 'community', String(rows[0].file_name));
    if (fs.existsSync(file)) fs.unlinkSync(file);
    await execute('DELETE FROM community_media WHERE id=?', [Number(req.params.id)]);
  }
  res.json({ ok: true });
});

// Ratings (original: view-ratings.php / delete-rating.php)
// Latest public ratings for the "What customers say" section
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

// Catering bookings (original: view-catering-bookings.php)
app.get('/api/admin/catering-bookings', requireAdmin, async (_req, res) => {
  const rows = await query('SELECT * FROM catering_bookings ORDER BY id DESC');
  res.json({ ok: true, bookings: rows });
});

app.delete('/api/admin/catering-bookings/:id', requireAdmin, async (req, res) => {
  await execute('DELETE FROM catering_bookings WHERE id=?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// Contact messages (original: view-contact-messages.php — super admin only)
app.get('/api/admin/contact-messages', requireAdmin, requireSuper, async (_req, res) => {
  const rows = await query('SELECT * FROM contact_messages ORDER BY id DESC');
  await execute("UPDATE contact_messages SET notification_status='seen' WHERE notification_status='new'");
  res.json({ ok: true, messages: rows });
});

app.delete('/api/admin/contact-messages/:id', requireAdmin, requireSuper, async (req, res) => {
  await execute('DELETE FROM contact_messages WHERE id=?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// Training applications (original: view-training-applications.php)
app.get('/api/admin/training-applications', requireAdmin, async (_req, res) => {
  const rows = await query('SELECT * FROM training_applications ORDER BY id DESC');
  await execute("UPDATE training_applications SET notification_status='seen' WHERE notification_status='new'");
  res.json({ ok: true, applications: rows });
});

app.delete('/api/admin/training-applications/:id', requireAdmin, async (req, res) => {
  await execute('DELETE FROM training_applications WHERE id=?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// Website settings (original: settings.php)
app.get('/api/admin/settings', requireAdmin, async (_req, res) => {
  const rows = await query('SELECT * FROM website_settings WHERE id=1');
  res.json({ ok: true, settings: rows[0] || null });
});

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  const b = req.body || {};
  await execute(
    `UPDATE website_settings SET email=?, adabraka_phone=?, dzorwulu_phone=?, facebook_link=?, tiktok_link=?, opening_hours=? WHERE id=1`,
    [
      String(b.email || ''),
      String(b.adabraka_phone || ''),
      String(b.dzorwulu_phone || ''),
      String(b.facebook_link || ''),
      String(b.tiktok_link || ''),
      String(b.opening_hours || ''),
    ]
  );
  res.json({ ok: true, message: 'Settings Updated Successfully' });
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
