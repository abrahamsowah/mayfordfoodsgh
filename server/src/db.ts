/**
 * Database layer for Mayford Foods GH.
 *
 * Primary driver : MySQL / MariaDB (mysql2)  -> schema in /sql/mayfordfoodsgh.sql
 * Fallback driver: SQLite (node:sqlite)      -> automatic "demo mode"
 *
 * All queries use `?` placeholders so the same SQL works on both engines.
 * Schema changes are applied idempotently (CREATE TABLE IF NOT EXISTS +
 * guarded ALTER TABLE) so an existing production database is upgraded in
 * place without manual SQL.
 */
import path from 'path';
import fs from 'fs';
import mysql from 'mysql2/promise';
import { DatabaseSync } from 'node:sqlite';

export type Row = Record<string, any>;
export type Result = { insertId: number; affectedRows: number };

let mysqlPool: mysql.Pool | null = null;
let sqlite: DatabaseSync | null = null;
export let usingSqlite = false;

export function dbMode(): 'mysql' | 'sqlite' {
  return usingSqlite ? 'sqlite' : 'mysql';
}

/** 'YYYY-MM-DD HH:MM:SS' (local time) – matches what MySQL returns for TIMESTAMP */
export function nowSql(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/* ==================================================================
   SCHEMA — demo/SQLite mirror of sql/mayfordfoodsgh.sql
================================================================== */
const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_name TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  banner_text TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS catering_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date TEXT NOT NULL,
  guest_count INTEGER NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS community_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  media_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'New',
  notification_status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS menu_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  food_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  price REAL NOT NULL,
  image TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  discount_percent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_code TEXT,
  customer_id INTEGER,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  food_item TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  outlet TEXT NOT NULL,
  order_type TEXT NOT NULL,
  address TEXT,
  order_details TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  delivery_fee REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_reference TEXT,
  paid_at TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  cancel_reason TEXT,
  courier_name TEXT,
  courier_phone TEXT,
  eta_minutes INTEGER,
  notification_status TEXT NOT NULL DEFAULT 'new',
  order_date TEXT NOT NULL,
  updated_at TEXT,
  tracking_token TEXT
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  menu_item_id INTEGER,
  food_name TEXT NOT NULL,
  unit_price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  line_total REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  actor TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  provider TEXT NOT NULL DEFAULT 'paystack',
  reference TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  channel TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_payload TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  marketing_opt_in INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  last_login_at TEXT
);
CREATE TABLE IF NOT EXISTS customer_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  label TEXT NOT NULL DEFAULT 'Home',
  address TEXT NOT NULL,
  landmark TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_type TEXT NOT NULL,
  actor_id INTEGER,
  actor_name TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  meta TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL,
  identifier TEXT,
  ip TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL DEFAULT 'email',
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  related_type TEXT,
  related_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT
);
CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  referrer TEXT,
  source TEXT,
  device TEXT,
  session_key TEXT,
  customer_id INTEGER,
  ip_hash TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone TEXT,
  service_type TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  reply TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS slider_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS training_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  training_school TEXT NOT NULL,
  program TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'New',
  notification_status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS advertisement_banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  banner_image TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  button_text TEXT NOT NULL,
  button_link TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS advertisement_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS visitor_counter (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  total_visitors INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS website_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  adabraka_phone TEXT NOT NULL,
  dzorwulu_phone TEXT NOT NULL,
  facebook_link TEXT NOT NULL,
  tiktok_link TEXT NOT NULL,
  opening_hours TEXT NOT NULL,
  delivery_fee REAL NOT NULL DEFAULT 0,
  free_delivery_over REAL NOT NULL DEFAULT 0,
  paystack_enabled INTEGER NOT NULL DEFAULT 1
);
`;

/**
 * Columns added after the original PHP schema shipped. Applied idempotently so
 * an existing database upgrades without manual intervention.
 */
const COLUMN_MIGRATIONS: { table: string; column: string; ddl: string }[] = [
  { table: 'orders', column: 'order_code', ddl: 'TEXT' },
  { table: 'orders', column: 'customer_id', ddl: 'INTEGER' },
  { table: 'orders', column: 'email', ddl: 'TEXT' },
  { table: 'orders', column: 'subtotal', ddl: 'REAL NOT NULL DEFAULT 0' },
  { table: 'orders', column: 'delivery_fee', ddl: 'REAL NOT NULL DEFAULT 0' },
  { table: 'orders', column: 'payment_method', ddl: "TEXT NOT NULL DEFAULT 'cash'" },
  { table: 'orders', column: 'payment_status', ddl: "TEXT NOT NULL DEFAULT 'unpaid'" },
  { table: 'orders', column: 'payment_reference', ddl: 'TEXT' },
  { table: 'orders', column: 'paid_at', ddl: 'TEXT' },
  { table: 'orders', column: 'cancel_reason', ddl: 'TEXT' },
  { table: 'orders', column: 'courier_name', ddl: 'TEXT' },
  { table: 'orders', column: 'courier_phone', ddl: 'TEXT' },
  { table: 'orders', column: 'eta_minutes', ddl: 'INTEGER' },
  { table: 'orders', column: 'updated_at', ddl: 'TEXT' },
  { table: 'orders', column: 'tracking_token', ddl: 'TEXT' },
  { table: 'contact_messages', column: 'status', ddl: "TEXT NOT NULL DEFAULT 'New'" },
  { table: 'catering_bookings', column: 'status', ddl: "TEXT NOT NULL DEFAULT 'New'" },
  { table: 'training_applications', column: 'status', ddl: "TEXT NOT NULL DEFAULT 'New'" },
  { table: 'ratings', column: 'reply', ddl: 'TEXT' },
  { table: 'website_settings', column: 'delivery_fee', ddl: 'REAL NOT NULL DEFAULT 0' },
  { table: 'website_settings', column: 'free_delivery_over', ddl: 'REAL NOT NULL DEFAULT 0' },
  { table: 'website_settings', column: 'paystack_enabled', ddl: 'INTEGER NOT NULL DEFAULT 1' },
];

export async function runMigrations(): Promise<void> {
  for (const m of COLUMN_MIGRATIONS) {
    try {
      await execute(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.ddl}`, []);
    } catch (err) {
      const message = String((err as Error).message || '');
      // Duplicate column = already migrated; anything else is worth logging.
      if (!/duplicate|already exists|exists/i.test(message)) {
        console.warn(`[db] migration skipped (${m.table}.${m.column}): ${message.split('\n')[0]}`);
      }
    }
  }
  // Indexes that matter for a busy storefront.
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_orders_code ON orders (order_code)',
    'CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_orders_date ON orders (order_date)',
    'CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders (tracking_token)',
    'CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id)',
    'CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events (order_id)',
    'CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments (reference)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email ON customers (email)',
    'CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views (created_at)',
    'CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications (status)',
  ];
  for (const sql of indexes) {
    try {
      await execute(sql, []);
    } catch (err) {
      // MySQL has no CREATE INDEX IF NOT EXISTS on older versions.
      const message = String((err as Error).message || '');
      if (!/duplicate|exists/i.test(message)) console.warn(`[db] index skipped: ${message.split('\n')[0]}`);
    }
  }
}

/* ==================================================================
   Seed data (demo mode only)
================================================================== */
type Seed = { sql: string; rows: any[][] };

function sqliteSeeds(ts: string): Seed[] {
  return [
    {
      sql: 'INSERT INTO admins (admin_name, username, password, role, created_at) VALUES (?,?,?,?,?)',
      rows: [
        // Passwords are auto-hashed (scrypt) on first boot — see hashLegacyPasswords().
        ['Mayford Main Admin', 'mainadmin', '123456', 'super_admin', ts],
        ['Adabraka Admin', 'adabraka', '123456', 'adabraka_admin', ts],
        ['Dzorwulu Admin', 'dzorwulu', '123456', 'dzorwulu_admin', ts],
      ],
    },
    {
      sql: 'INSERT INTO banners (banner_text, created_at) VALUES (?,?)',
      rows: [
        ['Available on Bolt Food', ts],
        ['Outside Catering Available', ts],
        ['Open Monday - Sunday 9:00 AM - 9:30 PM', ts],
        ['Community Outreach Programs', ts],
        ['Training Program Available', ts],
      ],
    },
    {
      sql: 'INSERT INTO menu_categories (category_name, created_at) VALUES (?,?)',
      rows: [['Rice Dishes', ts], ['Local Dishes', ts], ['Soups', ts], ['Drinks', ts], ['Snacks', ts], ['Breakfast', ts]],
    },
    {
      sql: 'INSERT INTO menu_items (food_name, category, description, price, image, status, discount_percent, created_at) VALUES (?,?,?,?,?,?,?,?)',
      rows: [
        ['Jollof with Chicken', 'Rice Dishes', 'Smoky party jollof served with grilled chicken and shito.', 80.0, 'Jollof.png', 'available', 0, ts],
        ['Banku with Okro', 'Local Dishes', 'Freshly prepared banku with okro stew and tilapia.', 45.0, 'bankuokro.jpeg', 'available', 0, ts],
        ['Fufu with Light Soup', 'Soups', 'Pounded cassava and plantain with goat light soup.', 55.0, 'fufu.jpeg', 'available', 0, ts],
        ['Apapransa', 'Local Dishes', 'Corn dough steamed with palm nut soup and fish.', 45.0, 'apapransa.jpg', 'available', 0, ts],
        ['Oil Rice with Chicken', 'Rice Dishes', 'Ghanaian oil rice with grilled chicken and boiled egg.', 70.0, 'oilrice.jpg', 'available', 0, ts],
        ['Rice Ball with Palava', 'Local Dishes', 'Soft rice balls with rich palava sauce.', 40.0, 'riceball.jpg', 'available', 0, ts],
        ['Rice with Palava Sauce', 'Local Dishes', 'Steamed rice with cocoyam leaf palava sauce.', 40.0, 'ricepalava.jpg', 'available', 0, ts],
        ['Rice with Stew', 'Rice Dishes', 'Long grain rice with rich tomato stew and chicken.', 60.0, 'ricestew.webp', 'available', 0, ts],
        ['Boiled Yam with Palava', 'Local Dishes', 'Boiled yam served with palava sauce.', 35.0, 'boiledyam.jpg', 'available', 0, ts],
        ['Fried Yam with Shito', 'Snacks', 'Golden fried yam with pepper sauce.', 30.0, 'friedyam.jpg', 'available', 0, ts],
        ['Plantain with Palava', 'Local Dishes', 'Ripe fried plantain with palava sauce.', 30.0, 'plantainpalava.jpeg', 'available', 0, ts],
        ['Samosa (5 pieces)', 'Snacks', 'Crisp beef samosas fried to order.', 25.0, 'samosa.jpg', 'available', 0, ts],
      ],
    },
    {
      sql: 'INSERT INTO slider_images (image, created_at) VALUES (?,?)',
      rows: [['hero.png', ts], ['hero2.png', ts], ['community1.png', ts], ['hero3.png', ts], ['outsidecater4.jpeg', ts]],
    },
    {
      sql: 'INSERT INTO advertisement_banners (banner_image, title, description, button_text, button_link, status, created_at) VALUES (?,?,?,?,?,?,?)',
      rows: [
        [
          'Jollof.png',
          'Fresh Jollof Special',
          'Enjoy our signature smoky party jollof served with grilled chicken. Order today!',
          'Order Now',
          '/menu',
          'Active',
          ts,
        ],
        ['riceball.jpg', 'Riceball Deal', 'Quick, tasty and affordable riceballs prepared fresh every day.', 'View Menu', '/menu', 'Active', ts],
      ],
    },
    { sql: 'INSERT INTO advertisement_videos (video_name, created_at) VALUES (?,?)', rows: [['video.mp4', ts]] },
    { sql: 'INSERT INTO visitor_counter (total_visitors) VALUES (?)', rows: [[1000]] },
    {
      sql: 'INSERT INTO website_settings (email, adabraka_phone, dzorwulu_phone, facebook_link, tiktok_link, opening_hours, delivery_fee, free_delivery_over, paystack_enabled) VALUES (?,?,?,?,?,?,?,?,?)',
      rows: [
        [
          'mayfordfoods@gmail.com',
          '0244143271',
          '0533634378',
          'https://www.facebook.com/share/1PDFLKArpt/',
          'https://www.tiktok.com/@maryafuahboakye?_r=1&_t=ZS-97IIPfQ9uRo',
          'Monday - Sunday 9:00 AM - 9:30 PM',
          15,
          150,
          1,
        ],
      ],
    },
    {
      // Demo login: ama@example.com / Passw0rd!23 — hashed on first boot (legacy pass-through).
      sql: 'INSERT INTO customers (full_name, email, phone, password_hash, marketing_opt_in, status, created_at) VALUES (?,?,?,?,?,?,?)',
      rows: [
        ['Ama Mensah', 'ama@example.com', '0244000111', 'Passw0rd!23', 1, 'active', day(6)],
        ['Kwame Boateng', 'kwame@example.com', '0209887766', 'Passw0rd!23', 0, 'active', day(4)],
      ],
    },
    {
      sql: 'INSERT INTO ratings (customer_name, phone, service_type, rating, comment, reply, created_at) VALUES (?,?,?,?,?,?,?)',
      rows: [
        ['Ama Mensah', '0244000111', 'Delivery', 5, 'The jollof arrived hot and the rider called ahead. Excellent.', 'Thank you, Ama — see you again soon!', day(5)],
        ['Yaw Owusu', '0245888000', 'Pickup', 4, 'Great taste, packaging could be neater.', null, day(3)],
        ['Joana Asante', '0551230000', 'Catering', 5, 'They catered our office lunch for 40 people, on time and well presented.', null, day(2)],
        ['Kofi Adjei', '0271234567', 'Delivery', 5, 'Banku and okro tasted like home.', null, day(1)],
      ],
    },
    {
      sql: `INSERT INTO orders
              (order_code, customer_id, customer_name, phone, email, food_item, quantity, outlet, order_type, address,
               order_details, subtotal, delivery_fee, total, payment_method, payment_status, payment_reference, paid_at,
               status, cancel_reason, courier_name, courier_phone, eta_minutes, order_date, updated_at, tracking_token)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      rows: [
        ['MF-DEMO0001', 1, 'Ama Mensah', '0244000111', 'ama@example.com', 'Jollof with Chicken', 2, 'Adabraka', 'Delivery',
          '12 Ring Road, Adabraka', 'Extra shito please', 160, 15, 175, 'paystack', 'paid', 'DEMO-PAY-0001', day(5),
          'Completed', null, 'Yaw Antwi', '0240000001', 30, day(5), day(5), 'demo-token-0001'],
        ['MF-DEMO0002', 2, 'Kwame Boateng', '0209887766', 'kwame@example.com', 'Fufu with Light Soup', 3, 'Dzorwulu', 'Delivery',
          '5 Liberation Road, Dzorwulu', null, 165, 15, 180, 'paystack', 'paid', 'DEMO-PAY-0002', day(4),
          'Completed', null, 'Kofi Mensah', '0240000002', 25, day(4), day(4), 'demo-token-0002'],
        ['MF-DEMO0003', 1, 'Ama Mensah', '0244000111', 'ama@example.com', 'Oil Rice with Chicken', 1, 'Adabraka', 'Pickup',
          null, null, 70, 0, 70, 'cash', 'paid', null, day(3),
          'Completed', null, null, null, null, day(3), day(3), 'demo-token-0003'],
        ['MF-DEMO0004', null, 'Joana Asante', '0551230000', null, 'Samosa (5 pieces)', 8, 'Adabraka', 'Delivery',
          'Airport City, Accra', 'Office lunch order', 200, 15, 215, 'paystack', 'paid', 'DEMO-PAY-0004', day(2),
          'Completed', null, 'Yaw Antwi', '0240000001', 40, day(2), day(2), 'demo-token-0004'],
        ['MF-DEMO0005', 2, 'Kwame Boateng', '0209887766', 'kwame@example.com', 'Banku with Okro', 2, 'Dzorwulu', 'Delivery',
          '5 Liberation Road, Dzorwulu', null, 90, 15, 105, 'paystack', 'unpaid', 'DEMO-PAY-0005', null,
          'Out for delivery', null, 'Kofi Mensah', '0240000002', 18, day(0), day(0), 'demo-token-0005'],
        ['MF-DEMO0006', 1, 'Ama Mensah', '0244000111', 'ama@example.com', 'Rice with Stew', 1, 'Adabraka', 'Pickup',
          null, null, 60, 0, 60, 'cash', 'unpaid', null, null,
          'Ready', null, null, null, null, day(0), day(0), 'demo-token-0006'],
        ['MF-DEMO0007', null, 'Kofi Adjei', '0271234567', null, 'Rice Ball with Palava', 2, 'Adabraka', 'Delivery',
          'Osu, Accra', 'No pepper', 80, 15, 95, 'paystack', 'unpaid', 'DEMO-PAY-0007', null,
          'Pending', null, null, null, null, day(0), day(0), 'demo-token-0007'],
        ['MF-DEMO0008', null, 'Akosua Frimpong', '0245555111', null, 'Fried Yam with Shito', 2, 'Dzorwulu', 'Delivery',
          'Spintex Road', null, 60, 15, 75, 'cash', 'unpaid', null, null,
          'Cancelled', 'Customer called to cancel — changed plans.', null, null, null, day(1), day(1), 'demo-token-0008'],
      ],
    },
    {
      sql: `INSERT INTO order_items (order_id, menu_item_id, food_name, unit_price, quantity, line_total)
            SELECT id, NULL, ?, ?, ?, ? FROM orders WHERE order_code = ?`,
      rows: [
        ['Jollof with Chicken', 80, 2, 160, 'MF-DEMO0001'],
        ['Fufu with Light Soup', 55, 3, 165, 'MF-DEMO0002'],
        ['Oil Rice with Chicken', 70, 1, 70, 'MF-DEMO0003'],
        ['Samosa (5 pieces)', 25, 8, 200, 'MF-DEMO0004'],
        ['Banku with Okro', 45, 2, 90, 'MF-DEMO0005'],
        ['Rice with Stew', 60, 1, 60, 'MF-DEMO0006'],
        ['Rice Ball with Palava', 40, 2, 80, 'MF-DEMO0007'],
        ['Fried Yam with Shito', 30, 2, 60, 'MF-DEMO0008'],
      ],
    },
    {
      sql: `INSERT INTO payments (order_id, provider, reference, amount, currency, channel, status, paid_at, created_at)
            SELECT id, 'paystack', ?, ?, 'GHS', ?, ?, ?, ? FROM orders WHERE order_code = ?`,
      rows: [
        ['DEMO-PAY-0001', 175, 'card', 'success', day(5), day(5), 'MF-DEMO0001'],
        ['DEMO-PAY-0002', 180, 'mobile_money', 'success', day(4), day(4), 'MF-DEMO0002'],
        ['DEMO-PAY-0004', 215, 'card', 'success', day(2), day(2), 'MF-DEMO0004'],
        ['DEMO-PAY-0005', 105, 'mobile_money', 'pending', null, day(0), 'MF-DEMO0005'],
        ['DEMO-PAY-0007', 95, 'card', 'pending', null, day(0), 'MF-DEMO0007'],
      ],
    },
    {
      // A week of traffic so the analytics screen has something real to chart.
      sql: 'INSERT INTO page_views (path, referrer, source, device, session_key, customer_id, ip_hash, created_at) VALUES (?,?,?,?,?,?,?,?)',
      rows: pageViewSeeds(),
    },
  ];
}

/** Local-midday timestamp N days back — keeps demo orders inside their calendar day. */
function day(daysAgo: number, hour = 12): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(hour)}:${p((daysAgo * 7) % 60)}:00`;
}

/** Deterministic pseudo-random traffic for the demo dashboard. */
function pageViewSeeds(): any[][] {
  const paths = ['/', '/menu', '/checkout', '/outlets', '/catering', '/about', '/contact', '/training'];
  const sources = ['direct', 'facebook', 'instagram', 'google', 'whatsapp'];
  const devices = ['mobile', 'mobile', 'mobile', 'desktop', 'tablet'];
  const rows: any[][] = [];
  for (let d = 6; d >= 0; d--) {
    const views = 6 + ((d * 5) % 9);
    for (let i = 0; i < views; i++) {
      const seed = d * 31 + i * 7;
      rows.push([
        paths[seed % paths.length],
        '',
        sources[seed % sources.length],
        devices[seed % devices.length],
        `demo-session-${d}-${seed % 5}`,
        null,
        null,
        day(d, 9 + (seed % 11)),
      ]);
    }
  }
  return rows;
}

function seedSqlite(db: DatabaseSync): void {
  const count = db.prepare('SELECT COUNT(*) AS c FROM admins').get() as { c: number };
  if (count.c > 0) return; // already seeded
  const ts = nowSql();
  for (const seed of sqliteSeeds(ts)) {
    for (const row of seed.rows) {
      db.prepare(seed.sql).run(...row);
    }
  }
}

async function tryConnectMysql(): Promise<boolean> {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'mayfordfoodsgh';
  try {
    const pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: 4000,
      dateStrings: true,
    });
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    mysqlPool = pool;
    return true;
  } catch (err) {
    if (mysqlPool) {
      await mysqlPool.end().catch(() => undefined);
      mysqlPool = null;
    }
    console.warn(`[db] MySQL not reachable (${host}:${port}/${database}): ${(err as Error).message.split('\n')[0]}`);
    return false;
  }
}

function initSqlite(): void {
  const dataDir = path.resolve(__dirname, '../data');
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'demo.sqlite');
  sqlite = new DatabaseSync(file);
  sqlite.exec('PRAGMA journal_mode = WAL');
  sqlite.exec('PRAGMA foreign_keys = ON');
  sqlite.exec(SQLITE_SCHEMA);
  seedSqlite(sqlite);
  usingSqlite = true;
  console.warn(`[db] Using SQLite DEMO MODE at ${file} (set DEMO_MODE=off for MySQL only).`);
}

export async function initDb(): Promise<void> {
  const mode = process.env.DEMO_MODE || 'auto';
  if (mode !== 'force') {
    if (await tryConnectMysql()) {
      await runMigrations();
      return;
    }
  }
  if (mode === 'off') {
    throw new Error('MySQL is required (DEMO_MODE=off) but could not be reached.');
  }
  initSqlite();
  await runMigrations();
}

/* ==================================================================
   Query helpers
================================================================== */
export async function query(sql: string, params: any[] = []): Promise<Row[]> {
  if (usingSqlite && sqlite) {
    return sqlite.prepare(sql).all(...params) as Row[];
  }
  if (!mysqlPool) throw new Error('Database not initialised');
  const [rows] = await mysqlPool.query(sql, params);
  return rows as Row[];
}

export async function execute(sql: string, params: any[] = []): Promise<Result> {
  if (usingSqlite && sqlite) {
    const r = sqlite.prepare(sql).run(...params);
    return { insertId: Number(r.lastInsertRowid), affectedRows: Number(r.changes) };
  }
  if (!mysqlPool) throw new Error('Database not initialised');
  const [result] = await mysqlPool.execute(sql, params);
  const r = result as mysql.ResultSetHeader;
  return { insertId: Number(r.insertId), affectedRows: r.affectedRows };
}

export async function queryOne(sql: string, params: any[] = []): Promise<Row | undefined> {
  const rows = await query(sql, params);
  return rows[0];
}

/**
 * Minimal transaction wrapper that works on both engines.
 * MySQL gets a dedicated connection so the statements really are atomic.
 */
export interface Tx {
  query: (sql: string, params?: any[]) => Promise<Row[]>;
  execute: (sql: string, params?: any[]) => Promise<Result>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

export async function beginTx(): Promise<Tx> {
  if (usingSqlite && sqlite) {
    sqlite.exec('BEGIN IMMEDIATE');
    let done = false;
    return {
      query: async (sql, params = []) => sqlite!.prepare(sql).all(...params) as Row[],
      execute: async (sql, params = []) => {
        const r = sqlite!.prepare(sql).run(...params);
        return { insertId: Number(r.lastInsertRowid), affectedRows: Number(r.changes) };
      },
      commit: async () => {
        if (!done) {
          done = true;
          sqlite!.exec('COMMIT');
        }
      },
      rollback: async () => {
        if (!done) {
          done = true;
          sqlite!.exec('ROLLBACK');
        }
      },
    };
  }
  if (!mysqlPool) throw new Error('Database not initialised');
  const conn = await mysqlPool.getConnection();
  await conn.beginTransaction();
  let done = false;
  return {
    query: async (sql, params = []) => {
      const [rows] = await conn.query(sql, params);
      return rows as Row[];
    },
    execute: async (sql, params = []) => {
      const [result] = await conn.execute(sql, params);
      const r = result as mysql.ResultSetHeader;
      return { insertId: Number(r.insertId), affectedRows: r.affectedRows };
    },
    commit: async () => {
      if (!done) {
        done = true;
        await conn.commit();
        conn.release();
      }
    },
    rollback: async () => {
      if (!done) {
        done = true;
        await conn.rollback();
        conn.release();
      }
    },
  };
}

/** Session store support (used by session-store.ts). */
export async function rawQuery(sql: string, params: any[] = []): Promise<Row[]> {
  return query(sql, params);
}
