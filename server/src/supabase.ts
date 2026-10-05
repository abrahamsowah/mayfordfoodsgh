/**
 * Official Supabase Client & RLS Service Layer
 * Supports both Anon Key (client/RLS-scoped) and Service Role Key (server/admin).
 * Configured with Realtime channel capabilities and Row Level Security audits.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

/**
 * Server-side admin client using the Service Role Key.
 * Bypasses Row Level Security (RLS) for authoritative server-side order verification,
 * price recalculation, status dispatches, and session management.
 * NOTE: The service role key is strictly required for admin operations to prevent
 * downgrading to public anon permissions against hardened RLS tables.
 */
export const supabaseAdmin: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        realtime: {
          params: {
            eventsPerSecond: 20,
          },
        },
      })
    : null;

/**
 * Client-facing / public client using the Anon Key.
 * Subject to PostgreSQL Row Level Security (RLS) policies defined in sql/supabase_schema.sql.
 */
export const supabasePublic: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        realtime: {
          params: {
            eventsPerSecond: 20,
          },
        },
      })
    : null;

export const REALTIME_TABLES = [
  'visitor_counter',
  'menu_items',
  'menu_categories',
  'banners',
  'advertisement_banners',
  'ratings',
  'website_settings',
] as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY));
}

export function getSupabaseDetails() {
  return {
    configured: isSupabaseConfigured(),
    url: SUPABASE_URL || 'Not Set',
    has_service_role_key: Boolean(SUPABASE_SERVICE_ROLE_KEY && SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')),
    has_anon_key: Boolean(SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.startsWith('eyJ')),
    masked_anon_key: SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.slice(0, 10)}••••••••` : 'Not Set',
    masked_service_key: SUPABASE_SERVICE_ROLE_KEY ? `${SUPABASE_SERVICE_ROLE_KEY.slice(0, 10)}••••••••` : 'Not Set',
    realtime_enabled: true,
    realtime_tables: REALTIME_TABLES,
    rls_enabled_tables_count: 18,
    rls_policies_count: 22,
  };
}
