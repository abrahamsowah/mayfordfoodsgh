/**
 * Database layer for Mayford Foods GH.
 *
 * Supported engines:
 *   1. Supabase / PostgreSQL (pg)  -> Direct connection pool via SUPABASE_DB_URL or DATABASE_URL
 *   2. MySQL / MariaDB (mysql2)     -> Optional legacy fallback when SUPABASE_ONLY is unset
 *   3. SQLite (node:sqlite)         -> Local development fallback when SUPABASE_ONLY is unset
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

/**
 * Tables whose primary key is NOT a surrogate `id` column.
 *
 * `INSERT ... RETURNING id` is how the MySQL/SQLite drivers report insertId, but
 * PostgreSQL rejects it for these tables with error 42703:
 *     column "id" does not exist
 * Because every request awaits initDb() (which seeds menu_item_outlet_availability),
 * that single failure used to 500 the entire API - admin PIN included.
 *
 * The set is seeded with the tables created that way in sql/supabase_schema.sql and
 * grows automatically at runtime if any other id-less table is inserted into.
 */
const PG_TABLES_WITHOUT_ID = new Set<string>([
  'admin_sessions', // keyed by sid
  'image_asset_metadata', // keyed by object_key
  'menu_item_outlet_availability', // composite key (menu_item_id, outlet)
]);

/** Extracts the (unqualified, lowercase) target table of an INSERT statement. */
function pgInsertTable(sql: string): string | null {
  const match = /^\s*INSERT\s+(?:OR\s+\w+\s+|IGNORE\s+)*INTO\s+(?:"[^"]+"|[\w$]+)(?:\s*\.\s*(?:"[^"]+"|[\w$]+))?/i.exec(
    sql
  );
  if (!match) return null;
  const qualified = match[0].slice(match[0].search(/INTO\s+/i) + 5).trim();
  const parts = qualified.replace(/["'`[\]]/g, '').split('.');
  const table = parts[parts.length - 1] || '';
  return table.toLowerCase() || null;
}

/** PostgreSQL 42703 (undefined_column) raised specifically for a missing `id`. */
function isMissingIdColumnError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return (
    e?.code === '42703' && /column\s+"?id"?\s+does\s+not\s+exist/i.test(String(e?.message || ''))
  );
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
CREATE TABLE IF NOT EXISTS menu_item_outlet_availability (
  menu_item_id BIGINT NOT NULL,
  outlet VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  updated_at TEXT NOT NULL,
  updated_by BIGINT,
  PRIMARY KEY (menu_item_id, outlet)
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
  // Local SQLite needs bootstrap access only. Business records and dashboard metrics
  // must come from actual orders/content, never fixture rows.
  return [
    {
      sql: 'INSERT INTO admins (admin_name, username, password, role, created_at) VALUES (?,?,?,?,?)',
      rows: [
        ['Mayford Main Admin', 'mainadmin', defaultAdminPass, 'super_admin', ts],
        ['Adabraka Admin', 'adabraka', defaultAdminPass, 'adabraka_admin', ts],
        ['Dzorwulu Admin', 'dzorwulu', defaultAdminPass, 'dzorwulu_admin', ts],
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
  const file = path.join(dataDir, 'local.sqlite');
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

  const ts = nowSql();
  const adminCount = sqlite.prepare('SELECT COUNT(*) AS c FROM admins').get() as { c: number };
  if (adminCount.c === 0) {
    for (const seed of starterSeeds(ts)) {
      for (const row of seed.rows) sqlite.prepare(seed.sql).run(...row);
    }
  }

  const visitorCount = sqlite.prepare('SELECT COUNT(*) AS c FROM visitor_counter').get() as { c: number };
  if (visitorCount.c === 0) sqlite.prepare('INSERT INTO visitor_counter (id, total_visitors) VALUES (1, 0)').run();

  const settingsCount = sqlite.prepare('SELECT COUNT(*) AS c FROM website_settings').get() as { c: number };
  if (settingsCount.c === 0) {
    sqlite.prepare(
      'INSERT INTO website_settings (id, email, adabraka_phone, dzorwulu_phone, facebook_link, tiktok_link, opening_hours, paystack_public_key) VALUES (1,?,?,?,?,?,?,?)'
    ).run(
      'mayfordfoods@gmail.com',
      '0244143271',
      '0533634378',
      'https://www.facebook.com/share/1PDFLKArpt/',
      'https://www.tiktok.com/@maryafuahboakye?_r=1&_t=ZS-97IIPfQ9uRo',
      'Monday - Sunday 9:00 AM - 9:30 PM',
      ''
    );
  }

  activeMode = 'sqlite';
  console.warn(`[db] Using local SQLite at ${file}. Data is not synced to Supabase/MySQL.`);
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

async function ensureMenuAvailabilitySchema(): Promise<void> {
  await execute(`CREATE TABLE IF NOT EXISTS menu_item_outlet_availability (
    menu_item_id BIGINT NOT NULL,
    outlet VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    updated_at TEXT NOT NULL,
    updated_by BIGINT,
    PRIMARY KEY (menu_item_id, outlet)
  )`);

  if (activeMode === 'supabase') {
    await execute('ALTER TABLE menu_item_outlet_availability ENABLE ROW LEVEL SECURITY');
    try {
      await execute(`CREATE POLICY "Service role full access menu_item_outlet_availability"
        ON menu_item_outlet_availability FOR ALL TO service_role USING (true) WITH CHECK (true)`);
    } catch (err) {
      if (!String((err as Error).message).toLowerCase().includes('already exists')) throw err;
    }
    await execute('REVOKE ALL ON menu_item_outlet_availability FROM anon, authenticated');
    await execute('GRANT ALL ON menu_item_outlet_availability TO service_role');
  }

  const menuItems = await query('SELECT id FROM menu_items');
  const availability = await query('SELECT menu_item_id, outlet FROM menu_item_outlet_availability');
  const existing = new Set(availability.map((row) => `${Number(row.menu_item_id)}:${String(row.outlet)}`));
  for (const item of menuItems) {
    for (const outlet of ['Adabraka', 'Dzorwulu']) {
      const key = `${Number(item.id)}:${outlet}`;
      if (existing.has(key)) continue;
      await execute(
        'INSERT INTO menu_item_outlet_availability (menu_item_id, outlet, status, updated_at) VALUES (?,?,?,?)',
        [Number(item.id), outlet, 'available', nowSql()]
      );
    }
  }
}

async function ensureVisitorCounter(): Promise<void> {
  const rows = await query('SELECT id FROM visitor_counter WHERE id=1');
  if (rows.length === 0) await execute('INSERT INTO visitor_counter (id, total_visitors) VALUES (1, 0)');
}

/**
 * Runs a schema bootstrap step (CREATE TABLE IF NOT EXISTS / ALTER / seed).
 *
 * These steps are additive housekeeping, not part of the connection handshake.
 * Every request waits on initDb(), so a single failing step used to turn every
 * endpoint - including /api/auth/admin-pin - into a 500. Connection failures
 * are still fatal; only optional bootstrap work degrades to a logged warning.
 */
async function runSchemaStep(label: string, step: () => Promise<void>): Promise<void> {
  try {
    await step();
  } catch (err) {
    console.error(`[db] ${label} skipped: ${(err as Error).message.split('\n')[0]}`);
  }
}

async function bootstrapSchema(): Promise<void> {
  await runSchemaStep('media schema', ensureMediaSchema);
  await runSchemaStep('menu availability schema', ensureMenuAvailabilitySchema);
  await runSchemaStep('visitor counter', ensureVisitorCounter);
}

export async function initDb(): Promise<void> {
  const mode = process.env.DEMO_MODE || (process.env.NODE_ENV === 'production' ? 'off' : 'auto');
  const supabaseOnly = /^(1|true|yes)$/i.test(process.env.SUPABASE_ONLY || '');

  // Supabase-only mode is strict: never connect to MySQL or fall back to local SQLite.
  if (await tryConnectSupabase()) {
    await bootstrapSchema();
    return;
  }
  if (supabaseOnly) {
    throw new Error('SUPABASE_ONLY is enabled, but a Supabase PostgreSQL connection could not be established.');
  }

  // 2. Try MySQL next if configured
  if (mode !== 'force' && (await tryConnectMysql())) {
    await bootstrapSchema();
    return;
  }

  // 3. Local-development SQLite fallback; production defaults to fail closed.
  if (mode === 'off') {
    throw new Error('No database connection is available. Configure Supabase/PostgreSQL/MySQL, or explicitly enable DEMO_MODE=auto for a local SQLite database.');
  }
  initSqlite();
  await bootstrapSchema();
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
    const isInsert = /^\s*INSERT\s+(?:OR\s+\w+\s+|IGNORE\s+)*INTO/i.test(sql);
    if (!isInsert) {
      const res = await pgPool.query(convertToPgSql(sql), params);
      return { insertId: 0, affectedRows: res.rowCount || 0 };
    }

    let pgSql = convertToPgSql(sql);
    const table = pgInsertTable(sql);
    // Only ask Postgres to return the new id when the table actually has one.
    const injectedReturning =
      (!table || !PG_TABLES_WITHOUT_ID.has(table)) && !/RETURNING/i.test(pgSql);
    if (injectedReturning) pgSql += ' RETURNING id';

    let res;
    try {
      res = await pgPool.query(pgSql, params);
    } catch (err) {
      // Unknown table shape: learn it once per process and retry without RETURNING id
      // instead of failing the request (and, during initDb, the whole API).
      if (!injectedReturning || !isMissingIdColumnError(err)) throw err;
      if (table) PG_TABLES_WITHOUT_ID.add(table);
      res = await pgPool.query(pgSql.replace(/\s+RETURNING\s+id\s*$/i, ''), params);
      return { insertId: 0, affectedRows: res.rowCount || 0 };
    }

    const returnedId = res.rows.length > 0 ? res.rows[0]?.id : undefined;
    return {
      insertId: returnedId === undefined || returnedId === null ? 0 : Number(returnedId),
      affectedRows: res.rowCount || 0,
    };
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
