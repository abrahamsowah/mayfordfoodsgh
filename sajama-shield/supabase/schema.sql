-- Sajama Shield persistence schema.
-- Run this in the Supabase SQL editor before setting SHIELD_STORAGE_BACKEND=supabase.
-- No public or authenticated policies are created: Shield accesses these tables
-- from its server only with SUPABASE_SERVICE_ROLE_KEY. Never expose that key to a browser.

create table if not exists public.shield_sites (
  client_id text primary key,
  site_name text not null,
  site_url text not null,
  allowed_origins text[] not null default '{}',
  environment text not null default 'production',
  category text not null default 'Web application',
  sla_target numeric(5, 2) not null default 99.95,
  created_at timestamptz not null default now()
);

create table if not exists public.shield_checks (
  id uuid primary key,
  client_id text not null references public.shield_sites(client_id) on delete cascade,
  checked_at timestamptz not null,
  status text not null check (status in ('up', 'degraded', 'down', 'unknown')),
  http_status integer,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  error text
);

create table if not exists public.shield_telemetry (
  id uuid primary key,
  client_id text not null references public.shield_sites(client_id) on delete cascade,
  event_type text not null check (event_type in ('pageview', 'performance', 'client_error')),
  received_at timestamptz not null,
  session_hash text,
  path text not null default '/',
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.shield_errors (
  id uuid primary key,
  client_id text not null references public.shield_sites(client_id) on delete cascade,
  error_type text not null,
  message text not null,
  filename text not null default 'inline',
  line_number integer not null default 0,
  occurrences integer not null default 1 check (occurrences > 0),
  status text not null default 'open' check (status in ('open', 'resolved')),
  first_seen timestamptz not null,
  last_seen timestamptz not null,
  resolved_at timestamptz
);

create table if not exists public.shield_logs (
  id uuid primary key,
  client_id text not null references public.shield_sites(client_id) on delete cascade,
  severity text not null,
  subsystem text not null,
  event_type text not null,
  message text not null,
  logged_at timestamptz not null
);

create index if not exists shield_checks_client_time_idx
  on public.shield_checks (client_id, checked_at desc);
create index if not exists shield_telemetry_client_time_idx
  on public.shield_telemetry (client_id, received_at desc);
create index if not exists shield_telemetry_type_time_idx
  on public.shield_telemetry (event_type, received_at desc);
create index if not exists shield_errors_client_status_idx
  on public.shield_errors (client_id, status, last_seen desc);
create index if not exists shield_logs_client_time_idx
  on public.shield_logs (client_id, logged_at desc);

alter table public.shield_sites enable row level security;
alter table public.shield_checks enable row level security;
alter table public.shield_telemetry enable row level security;
alter table public.shield_errors enable row level security;
alter table public.shield_logs enable row level security;

revoke all on table public.shield_sites from anon, authenticated;
revoke all on table public.shield_checks from anon, authenticated;
revoke all on table public.shield_telemetry from anon, authenticated;
revoke all on table public.shield_errors from anon, authenticated;
revoke all on table public.shield_logs from anon, authenticated;

grant all on table public.shield_sites to service_role;
grant all on table public.shield_checks to service_role;
grant all on table public.shield_telemetry to service_role;
grant all on table public.shield_errors to service_role;
grant all on table public.shield_logs to service_role;
