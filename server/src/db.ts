/**
 * Database layer for Mayford Foods GH.
 *
 * Supported engines:
 *   1. Supabase / PostgreSQL (pg)  -> Direct connection pool via SUPABASE_DB_URL or DATABASE_URL
 *   2. MySQL / MariaDB (mysql2)     -> Optional legacy fallback when SUPABASE_ONLY is unset
 *   3. SQLite (node:sqlite)         -> Optional demo fallback when SUPABASE_ONLY is unset
 */
import path from 'path';
import fs from 'fs';
import mysql from 'mysql2/promise';
import { Pool as PgPool } from 'pg';
import { DatabaseSync } from 'node:sqlite';

export type Row = Record<string, any>;
export type Result = { insertId: number; affectedRows: number };

let pgPool: PgPool | null = null;
let mysqlPool: mysql.Pool | null = null;
let sqlite: DatabaseSync | null = null;

export type ActiveDbMode = 'supabase' | 'postgres' | 'mysql' | 'sqlite';
export let activeMode: ActiveDbMode = 'sqlite';

export function dbMode(): ActiveDbMode {
  return activeMode;
}

/** 'YYYY-MM-DD HH:MM:SS' (local time) - standard SQL timestamp format */
export function nowSql(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function convertToPgSql(sql: string): string {
  let paramIndex = 1;
  // Replace ? with $1, $2, $3...
  let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
  // Replace MySQL/SQLite AUTO_INCREMENT / AUTOINCREMENT syntax if needed
  return pgSql;
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
CREATE TABLE IF NOT EXISTS admin_sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expire INTEGER NOT NULL
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
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  poster_url TEXT,
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
  customer_email TEXT,
  phone TEXT NOT NULL,
  food_item TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  outlet TEXT NOT NULL,
  order_type TEXT NOT NULL,
  order_source TEXT NOT NULL DEFAULT 'Online',
  address TEXT,
  order_details TEXT,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Paystack',
  payment_status TEXT NOT NULL DEFAULT 'Pending',
  payment_reference TEXT,
  delivery_zone TEXT,
  delivery_fee REAL NOT NULL DEFAULT 0,
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
CREATE TABLE IF NOT EXISTS advertisement_banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  banner_image TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  button_text TEXT NOT NULL,
  button_link TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS advertisement_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_name TEXT NOT NULL,
  poster_url TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS image_asset_metadata (
  object_key VARCHAR(191) PRIMARY KEY,
  public_url TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  color TEXT NOT NULL,
  variants_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS training_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_ref TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  training_school TEXT NOT NULL,
  program TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'New',
  admin_notes TEXT,
  email_sent INTEGER NOT NULL DEFAULT 1,
  confirmation_email_html TEXT,
  notification_status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS visitor_counter (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  total_visitors INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS website_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  adabraka_phone TEXT NOT NULL,
  dzorwulu_phone TEXT NOT NULL,
  facebook_link TEXT NOT NULL,
  tiktok_link TEXT NOT NULL,
  opening_hours TEXT NOT NULL,
  paystack_public_key TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS payment_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  payment_reference TEXT NOT NULL,
  event_type TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  channel TEXT,
  gateway TEXT NOT NULL DEFAULT 'Paystack',
  gateway_status TEXT,
  raw_payload TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL
);
`;

export type SeedEntry = { sql: string; rows: any[][] };

export function starterSeeds(ts: string): SeedEntry[] {
  const defaultAdminPass =
    'scrypt$a1b2c3d4e5f60718293a4b5c6d7e8f90$bf6bdd1693dc31289e14d0eca9d8dd21d9e5d6945a99a798b2bbd904873d4578962b2471595c04a15459dab8ff124511d0288e7e5d3c60b4a850d8211c4903db';
  return [
    {
      sql: 'INSERT INTO admins (admin_name, username, password, role, created_at) VALUES (?,?,?,?,?)',
      rows: [
        ['Mayford Main Admin', 'mainadmin', defaultAdminPass, 'super_admin', ts],
        ['Adabraka Admin', 'adabraka', defaultAdminPass, 'adabraka_admin', ts],
        ['Dzorwulu Admin', 'dzorwulu', defaultAdminPass, 'dzorwulu_admin', ts],
      ],
    },
    {
      sql: 'INSERT INTO banners (banner_text, created_at) VALUES (?,?)',
      rows: [
        ['Available on Bolt Food & Online Direct Ordering', ts],
        ['Outside Catering Available for Weddings & Corporate Events', ts],
        ['Open Monday - Sunday 9:00 AM - 9:30 PM', ts],
        ['Mayford Community Outreach Initiatives', ts],
        ['Culinary Academy Training Programmes Available', ts],
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
        ['Jollof', 'Rice Dishes', 'Smoky Ghanaian Jollof served with grilled chicken and shito', 80.0, 'Jollof.png', 'available', 0, ts],
        ['Banku', 'Local Dishes', 'Freshly prepared corn and cassava dough served with okro soup and tilapia', 45.0, 'bankuokro.jpeg', 'available', 0, ts],
        ['Fried Rice Special', 'Rice Dishes', 'Seasoned wok fried rice with seasoned vegetables and chicken', 85.0, 'hero.png', 'available', 0, ts],
      ],
    },
    {
      sql: 'INSERT INTO orders (customer_name, customer_email, phone, food_item, quantity, outlet, order_type, address, order_details, total, payment_method, payment_status, payment_reference, status, notification_status, order_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      rows: [
        ['Kwame Mensah', 'kwame@example.com', '0557605261', 'Jollof', 3, 'Dzorwulu', 'Delivery', 'Dzorwulu Junction, Accra', 'Jollof x 3', 240.0, 'Paystack', 'Paid', 'PSK_MF_902814', 'Completed', 'seen', ts],
        ['Ama Osei', 'ama@example.com', '0244192837', 'Multiple Foods', 2, 'Adabraka', 'Delivery', 'Adabraka Official Town, Accra', 'Jollof x 1 = GH₵ 80.00\nBanku x 1 = GH₵ 45.00', 125.0, 'Paystack', 'Paid', 'PSK_MF_902889', 'Preparing', 'new', ts],
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
      sql: 'INSERT INTO advertisement_videos (video_name, poster_url, created_at) VALUES (?,?,?)',
      rows: [['video.mp4', 'hero.png', ts]],
    },
    {
      sql: 'INSERT INTO community_media (media_type, file_name, title, description, created_at) VALUES (?,?,?,?,?)',
      rows: [
        [
          'image',
          'community1.png',
          'Accra Neighbourhood Meal Drive',
          'Sharing freshly prepared Jollof and hot meals with families and children in our local community.',
          ts,
        ],
        [
          'image',
          'community2.png',
          'Youth Culinary Mentorship Outreach',
          'Hands-on kitchen mentorship and food hygiene workshops for aspiring young cooks in Accra.',
          ts,
        ],
        [
          'image',
          'community5.png',
          'Holiday Community Welfare Support',
          'Partnering with neighbourhood leaders to distribute food packages and hot meals.',
          ts,
        ],
      ],
    },
    {
      sql: 'INSERT INTO training_applications (application_ref, full_name, phone, email, training_school, program, message, status, admin_notes, email_sent, notification_status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      rows: [
        [
          'MFA-2026-0001',
          'Abena Mensah',
          '0248112233',
          'abena.mensah@example.com',
          'School of Culinary Arts',
          'Professional Chef Training (3-Month Certificate)',
          'Passionate about commercial Ghanaian kitchen operations.',
          'New',
          'Branded confirmation email sent automatically via Resend. Awaiting admissions call.',
          1,
          'new',
          ts,
        ],
      ],
    },
    {
      sql: 'INSERT INTO visitor_counter (total_visitors) VALUES (?)',
      rows: [[1250]],
    },
    {
      sql: 'INSERT INTO website_settings (email, adabraka_phone, dzorwulu_phone, facebook_link, tiktok_link, opening_hours, paystack_public_key) VALUES (?,?,?,?,?,?,?)',
      rows: [
        [
          'mayfordfoods@gmail.com',
          '0244143271',
          '0533634378',
          'https://www.facebook.com/share/1PDFLKArpt/',
          'https://www.tiktok.com/@maryafuahboakye?_r=1&_t=ZS-97IIPfQ9uRo',
          'Monday - Sunday 9:00 AM - 9:30 PM',
          '',
        ],
      ],
    },
  ];
}

export function sqliteSeeds(ts: string): SeedEntry[] {
  return starterSeeds(ts);
}

// ---------------------------------------------------------------- Supabase / PostgreSQL driver
async function tryConnectSupabase(): Promise<boolean> {
  const connString =
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PG_URL;

  if (!connString) return false;

  try {
    const isSupabase = connString.toLowerCase().includes('supabase');
    const supabaseOnly = /^(1|true|yes)$/i.test(process.env.SUPABASE_ONLY || '');
    if (supabaseOnly && !isSupabase) {
      console.warn('[db] SUPABASE_ONLY is enabled, but the configured PostgreSQL URL is not a Supabase host.');
      return false;
    }
    const pool = new PgPool({
      connectionString: connString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
      max: 10,
    });

    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    pgPool = pool;
    activeMode = isSupabase ? 'supabase' : 'postgres';
    console.log(`[db] Connected to ${isSupabase ? 'Supabase PostgreSQL' : 'PostgreSQL database'}`);
    return true;
  } catch (err) {
    if (pgPool) {
      await pgPool.end().catch(() => undefined);
      pgPool = null;
    }
    console.warn(`[db] PostgreSQL/Supabase not reachable: ${(err as Error).message.split('\n')[0]}`);
    return false;
  }
}

// ---------------------------------------------------------------- MySQL driver
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
    activeMode = 'mysql';
    console.log(`[db] Connected to MySQL (${host}:${port}/${database})`);
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

// ---------------------------------------------------------------- SQLite fallback
function initSqlite(): void {
  const dataDir = process.env.VERCEL ? '/tmp/mayford-data' : path.resolve(__dirname, '../data');
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'demo.sqlite');
  sqlite = new DatabaseSync(file);
  sqlite.exec('PRAGMA journal_mode = WAL');
  sqlite.exec(SQLITE_SCHEMA);

  // SQLite migrations
  const alterations = [
    "ALTER TABLE orders ADD COLUMN customer_email TEXT",
    "ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'Paystack'",
    "ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'Pending'",
    "ALTER TABLE orders ADD COLUMN payment_reference TEXT",
    "ALTER TABLE orders ADD COLUMN delivery_zone TEXT",
    "ALTER TABLE orders ADD COLUMN delivery_fee REAL NOT NULL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN order_source TEXT NOT NULL DEFAULT 'Online'",
    "ALTER TABLE community_media ADD COLUMN title TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE community_media ADD COLUMN description TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE community_media ADD COLUMN poster_url TEXT",
    "ALTER TABLE advertisement_videos ADD COLUMN poster_url TEXT",
    "ALTER TABLE training_applications ADD COLUMN application_ref TEXT",
    "ALTER TABLE training_applications ADD COLUMN status TEXT NOT NULL DEFAULT 'New'",
    "ALTER TABLE training_applications ADD COLUMN admin_notes TEXT",
    "ALTER TABLE training_applications ADD COLUMN email_sent INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE training_applications ADD COLUMN confirmation_email_html TEXT",
    "ALTER TABLE website_settings ADD COLUMN paystack_public_key TEXT NOT NULL DEFAULT ''",
  ];
  for (const sql of alterations) {
    try {
      sqlite.exec(sql);
    } catch {
      /* column already exists */
    }
  }

  // Seed SQLite if admins empty
  const count = sqlite.prepare('SELECT COUNT(*) AS c FROM admins').get() as { c: number };
  if (count.c === 0) {
    const ts = nowSql();
    for (const seed of starterSeeds(ts)) {
      for (const row of seed.rows) {
        sqlite.prepare(seed.sql).run(...row);
      }
    }
  }

  activeMode = 'sqlite';
  console.warn(`[db] Using SQLite DEMO MODE at ${file} (data resets are NOT synced to Supabase/MySQL).`);
}

async function ensureMediaSchema(): Promise<void> {
  await execute(`CREATE TABLE IF NOT EXISTS image_asset_metadata (
    object_key VARCHAR(191) PRIMARY KEY,
    public_url TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    color TEXT NOT NULL,
    variants_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  if (activeMode === 'supabase' || activeMode === 'postgres') {
    await query('ALTER TABLE image_asset_metadata ENABLE ROW LEVEL SECURITY');
    await query('ALTER TABLE advertisement_videos ADD COLUMN IF NOT EXISTS poster_url TEXT');
    await query('ALTER TABLE community_media ADD COLUMN IF NOT EXISTS poster_url TEXT');
    await query('ALTER TABLE community_media ADD COLUMN IF NOT EXISTS file_name VARCHAR(255)');
    try {
      await query(`UPDATE community_media
        SET file_name=COALESCE(NULLIF(file_name, ''), NULLIF(media_url, ''), 'community1.png')
        WHERE file_name IS NULL OR file_name=''`);
      await query('ALTER TABLE community_media ALTER COLUMN media_url DROP NOT NULL');
    } catch (err) {
      if (!String((err as Error).message).includes('media_url')) throw err;
    }
  } else if (activeMode === 'mysql') {
    const alterations = [
      ['advertisement_videos', 'poster_url', 'TEXT'],
      ['community_media', 'poster_url', 'TEXT'],
      ['community_media', 'title', "VARCHAR(255) NOT NULL DEFAULT ''"],
      ['community_media', 'description', 'TEXT NULL'],
    ];
    for (const [table, column, definition] of alterations) {
      try {
        await execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      } catch (err) {
        const message = (err as Error).message.toLowerCase();
        if (!message.includes('duplicate column') && !message.includes('duplicate')) throw err;
      }
    }
  }
}

export async function initDb(): Promise<void> {
  const mode = process.env.DEMO_MODE || 'auto';
  const supabaseOnly = /^(1|true|yes)$/i.test(process.env.SUPABASE_ONLY || '');

  // Supabase-only mode is strict: never connect to MySQL or fall back to local SQLite.
  if (await tryConnectSupabase()) {
    await ensureMediaSchema();
    return;
  }
  if (supabaseOnly) {
    throw new Error('SUPABASE_ONLY is enabled, but a Supabase PostgreSQL connection could not be established.');
  }

  // 2. Try MySQL next if configured
  if (mode !== 'force' && (await tryConnectMysql())) {
    await ensureMediaSchema();
    return;
  }

  // 3. Fallback to zero-config SQLite
  if (mode === 'off') {
    throw new Error('Database is required (DEMO_MODE=off) but neither Supabase nor MySQL could be reached.');
  }
  initSqlite();
  await ensureMediaSchema();
}

export async function query(sql: string, params: any[] = []): Promise<Row[]> {
  if (pgPool) {
    const pgSql = convertToPgSql(sql);
    const res = await pgPool.query(pgSql, params);
    return res.rows;
  }
  if (activeMode === 'sqlite' && sqlite) {
    return sqlite.prepare(sql).all(...params) as Row[];
  }
  if (!mysqlPool) throw new Error('Database not initialised');
  const [rows] = await mysqlPool.query(sql, params);
  return rows as Row[];
}

export async function execute(sql: string, params: any[] = []): Promise<Result> {
  if (pgPool) {
    let pgSql = convertToPgSql(sql);
    const isInsert = /^\s*INSERT\s+INTO/i.test(sql);
    // Session rows are keyed by sid, not id; only request an id for other inserts.
    const isSessionInsert = /^\s*INSERT\s+INTO\s+(?:public\.)?admin_sessions\b/i.test(sql);
    if (isInsert && !isSessionInsert && !/RETURNING/i.test(pgSql)) {
      pgSql += ' RETURNING id';
    }
    const res = await pgPool.query(pgSql, params);
    const insertId = isInsert && res.rows.length > 0 ? Number(res.rows[0].id) : 0;
    return { insertId, affectedRows: res.rowCount || 0 };
  }
  if (activeMode === 'sqlite' && sqlite) {
    const r = sqlite.prepare(sql).run(...params);
    return { insertId: Number(r.lastInsertRowid), affectedRows: Number(r.changes) };
  }
  if (!mysqlPool) throw new Error('Database not initialised');
  const [result] = await mysqlPool.execute(sql, params);
  const r = result as mysql.ResultSetHeader;
  return { insertId: Number(r.insertId), affectedRows: r.affectedRows };
}
