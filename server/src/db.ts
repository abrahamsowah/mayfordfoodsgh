/**
 * Database layer for Mayford Foods GH.
 *
 * Primary driver : MySQL / MariaDB (mysql2)  -> use the schema in /sql/mayfordfoodsgh.sql
 * Fallback driver: SQLite (better-sqlite3)  -> automatic "demo mode" so the app runs
 *                immediately on a machine without MySQL. All queries use `?`
 *                placeholders so the exact same SQL strings work on both engines.
 *
 * Set DEMO_MODE=off to require MySQL (fails fast if it is unreachable).
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
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  food_item TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  outlet TEXT NOT NULL,
  order_type TEXT NOT NULL,
  address TEXT,
  order_details TEXT,
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  notification_status TEXT NOT NULL DEFAULT 'new',
  order_date TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone TEXT,
  service_type TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
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
  opening_hours TEXT NOT NULL
);
`;

type Seed = { sql: string; rows: any[][] };

function sqliteSeeds(ts: string): Seed[] {
  return [
    {
      sql: 'INSERT INTO admins (admin_name, username, password, role, created_at) VALUES (?,?,?,?,?)',
      rows: [
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
      rows: [
        ['Rice Dishes', ts],
        ['Local Dishes', ts],
        ['Soups', ts],
        ['Drinks', ts],
        ['Snacks', ts],
        ['Breakfast', ts],
      ],
    },
    {
      sql: 'INSERT INTO menu_items (food_name, category, description, price, image, status, discount_percent, created_at) VALUES (?,?,?,?,?,?,?,?)',
      rows: [
        ['Jollof', 'Rice Dishes', 'Jollof with Chicken', 80.0, 'Jollof.png', 'available', 0, ts],
        ['Banku', 'Local Dishes', 'Banku with Okro', 45.0, 'bankuokro.jpeg', 'available', 0, ts],
      ],
    },
    {
      sql: 'INSERT INTO slider_images (image, created_at) VALUES (?,?)',
      rows: [
        ['hero.png', ts],
        ['hero2.png', ts],
        ['community1.png', ts],
        ['hero3.png', ts],
        ['outsidecater4.jpeg', ts],
      ],
    },
    {
      sql: 'INSERT INTO advertisement_banners (banner_image, title, description, button_text, button_link, status, created_at) VALUES (?,?,?,?,?,?,?)',
      rows: [
        ['Jollof.png', 'Fresh Jollof Special', 'Enjoy our signature smoky party jollof served with grilled chicken. Order today!', 'Order Now', '/menu', 'Active', ts],
        ['riceball.jpg', 'Riceball Deal', 'Quick, tasty and affordable riceballs prepared fresh every day.', 'View Menu', '/menu', 'Active', ts],
      ],
    },
    {
      sql: 'INSERT INTO advertisement_videos (video_name, created_at) VALUES (?,?)',
      rows: [['video.mp4', ts]],
    },
    {
      sql: 'INSERT INTO visitor_counter (total_visitors) VALUES (?)',
      rows: [[1000]],
    },
    {
      sql: 'INSERT INTO website_settings (email, adabraka_phone, dzorwulu_phone, facebook_link, tiktok_link, opening_hours) VALUES (?,?,?,?,?,?)',
      rows: [
        ['mayfordfoods@gmail.com', '0244143271', '0533634378', 'https://www.facebook.com/share/1PDFLKArpt/', 'https://www.tiktok.com/@maryafuahboakye?_r=1&_t=ZS-97IIPfQ9uRo', 'Monday - Sunday 9:00 AM - 9:30 PM'],
      ],
    },
  ];
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
  // server/data/ both from dist/ (compiled) and src/ (tsx dev)
  const dataDir = path.resolve(__dirname, '../data');
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'demo.sqlite');
  sqlite = new DatabaseSync(file);
  sqlite.exec('PRAGMA journal_mode = WAL');
  sqlite.exec(SQLITE_SCHEMA);
  seedSqlite(sqlite);
  usingSqlite = true;
  console.warn(`[db] Using SQLite DEMO MODE at ${file} (data resets are NOT synced to MySQL).`);
}

export async function initDb(): Promise<void> {
  const mode = process.env.DEMO_MODE || 'auto';
  if (mode !== 'force') {
    if (await tryConnectMysql()) return;
  }
  if (mode === 'off') {
    throw new Error('MySQL is required (DEMO_MODE=off) but could not be reached.');
  }
  initSqlite();
}

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
