'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const requestedBackend = String(process.env.SHIELD_STORAGE_BACKEND || '').trim().toLowerCase();
const backend = requestedBackend || (process.env.NODE_ENV === 'production' ? 'supabase' : hasSupabaseConfig ? 'supabase' : 'json');

if (!['supabase', 'json'].includes(backend)) {
  throw new Error('SHIELD_STORAGE_BACKEND must be either "supabase" or "json".');
}
if (Boolean(SUPABASE_URL) !== Boolean(SUPABASE_SERVICE_ROLE_KEY)) {
  throw new Error('Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or leave both unset.');
}
if (backend === 'supabase' && !hasSupabaseConfig) {
  throw new Error('Supabase storage is enabled but SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set.');
}
if (backend === 'supabase') {
  let parsedUrl;
  try { parsedUrl = new URL(SUPABASE_URL); }
  catch { throw new Error('SUPABASE_URL must be an absolute HTTP or HTTPS URL.'); }
  if (!['http:', 'https:'].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) {
    throw new Error('SUPABASE_URL must be an absolute HTTP or HTTPS URL without embedded credentials.');
  }
  if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
    throw new Error('SUPABASE_URL must use HTTPS in production.');
  }
}

const client = backend === 'supabase'
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { 'X-Client-Info': 'sajama-shield/2.2.0' } },
    })
  : null;

const state = {
  connected: false,
  lastSuccessAt: null,
  lastError: null,
};
const PAGE_SIZE = 1000;
const WRITE_BATCH_SIZE = 250;

function noteSuccess() {
  state.connected = true;
  state.lastSuccessAt = new Date().toISOString();
  state.lastError = null;
}

function noteFailure(error) {
  state.connected = false;
  state.lastError = String(error?.message || 'Supabase request failed.').slice(0, 240);
}

async function execute(label, query) {
  try {
    const { data, error } = await query;
    if (error) throw new Error(error.message || `Supabase ${label} failed.`);
    noteSuccess();
    return data;
  } catch (error) {
    noteFailure(error);
    throw new Error(`Supabase ${label} failed: ${state.lastError}`);
  }
}

async function selectAll(table, { orderBy, ascending = false, maxRows = 1000, gte = {} } = {}) {
  if (!client) return [];
  const rows = [];
  for (let offset = 0; offset < maxRows; offset += PAGE_SIZE) {
    let query = client.from(table).select('*');
    for (const [column, value] of Object.entries(gte)) query = query.gte(column, value);
    if (orderBy) query = query.order(orderBy, { ascending });
    const pageEnd = Math.min(offset + PAGE_SIZE - 1, maxRows - 1);
    const batch = await execute(`read ${table}`, query.range(offset, pageEnd));
    if (!Array.isArray(batch)) throw new Error(`Supabase ${table} returned an invalid result.`);
    rows.push(...batch);
    if (batch.length < pageEnd - offset + 1) break;
  }
  return rows;
}

async function upsert(table, rows, onConflict) {
  if (!client || !rows.length) return;
  for (let offset = 0; offset < rows.length; offset += WRITE_BATCH_SIZE) {
    const batch = rows.slice(offset, offset + WRITE_BATCH_SIZE);
    await execute(`write ${table}`, client.from(table).upsert(batch, { onConflict, ignoreDuplicates: false }));
  }
}

async function deleteBy(table, column, value) {
  if (!client) return;
  await execute(`delete from ${table}`, client.from(table).delete().eq(column, value));
}

async function deleteBefore(table, column, value) {
  if (!client) return;
  await execute(`prune ${table}`, client.from(table).delete().lt(column, value));
}

async function ping() {
  if (!client) return false;
  await execute('connection check', client.from('shield_sites').select('client_id').limit(1));
  return true;
}

function getStatus() {
  if (backend === 'json') {
    return {
      backend,
      durable: false,
      connected: false,
      configured: false,
      last_success_at: null,
      error: null,
    };
  }
  return {
    backend,
    durable: true,
    connected: state.connected,
    configured: true,
    last_success_at: state.lastSuccessAt,
    error: state.lastError ? 'Supabase is temporarily unavailable.' : null,
  };
}

module.exports = {
  backend,
  enabled: backend === 'supabase',
  getStatus,
  selectAll,
  upsert,
  deleteBy,
  deleteBefore,
  ping,
};
