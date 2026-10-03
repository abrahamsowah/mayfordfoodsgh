'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const supabaseStore = require('./supabase-store');
const crypto = require('crypto');
const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const net = require('net');
const fs = require('fs');
const path = require('path');

const app = express();
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 5000);
const MASTER_KEY = process.env.SAJAMA_SHIELD_KEY || (process.env.NODE_ENV === 'production' ? '' : 'sajama2026');
const SESSION_SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-sajama-shield-session-secret-change-before-production');
const DATA_FILE = path.join(__dirname, 'shield-data.json');
const CHECK_INTERVAL_MS = 60_000;
const CHECK_TIMEOUT_MS = 10_000;
const CHECK_RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_CHECKS_PER_SITE = 2_000;
const MAX_RUM_EVENTS = 50_000;
const MAYFORD_SITE_ID = process.env.MAYFORD_SITE_ID || 'site_82be20b5-58ca-412a-998b-6a904a20eda7';
const SESSION_HASH_KEY = crypto.createHmac('sha256', SESSION_SECRET).update('sajama-shield-rum-session-hash').digest();

if (process.env.NODE_ENV === 'production' && (!MASTER_KEY || MASTER_KEY === 'sajama2026' || MASTER_KEY.length < 32 || !SESSION_SECRET || SESSION_SECRET.length < 32)) {
  throw new Error('Set a unique SAJAMA_SHIELD_KEY and a SESSION_SECRET of at least 32 characters in production.');
}

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use(cookieParser());
app.use(session({
  name: 'sajama_shield_sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 },
}));

const SITES = [];
let LOGS = [];
let ERROR_EVENTS = [];
let CHECK_HISTORY = [];
let RUM_EVENTS = [];
const CHECKS_IN_PROGRESS = new Map();
const PENDING_SUPABASE_WRITES = new Map([
  ['shield_sites', new Map()], ['shield_checks', new Map()], ['shield_telemetry', new Map()],
  ['shield_errors', new Map()], ['shield_logs', new Map()],
]);
const SUPABASE_CONFLICT_KEYS = {
  shield_sites: 'client_id', shield_checks: 'id', shield_telemetry: 'id', shield_errors: 'id', shield_logs: 'id',
};

const defaultSite = {
  id: 1,
  client_id: MAYFORD_SITE_ID,
  site_name: 'Mayford Foods GH',
  site_url: 'https://mayfordfoodsgh.com',
  allowed_origins: ['https://mayfordfoodsgh.com'],
  environment: 'production',
  category: 'E-Commerce & Food Hospitality',
  sla_target: 99.95,
  status: 'unknown',
  created_at: new Date().toISOString(),
};
SITES.push(defaultSite);

function safeSecretMatch(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string' || !expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function normalizeSiteUrl(input) {
  try {
    const url = new URL(String(input || '').trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function normalizeOrigins(input, siteUrl) {
  const entries = Array.isArray(input) ? input : String(input || '').split(/[\n,]/);
  const origins = new Set();
  const mainOrigin = new URL(siteUrl).origin;
  origins.add(mainOrigin);
  for (const entry of entries) {
    const raw = String(entry || '').trim();
    if (!raw) continue;
    let parsed;
    try { parsed = new URL(raw); } catch { throw new Error(`Invalid origin: ${raw}`); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== raw.replace(/\/$/, '')) {
      throw new Error(`Enter a complete origin without a path: ${raw}`);
    }
    origins.add(parsed.origin);
  }
  return [...origins];
}

function getAllowedOrigins(site) {
  let primary = [];
  try { primary = [new URL(site.site_url).origin]; } catch {}
  const configured = Array.isArray(site.allowed_origins) ? site.allowed_origins : [];
  return [...new Set([...primary, ...configured])];
}

function saveData() {
  const data = {
    SITES,
    LOGS: LOGS.slice(0, 1_000),
    ERROR_EVENTS: ERROR_EVENTS.slice(0, 1_000),
    CHECK_HISTORY: CHECK_HISTORY.slice(0, 100_000),
    RUM_EVENTS: RUM_EVENTS.slice(0, MAX_RUM_EVENTS),
  };
  const temporary = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data), { mode: 0o600 });
  fs.renameSync(temporary, DATA_FILE);
}

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (Array.isArray(saved.SITES)) {
      SITES.splice(0, SITES.length, ...saved.SITES.filter(site => site && site.client_id && normalizeSiteUrl(site.site_url)));
    }
    if (Array.isArray(saved.LOGS)) LOGS = saved.LOGS;
    if (Array.isArray(saved.ERROR_EVENTS)) ERROR_EVENTS = saved.ERROR_EVENTS;
    if (Array.isArray(saved.CHECK_HISTORY)) CHECK_HISTORY = saved.CHECK_HISTORY;
    if (Array.isArray(saved.RUM_EVENTS)) RUM_EVENTS = saved.RUM_EVENTS;
  } catch (error) {
    console.error('[Shield] Could not load persisted data:', error.message);
  }
  const cutoff = Date.now() - CHECK_RETENTION_MS;
  CHECK_HISTORY = CHECK_HISTORY.filter(check => Date.parse(check.checked_at) >= cutoff);
  RUM_EVENTS = RUM_EVENTS.filter(event => Date.parse(event.timestamp) >= cutoff);
  for (const site of SITES) {
    if (!Array.isArray(site.allowed_origins)) site.allowed_origins = [];
    if (!site.status) site.status = 'unknown';
  }
}

loadData();

function toSiteRow(site) {
  return {
    client_id: site.client_id,
    site_name: site.site_name,
    site_url: site.site_url,
    allowed_origins: getAllowedOrigins(site),
    environment: site.environment || 'production',
    category: site.category || 'Web application',
    sla_target: Number(site.sla_target) || 99.95,
    created_at: site.created_at || new Date().toISOString(),
  };
}

function fromSiteRow(row) {
  return {
    id: Date.parse(row.created_at) || 1,
    client_id: row.client_id,
    site_name: row.site_name,
    site_url: row.site_url,
    allowed_origins: Array.isArray(row.allowed_origins) ? row.allowed_origins : [],
    environment: row.environment || 'production',
    category: row.category || 'Web application',
    sla_target: Number(row.sla_target) || 99.95,
    status: 'unknown',
    created_at: row.created_at || new Date().toISOString(),
  };
}

function toCheckRow(check) {
  return { id: check.id, client_id: check.client_id, checked_at: check.checked_at, status: check.status, http_status: check.http_status, latency_ms: check.latency_ms, error: check.error || null };
}

function fromCheckRow(row) {
  return { id: row.id, client_id: row.client_id, checked_at: row.checked_at, status: row.status, http_status: row.http_status, latency_ms: row.latency_ms, error: row.error || null };
}

function toTelemetryRow(event) {
  return { id: event.id, client_id: event.client_id, event_type: event.type, received_at: event.timestamp, session_hash: event.session_hash, path: event.path || '/', data: event.data || {} };
}

function fromTelemetryRow(row) {
  return { id: row.id, client_id: row.client_id, type: row.event_type, timestamp: row.received_at, session_hash: row.session_hash, path: row.path || '/', data: row.data || {} };
}

function toErrorRow(error) {
  return { id: error.id, client_id: error.client_id, error_type: error.error_type, message: error.message, filename: error.filename || 'inline', line_number: Number(error.lineno) || 0, occurrences: Number(error.occurrences) || 1, status: error.status || 'open', first_seen: error.first_seen, last_seen: error.last_seen, resolved_at: error.resolved_at || null };
}

function fromErrorRow(row) {
  return { id: row.id, client_id: row.client_id, error_type: row.error_type, message: row.message, filename: row.filename || 'inline', lineno: row.line_number || 0, occurrences: row.occurrences || 1, status: row.status || 'open', first_seen: row.first_seen, last_seen: row.last_seen, resolved_at: row.resolved_at || null };
}

function toLogRow(log) {
  return {
    id: log.id || crypto.randomUUID(), client_id: log.client_id,
    severity: log.severity || 'INFO', subsystem: log.subsystem || 'shield',
    event_type: log.event_type || 'LEGACY_EVENT', message: String(log.message || ''),
    logged_at: log.logged_at || log.timestamp || new Date().toISOString(),
  };
}

function fromLogRow(row) {
  return { id: row.id, client_id: row.client_id, severity: row.severity, subsystem: row.subsystem, event_type: row.event_type, message: row.message, logged_at: row.logged_at };
}

async function persistRows(table, rows) {
  if (!supabaseStore.enabled || !rows.length) return;
  const pending = PENDING_SUPABASE_WRITES.get(table);
  const conflictKey = SUPABASE_CONFLICT_KEYS[table];
  if (!pending || !conflictKey) throw new Error(`Unsupported Shield storage table: ${table}`);
  const writes = rows.map(row => {
    const key = String(row[conflictKey]);
    const token = crypto.randomUUID();
    pending.set(key, { row, token });
    return { key, token, row };
  });
  try {
    await supabaseStore.upsert(table, rows, conflictKey);
    for (const write of writes) {
      if (pending.get(write.key)?.token === write.token) pending.delete(write.key);
    }
  } catch (error) {
    throw error;
  }
}

async function flushPendingSupabaseWrites() {
  if (!supabaseStore.enabled) return;
  for (const [table, pending] of PENDING_SUPABASE_WRITES) {
    if (!pending.size) continue;
    const batch = [...pending.entries()].slice(0, 1_000);
    try {
      await supabaseStore.upsert(table, batch.map(([, entry]) => entry.row), SUPABASE_CONFLICT_KEYS[table]);
      for (const [key, entry] of batch) {
        if (pending.get(key)?.token === entry.token) pending.delete(key);
      }
    } catch (error) {
      console.error(`[Shield] Retrying ${table} writes later:`, error.message);
    }
  }
}

function discardPendingWrite(table, key) {
  PENDING_SUPABASE_WRITES.get(table)?.delete(String(key));
}

function discardPendingSiteWrites(clientId) {
  for (const pending of PENDING_SUPABASE_WRITES.values()) {
    for (const [key, entry] of pending) {
      if (entry.row.client_id === clientId) pending.delete(key);
    }
  }
}

function getStorageStatus() {
  const pendingWrites = [...PENDING_SUPABASE_WRITES.values()].reduce((total, pending) => total + pending.size, 0);
  return { ...supabaseStore.getStatus(), pending_writes: pendingWrites };
}

function persistSite(site) { return persistRows('shield_sites', [toSiteRow(site)]); }
function persistCheck(check) { return persistRows('shield_checks', [toCheckRow(check)]); }
function persistTelemetry(event) { return persistRows('shield_telemetry', [toTelemetryRow(event)]); }
function persistError(error) { return persistRows('shield_errors', [toErrorRow(error)]); }
function persistLog(log) { return persistRows('shield_logs', [toLogRow(log)]); }

async function initializeSupabase() {
  if (!supabaseStore.enabled) return;
  const local = {
    sites: [...SITES], checks: [...CHECK_HISTORY], telemetry: [...RUM_EVENTS],
    errors: [...ERROR_EVENTS], logs: [...LOGS],
  };
  const retentionCutoff = new Date(Date.now() - CHECK_RETENTION_MS).toISOString();
  const [initialSites, initialChecks, initialTelemetry, initialErrors, initialLogs] = await Promise.all([
    supabaseStore.selectAll('shield_sites', { orderBy: 'created_at', ascending: true, maxRows: 5_000 }),
    supabaseStore.selectAll('shield_checks', { orderBy: 'checked_at', gte: { checked_at: retentionCutoff }, maxRows: 100_000 }),
    supabaseStore.selectAll('shield_telemetry', { orderBy: 'received_at', gte: { received_at: retentionCutoff }, maxRows: MAX_RUM_EVENTS }),
    supabaseStore.selectAll('shield_errors', { orderBy: 'last_seen', maxRows: 1_000 }),
    supabaseStore.selectAll('shield_logs', { orderBy: 'logged_at', maxRows: 1_000 }),
  ]);
  const cloudSiteIds = new Set(initialSites.map(site => site.client_id));
  const missingSites = local.sites.filter(site => !cloudSiteIds.has(site.client_id));
  if (missingSites.length) {
    await supabaseStore.upsert('shield_sites', missingSites.map(toSiteRow), 'client_id');
    for (const site of missingSites) cloudSiteIds.add(site.client_id);
  }
  const cloudCheckIds = new Set(initialChecks.map(check => check.id));
  const cloudTelemetryIds = new Set(initialTelemetry.map(event => event.id));
  const cloudErrorById = new Map(initialErrors.map(error => [error.id, error]));
  const cloudLogIds = new Set(initialLogs.map(log => log.id));
  const missingChecks = local.checks.filter(check => cloudSiteIds.has(check.client_id) && !cloudCheckIds.has(check.id));
  const missingTelemetry = local.telemetry.filter(event => cloudSiteIds.has(event.client_id) && !cloudTelemetryIds.has(event.id));
  const changedErrors = local.errors.filter(error => {
    if (!cloudSiteIds.has(error.client_id)) return false;
    const cloudError = cloudErrorById.get(error.id);
    return !cloudError || Date.parse(error.last_seen) > Date.parse(cloudError.last_seen)
      || Number(error.occurrences) > Number(cloudError.occurrences)
      || (error.status === 'resolved' && cloudError.status !== 'resolved');
  });
  const missingLogs = local.logs.filter(log => cloudSiteIds.has(log.client_id) && !cloudLogIds.has(log.id));
  await Promise.all([
    supabaseStore.upsert('shield_checks', missingChecks.map(toCheckRow), 'id'),
    supabaseStore.upsert('shield_telemetry', missingTelemetry.map(toTelemetryRow), 'id'),
    supabaseStore.upsert('shield_errors', changedErrors.map(toErrorRow), 'id'),
    supabaseStore.upsert('shield_logs', missingLogs.map(toLogRow), 'id'),
  ]);
  const [sites, checks, telemetry, errors, logs] = await Promise.all([
    supabaseStore.selectAll('shield_sites', { orderBy: 'created_at', ascending: true, maxRows: 5_000 }),
    supabaseStore.selectAll('shield_checks', { orderBy: 'checked_at', gte: { checked_at: retentionCutoff }, maxRows: 100_000 }),
    supabaseStore.selectAll('shield_telemetry', { orderBy: 'received_at', gte: { received_at: retentionCutoff }, maxRows: MAX_RUM_EVENTS }),
    supabaseStore.selectAll('shield_errors', { orderBy: 'last_seen', maxRows: 1_000 }),
    supabaseStore.selectAll('shield_logs', { orderBy: 'logged_at', maxRows: 1_000 }),
  ]);
  SITES.splice(0, SITES.length, ...sites.map(fromSiteRow));
  CHECK_HISTORY = checks.map(fromCheckRow);
  RUM_EVENTS = telemetry.map(fromTelemetryRow);
  ERROR_EVENTS = errors.map(fromErrorRow);
  LOGS = logs.map(fromLogRow);
  for (const site of SITES) {
    if (!Array.isArray(site.allowed_origins)) site.allowed_origins = [];
    const summary = monitorSummary(site.client_id);
    site.status = summary.status;
    site.last_checked_at = summary.last_checked_at;
  }
  saveData();
  console.log(`[Shield] Supabase ready: ${SITES.length} sites, ${CHECK_HISTORY.length} checks, ${RUM_EVENTS.length} telemetry events.`);
}

async function pruneSupabaseHistory() {
  if (!supabaseStore.enabled) return;
  const cutoff = new Date(Date.now() - CHECK_RETENTION_MS).toISOString();
  try {
    await Promise.all([
      supabaseStore.deleteBefore('shield_checks', 'checked_at', cutoff),
      supabaseStore.deleteBefore('shield_telemetry', 'received_at', cutoff),
    ]);
  } catch (error) {
    console.error('[Shield] Supabase retention cleanup failed:', error.message);
  }
}

// Browser beacons connect directly to Shield. The global CORS response is limited to
// registered origins; the POST handler checks the exact origin against the selected site.
app.use('/api/shield/telemetry', cors({
  origin(origin, callback) {
    if (!origin) return callback(null, false);
    const allowed = SITES.some(site => getAllowedOrigins(site).includes(origin));
    return callback(null, allowed ? origin : false);
  },
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 204,
  maxAge: 600,
}));
app.options('/api/shield/telemetry', (req, res) => {
  const origin = req.get('origin');
  const allowed = origin && SITES.some(site => getAllowedOrigins(site).includes(origin));
  return res.sendStatus(origin && !allowed ? 403 : 204);
});

app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  maxAge: '1h',
  setHeaders(res, filePath) {
    if (path.basename(filePath) === 'index.html') res.setHeader('Cache-Control', 'no-store');
  },
}));
app.get('/sajama-tag.js', (_req, res) => {
  res.type('application/javascript').sendFile(path.join(__dirname, 'sajama-tag.js'));
});

function requireShieldAuth(req, res, next) {
  if (req.session?.shield_authenticated || safeSecretMatch(req.get('x-shield-key'), MASTER_KEY)) return next();
  return res.status(401).json({ ok: false, error: 'Sajama Shield login required.' });
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'sajama-shield', timestamp: new Date().toISOString(), storage: getStorageStatus() }));
app.get('/api/shield/auth/session', (req, res) => {
  if (!req.session?.shield_authenticated) return res.json({ authenticated: false });
  return res.json({ authenticated: true, user: { role: 'Shield Administrator', engineer: req.session.shield_engineer || 'Administrator' } });
});
app.post('/api/shield/auth/login', (req, res, next) => {
  if (!safeSecretMatch(req.body?.key, MASTER_KEY)) return res.status(401).json({ ok: false, error: 'Invalid Shield key.' });
  req.session.regenerate(error => {
    if (error) return next(error);
    req.session.shield_authenticated = true;
    req.session.shield_engineer = String(req.body?.engineer_name || 'Administrator').trim().slice(0, 80) || 'Administrator';
    req.session.save(saveError => {
      if (saveError) return next(saveError);
      return res.json({ ok: true, user: { role: 'Shield Administrator', engineer: req.session.shield_engineer } });
    });
  });
});
app.post('/api/shield/auth/logout', (req, res) => {
  req.session.destroy(error => {
    if (error) return res.status(500).json({ ok: false, error: 'Unable to end the Shield session.' });
    res.clearCookie('sajama_shield_sid', { path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return res.json({ ok: true });
  });
});

function percentile(values, p = 75) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

function vitalStatus(value, goodLimit, poorLimit) {
  if (!Number.isFinite(value)) return 'no data';
  if (value <= goodLimit) return 'good';
  if (value <= poorLimit) return 'needs improvement';
  return 'poor';
}

function rumSummary(clientId) {
  const cutoff = Date.now() - CHECK_RETENTION_MS;
  const events = RUM_EVENTS.filter(event => event.client_id === clientId && Date.parse(event.timestamp) >= cutoff);
  const pageviews = events.filter(event => event.type === 'pageview');
  const performanceEvents = events.filter(event => event.type === 'performance');
  const values = key => performanceEvents
    .map(event => event.data?.[key])
    .filter(value => value !== undefined && value !== null && value !== '')
    .map(Number)
    .filter(value => Number.isFinite(value) && value >= 0);
  const metric = (key, good, poor, valueField = 'value_ms') => {
    const samples = values(key);
    const value = percentile(samples);
    return { [valueField]: value, status: vitalStatus(value, good, poor), sample_count: samples.length };
  };
  const sessions = new Map();
  for (const pageview of pageviews) {
    if (!pageview.session_hash) continue;
    const current = sessions.get(pageview.session_hash) || 0;
    sessions.set(pageview.session_hash, Math.max(current, Date.parse(pageview.timestamp) || 0));
  }
  const activeSessions = [...sessions.values()].filter(timestamp => Date.now() - timestamp <= 5 * 60 * 1000).length;
  const mostRecent = events.reduce((latest, event) => !latest || Date.parse(event.timestamp) > Date.parse(latest.timestamp) ? event : latest, null);
  return {
    pageviews_24h: pageviews.length,
    sessions_24h: sessions.size,
    active_sessions_5m: activeSessions,
    rum_samples_24h: performanceEvents.length,
    last_telemetry_at: mostRecent?.timestamp || null,
    web_vitals: {
      ttfb: metric('ttfb_ms', 800, 1800),
      fcp: metric('fcp_ms', 1800, 3000),
      lcp: metric('lcp_ms', 2500, 4000),
      cls: metric('cls', 0.1, 0.25, 'value'),
      inp: metric('inp_ms', 200, 500),
    },
  };
}

function monitorSummary(clientId) {
  const cutoff = Date.now() - CHECK_RETENTION_MS;
  const checks = CHECK_HISTORY.filter(check => check.client_id === clientId && Date.parse(check.checked_at) >= cutoff);
  const latest = checks[0] || null;
  const successfulResponses = checks.filter(check => check.http_status != null && Number.isFinite(Number(check.latency_ms)));
  const latencies = successfulResponses.map(check => Number(check.latency_ms));
  const available = checks.filter(check => check.status === 'up').length;
  return {
    status: latest?.status || 'unknown',
    uptime_percentage: checks.length ? Number(((available / checks.length) * 100).toFixed(2)) : null,
    avg_latency_ms: latencies.length ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : null,
    p95_latency_ms: percentile(latencies, 95),
    checks_24h: checks.length,
    failed_checks_24h: checks.filter(check => check.status === 'down').length,
    degraded_checks_24h: checks.filter(check => check.status === 'degraded').length,
    last_checked_at: latest?.checked_at || null,
    last_http_status: latest?.http_status ?? null,
    last_error: latest?.error || null,
  };
}

function isPrivateAddress(address) {
  const version = net.isIP(address);
  if (version === 4) {
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19));
  }
  if (version === 6) {
    const normalized = address.toLowerCase().split('%')[0];
    const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || /^fe[89ab]/.test(normalized) || normalized.startsWith('ff');
  }
  return true;
}

async function resolvePublicAddresses(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new Error('Private or reserved IP addresses cannot be monitored.');
    return [{ address: host, family: net.isIP(host) }];
  }
  const addresses = await dns.lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(entry => isPrivateAddress(entry.address))) {
    throw new Error('The target did not resolve to a public IP address.');
  }
  return addresses;
}

async function performHttpProbe(target, startedAt, redirects = 0) {
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) throw new Error('Only public HTTP and HTTPS URLs can be monitored.');
  const addresses = await resolvePublicAddresses(target.hostname);
  const transport = target.protocol === 'https:' ? https : http;
  const firstAddress = addresses[0];
  const result = await new Promise((resolve, reject) => {
    let settled = false;
    const finish = value => { if (!settled) { settled = true; resolve(value); } };
    const request = transport.request(target, {
      method: 'GET',
      timeout: CHECK_TIMEOUT_MS,
      headers: { 'User-Agent': 'SajamaShield-Monitor/1.0', Accept: 'text/html,application/xhtml+xml,*/*;q=0.8', Range: 'bytes=0-65535' },
      lookup(_host, _options, callback) { callback(null, firstAddress.address, firstAddress.family); },
    }, response => {
      const status = response.statusCode || null;
      const location = response.headers.location;
      response.destroy();
      finish({ http_status: status, location: location || null });
    });
    request.on('timeout', () => request.destroy(new Error('Request timed out.')));
    request.on('error', reject);
    request.end();
  });
  if (result.location && result.http_status >= 300 && result.http_status < 400 && redirects < 4) {
    const next = new URL(result.location, target);
    return performHttpProbe(next, startedAt, redirects + 1);
  }
  return { http_status: result.http_status, latency_ms: Math.max(0, Date.now() - startedAt) };
}

async function performSiteCheck(site) {
  const existing = CHECKS_IN_PROGRESS.get(site.client_id);
  if (existing) return existing;
  const task = (async () => {
    const startedAt = Date.now();
    let result;
    try {
      result = await performHttpProbe(new URL(site.site_url), startedAt);
      result.status = result.http_status == null ? 'down' : result.http_status < 400 ? 'up' : result.http_status < 500 ? 'degraded' : 'down';
      result.error = result.status === 'down' && result.http_status != null ? `HTTP ${result.http_status}` : null;
    } catch (error) {
      result = { status: 'down', http_status: null, latency_ms: Math.max(0, Date.now() - startedAt), error: String(error.message || 'Check failed.').slice(0, 240) };
    }
    const check = {
      id: crypto.randomUUID(), client_id: site.client_id, checked_at: new Date().toISOString(),
      status: result.status, http_status: result.http_status, latency_ms: Number.isFinite(result.latency_ms) ? result.latency_ms : null, error: result.error || null,
    };
    const previous = CHECK_HISTORY.find(entry => entry.client_id === site.client_id);
    CHECK_HISTORY.unshift(check);
    let retainedForSite = 0;
    CHECK_HISTORY = CHECK_HISTORY.filter(entry => Date.parse(entry.checked_at) >= Date.now() - CHECK_RETENTION_MS && (entry.client_id !== site.client_id || ++retainedForSite <= MAX_CHECKS_PER_SITE));
    site.status = check.status;
    site.last_checked_at = check.checked_at;
    let statusLog = null;
    if (!previous || previous.status !== check.status) {
      const severity = check.status === 'up' ? 'INFO' : check.status === 'degraded' ? 'WARN' : 'ERROR';
      const message = check.status === 'up' ? `${site.site_name} returned HTTP ${check.http_status} in ${check.latency_ms} ms.` : check.status === 'degraded' ? `${site.site_name} returned HTTP ${check.http_status}.` : `${site.site_name} check failed: ${check.error || 'no HTTP response'}.`;
      statusLog = { id: crypto.randomUUID(), client_id: site.client_id, severity, subsystem: 'uptime_check', event_type: 'SITE_STATUS_CHANGED', message, logged_at: check.checked_at };
      LOGS.unshift(statusLog);
      LOGS = LOGS.slice(0, 1_000);
    }
    saveData();
    try {
      await Promise.all([persistSite(site), persistCheck(check), statusLog ? persistLog(statusLog) : Promise.resolve()]);
    } catch (error) {
      console.error('[Shield] Check was recorded locally but Supabase persistence failed:', error.message);
    }
    return check;
  })();
  CHECKS_IN_PROGRESS.set(site.client_id, task);
  try { return await task; } finally { CHECKS_IN_PROGRESS.delete(site.client_id); }
}

async function runScheduledChecks() {
  await Promise.allSettled(SITES.map(site => performSiteCheck(site)));
}

app.get('/api/shield/sites', requireShieldAuth, (_req, res) => {
  const sites = SITES.map(site => ({ ...site, ...monitorSummary(site.client_id), ...rumSummary(site.client_id), allowed_origins: getAllowedOrigins(site) }));
  res.json({ ok: true, sites });
});

app.post('/api/shield/sites', requireShieldAuth, async (req, res) => {
  const siteName = String(req.body?.site_name || '').trim();
  const siteUrl = normalizeSiteUrl(req.body?.site_url);
  if (!siteName || !siteUrl) return res.status(400).json({ ok: false, error: 'Enter a site name and a valid HTTP or HTTPS target URL.' });
  let allowedOrigins;
  try { allowedOrigins = normalizeOrigins(req.body?.allowed_origins, siteUrl); }
  catch (error) { return res.status(400).json({ ok: false, error: error.message }); }
  const site = {
    id: Date.now(), client_id: `site_${crypto.randomUUID()}`, site_name: siteName.slice(0, 100), site_url: siteUrl,
    allowed_origins: allowedOrigins, environment: String(req.body?.environment || 'production').slice(0, 32),
    category: String(req.body?.category || 'Web application').slice(0, 80), sla_target: Number(req.body?.sla_target) || 99.95,
    status: 'unknown', created_at: new Date().toISOString(),
  };
  SITES.push(site);
  saveData();
  try { await persistSite(site); }
  catch (error) {
    discardPendingWrite('shield_sites', site.client_id);
    SITES.splice(SITES.indexOf(site), 1);
    saveData();
    return res.status(503).json({ ok: false, error: 'The site could not be saved to Supabase. Check Shield storage configuration.' });
  }
  performSiteCheck(site).catch(error => console.error('[Shield] Initial site check failed:', error.message));
  return res.status(201).json({ ok: true, site });
});

app.get('/api/shield/sites/:clientId', requireShieldAuth, (req, res) => {
  const site = SITES.find(entry => entry.client_id === req.params.clientId);
  if (!site) return res.status(404).json({ ok: false, error: 'Site not found.' });
  const monitor = monitorSummary(site.client_id);
  const rum = rumSummary(site.client_id);
  const checkHistory = CHECK_HISTORY.filter(check => check.client_id === site.client_id && Date.parse(check.checked_at) >= Date.now() - CHECK_RETENTION_MS).slice(0, MAX_CHECKS_PER_SITE);
  return res.json({ ok: true, site: { ...site, ...monitor, ...rum, allowed_origins: getAllowedOrigins(site) }, ...monitor, ...rum, check_history: checkHistory });
});

app.put('/api/shield/sites/:clientId', requireShieldAuth, async (req, res) => {
  const site = SITES.find(entry => entry.client_id === req.params.clientId);
  if (!site) return res.status(404).json({ ok: false, error: 'Site not found.' });
  const previousOrigins = site.allowed_origins;
  try { site.allowed_origins = normalizeOrigins(req.body?.allowed_origins, site.site_url); }
  catch (error) { return res.status(400).json({ ok: false, error: error.message }); }
  saveData();
  try { await persistSite(site); }
  catch (error) {
    discardPendingWrite('shield_sites', site.client_id);
    site.allowed_origins = previousOrigins;
    saveData();
    return res.status(503).json({ ok: false, error: 'Origins could not be saved to Supabase. Check Shield storage configuration.' });
  }
  return res.json({ ok: true, site: { ...site, allowed_origins: getAllowedOrigins(site) } });
});

app.delete('/api/shield/sites/:clientId', requireShieldAuth, async (req, res) => {
  const index = SITES.findIndex(site => site.client_id === req.params.clientId);
  if (index < 0) return res.status(404).json({ ok: false, error: 'Site not found.' });
  try { await supabaseStore.deleteBy('shield_sites', 'client_id', req.params.clientId); }
  catch (error) { return res.status(503).json({ ok: false, error: 'The site could not be deleted from Supabase. Check Shield storage configuration.' }); }
  discardPendingSiteWrites(req.params.clientId);
  SITES.splice(index, 1);
  CHECK_HISTORY = CHECK_HISTORY.filter(check => check.client_id !== req.params.clientId);
  RUM_EVENTS = RUM_EVENTS.filter(event => event.client_id !== req.params.clientId);
  LOGS = LOGS.filter(log => log.client_id !== req.params.clientId);
  ERROR_EVENTS = ERROR_EVENTS.filter(error => error.client_id !== req.params.clientId);
  saveData();
  return res.json({ ok: true });
});

app.post('/api/shield/diagnose/:clientId', requireShieldAuth, async (req, res) => {
  const site = SITES.find(entry => entry.client_id === req.params.clientId);
  if (!site) return res.status(404).json({ ok: false, error: 'Site not found.' });
  try {
    const result = await performSiteCheck(site);
    return res.json({ ok: true, result: { ...result, site_name: site.site_name } });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Site check failed.' });
  }
});

app.get('/api/shield/errors', requireShieldAuth, (req, res) => {
  const clientId = String(req.query.site_id || '');
  return res.json({ ok: true, errors: ERROR_EVENTS.filter(error => error.client_id === clientId).sort((a, b) => Date.parse(b.last_seen) - Date.parse(a.last_seen)) });
});
app.post('/api/shield/errors/:id/resolve', requireShieldAuth, async (req, res) => {
  const error = ERROR_EVENTS.find(entry => String(entry.id) === String(req.params.id));
  if (!error) return res.status(404).json({ ok: false, error: 'Error group not found.' });
  const previousStatus = error.status;
  const previousResolvedAt = error.resolved_at;
  error.status = 'resolved';
  error.resolved_at = new Date().toISOString();
  saveData();
  try { await persistError(error); }
  catch (storageError) {
    discardPendingWrite('shield_errors', error.id);
    error.status = previousStatus;
    error.resolved_at = previousResolvedAt;
    saveData();
    return res.status(503).json({ ok: false, error: 'The error state could not be saved to Supabase.' });
  }
  return res.json({ ok: true });
});
app.get('/api/shield/logs', requireShieldAuth, (req, res) => {
  const clientId = String(req.query.site_id || '');
  const logs = LOGS.filter(log => log.client_id === clientId).slice(0, 200);
  return res.json({ ok: true, logs });
});

function hashSession(sessionId) {
  if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 200) return null;
  return crypto.createHmac('sha256', SESSION_HASH_KEY).update(sessionId).digest('hex').slice(0, 24);
}

function safePagePath(input) {
  try { return new URL(String(input || '/'), 'https://shield.invalid').pathname.slice(0, 300) || '/'; }
  catch { return '/'; }
}

const telemetryRate = new Map();
function telemetryRateAllowed(ip) {
  const now = Date.now();
  const current = telemetryRate.get(ip);
  if (!current || now - current.startedAt > 60_000) {
    telemetryRate.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= 300;
}

app.post('/api/shield/telemetry', async (req, res) => {
  const body = req.body || {};
  const site = SITES.find(entry => entry.client_id === String(body.siteId || '').slice(0, 100));
  if (!site) return res.status(404).json({ ok: false, error: 'Unknown monitoring site.' });
  const origin = req.get('origin');
  if (origin && !getAllowedOrigins(site).includes(origin)) return res.status(403).json({ ok: false, error: 'This origin is not allowed for the selected site.' });
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!telemetryRateAllowed(ip)) return res.status(429).json({ ok: false, error: 'Telemetry rate limit exceeded.' });
  const type = String(body.type || '').slice(0, 32);
  if (!['pageview', 'performance', 'client_error'].includes(type)) return res.status(400).json({ ok: false, error: 'Unsupported telemetry type.' });
  const incomingData = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : {};
  const timestamp = new Date().toISOString();
  const event = {
    id: crypto.randomUUID(), client_id: site.client_id, type, timestamp,
    session_hash: hashSession(body.sessionId), path: safePagePath(body.url), data: {},
  };
  if (type === 'performance') {
    for (const key of ['ttfb_ms', 'fcp_ms', 'lcp_ms', 'inp_ms', 'cls']) {
      const raw = incomingData[key];
      if (raw === undefined || raw === null || raw === '') continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > 60_000) continue;
      event.data[key] = key === 'cls' ? Math.min(value, 10) : Math.round(value);
    }
  }
  let changedError = null;
  let errorLog = null;
  if (type === 'client_error') {
    const errorType = String(incomingData.error_type || 'JavaScriptError').slice(0, 80);
    const message = String(incomingData.message || 'Unknown browser error').split(' ').map(part => {
      const lowerPart = part.toLowerCase();
      if (!lowerPart.startsWith('http://') && !lowerPart.startsWith('https://')) return part;
      try { const url = new URL(part); return `${url.origin}${url.pathname}`; }
      catch { return '[URL]'; }
    }).join(' ').slice(0, 300);
    const filename = String(incomingData.filename || 'inline').split('?')[0].slice(0, 180);
    const line = Math.max(0, Math.min(1_000_000, Number(incomingData.lineno) || 0));
    event.data = { error_type: errorType, message, filename, lineno: line };
    const group = ERROR_EVENTS.find(entry => entry.client_id === site.client_id && entry.status !== 'resolved' && entry.error_type === errorType && entry.message === message && entry.filename === filename && entry.lineno === line);
    if (group) {
      group.occurrences += 1;
      group.last_seen = timestamp;
      changedError = group;
    } else {
      changedError = { id: crypto.randomUUID(), client_id: site.client_id, error_type: errorType, message, filename, lineno: line, occurrences: 1, status: 'open', first_seen: timestamp, last_seen: timestamp };
      ERROR_EVENTS.unshift(changedError);
    }
    errorLog = { id: crypto.randomUUID(), client_id: site.client_id, severity: 'ERROR', subsystem: 'browser_tag', event_type: 'BROWSER_ERROR', message: `${errorType}: ${message}`.slice(0, 500), logged_at: timestamp };
    LOGS.unshift(errorLog);
  }
  RUM_EVENTS.unshift(event);
  RUM_EVENTS = RUM_EVENTS.slice(0, MAX_RUM_EVENTS);
  const cutoff = Date.now() - CHECK_RETENTION_MS;
  RUM_EVENTS = RUM_EVENTS.filter(entry => Date.parse(entry.timestamp) >= cutoff);
  ERROR_EVENTS = ERROR_EVENTS.slice(0, 1_000);
  LOGS = LOGS.slice(0, 1_000);
  saveData();
  try {
    await Promise.all([
      persistTelemetry(event),
      changedError ? persistError(changedError) : Promise.resolve(),
      errorLog ? persistLog(errorLog) : Promise.resolve(),
    ]);
  } catch (storageError) {
    console.error('[Shield] Browser event is local but Supabase persistence failed:', storageError.message);
    return res.status(503).json({ ok: false, error: 'Supabase could not persist this browser event.' });
  }
  return res.status(202).json({ ok: true });
});

app.get('/status/:clientId', (req, res) => {
  const site = SITES.find(entry => entry.client_id === req.params.clientId);
  if (!site) return res.status(404).send('Status page not found.');
  const monitor = monitorSummary(site.client_id);
  const label = monitor.status === 'up' ? 'Operational' : monitor.status === 'degraded' ? 'Degraded' : monitor.status === 'down' ? 'Down' : 'Awaiting first check';
  res.type('html').send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(site.site_name)} status</title><style>body{font:16px system-ui;background:#f5f7f5;color:#203027;margin:0;padding:48px}main{max-width:680px;margin:auto;background:#fff;border:1px solid #dfe7e2;border-radius:14px;padding:30px}h1{font-size:25px;margin:0 0 6px}p{color:#617169;line-height:1.6}.status{display:inline-block;margin:16px 0;padding:7px 11px;border-radius:7px;background:#edf5ef;color:#287049;font-weight:650}.down{background:#fbefed;color:#a8423f}</style><main><h1>${escapeHtml(site.site_name)}</h1><p>Public service status</p><div class="status ${monitor.status === 'down' ? 'down' : ''}">${escapeHtml(label)}</div><p>${monitor.last_checked_at ? `Last checked ${escapeHtml(new Date(monitor.last_checked_at).toLocaleString('en-GB'))}` : 'No HTTP check has completed yet.'}</p><p>Checks completed in the last 24 hours: ${monitor.checks_24h} · Availability: ${monitor.uptime_percentage == null ? '—' : `${monitor.uptime_percentage}%`}</p></main></html>`);
});

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.use((error, _req, res, _next) => {
  console.error('[Shield] Request error:', error.message);
  if (res.headersSent) return;
  return res.status(500).json({ ok: false, error: 'Shield could not complete the request.' });
});

async function boot() {
  if (supabaseStore.enabled) {
    await initializeSupabase();
    await pruneSupabaseHistory();
  }
  setInterval(() => {
    const cutoff = Date.now() - CHECK_RETENTION_MS;
    CHECK_HISTORY = CHECK_HISTORY.filter(check => Date.parse(check.checked_at) >= cutoff);
    RUM_EVENTS = RUM_EVENTS.filter(event => Date.parse(event.timestamp) >= cutoff);
    void runScheduledChecks().catch(error => console.error('[Shield] Scheduled check failure:', error.message));
    void flushPendingSupabaseWrites();
    void pruneSupabaseHistory();
  }, CHECK_INTERVAL_MS).unref();
  setTimeout(() => void runScheduledChecks(), 1000).unref();

  const server = app.listen(PORT, HOST, () => console.log(`[Shield] Listening on http://${HOST}:${PORT} (${supabaseStore.backend} storage)`));
  server.requestTimeout = CHECK_TIMEOUT_MS + 5_000;
  server.headersTimeout = CHECK_TIMEOUT_MS + 10_000;
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
  process.on('SIGINT', () => server.close(() => process.exit(0)));
}

boot().catch(error => {
  console.error('[Shield] Startup failed:', error.message);
  process.exitCode = 1;
});
