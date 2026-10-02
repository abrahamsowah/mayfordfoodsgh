-- ============================================================================
-- SAJAMA SHIELD - Standalone Database Schema (PostgreSQL / Supabase)
-- ============================================================================
-- Full multi-tenant schema for autonomous client telemetry, real-time security,
-- Core Web Vitals RUM, error intelligence, and executive client reports.

CREATE TABLE IF NOT EXISTS shield_sites (
  id BIGSERIAL PRIMARY KEY,
  client_id VARCHAR(64) UNIQUE NOT NULL,
  site_name VARCHAR(255) NOT NULL,
  site_url VARCHAR(500) NOT NULL,
  environment VARCHAR(32) NOT NULL DEFAULT 'production',
  category VARCHAR(64) NOT NULL DEFAULT 'Web Application',
  status VARCHAR(32) NOT NULL DEFAULT 'operational', -- 'operational', 'degraded', 'down', 'maintenance'
  health_score INTEGER NOT NULL DEFAULT 100,
  uptime_percentage NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
  avg_latency_ms INTEGER NOT NULL DEFAULT 28,
  p95_latency_ms INTEGER NOT NULL DEFAULT 45,
  primary_region VARCHAR(100) NOT NULL DEFAULT 'af-south-1 (Accra / West Africa)',
  sla_target NUMERIC(5, 2) NOT NULL DEFAULT 99.95,
  ssl_days_remaining INTEGER NOT NULL DEFAULT 90,
  security_score VARCHAR(8) NOT NULL DEFAULT 'A+',
  alert_email VARCHAR(255),
  webhook_url TEXT,
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real-time Synthetic Probes & SLA Checks
CREATE TABLE IF NOT EXISTS shield_health_probes (
  id BIGSERIAL PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL REFERENCES shield_sites(client_id) ON DELETE CASCADE,
  status_code INTEGER NOT NULL DEFAULT 200,
  latency_ms INTEGER NOT NULL,
  probe_node VARCHAR(64) NOT NULL DEFAULT 'accra-edge-01',
  ssl_valid BOOLEAN NOT NULL DEFAULT TRUE,
  ssl_days_left INTEGER,
  security_headers_passed INTEGER NOT NULL DEFAULT 6,
  is_up BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Core Web Vitals & Real User Monitoring (RUM)
CREATE TABLE IF NOT EXISTS shield_web_vitals (
  id BIGSERIAL PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL REFERENCES shield_sites(client_id) ON DELETE CASCADE,
  session_id VARCHAR(64) NOT NULL,
  url_path VARCHAR(255) NOT NULL,
  ttfb_ms INTEGER,
  fcp_ms INTEGER,
  lcp_ms INTEGER,
  cls NUMERIC(6, 4),
  inp_ms INTEGER,
  dom_ready_ms INTEGER,
  full_load_ms INTEGER,
  connection_type VARCHAR(16) DEFAULT '4g',
  screen_resolution VARCHAR(32),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sanitized Client Error Tracking Radar
CREATE TABLE IF NOT EXISTS shield_error_events (
  id BIGSERIAL PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL REFERENCES shield_sites(client_id) ON DELETE CASCADE,
  error_type VARCHAR(64) NOT NULL,
  message TEXT NOT NULL,
  filename VARCHAR(255),
  lineno INTEGER,
  colno INTEGER,
  stack_fingerprint VARCHAR(64),
  occurrences INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(32) NOT NULL DEFAULT 'unresolved', -- 'unresolved', 'investigating', 'resolved', 'ignored'
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Conversion Funnel & Business Value Tracking
CREATE TABLE IF NOT EXISTS shield_conversions (
  id BIGSERIAL PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL REFERENCES shield_sites(client_id) ON DELETE CASCADE,
  session_id VARCHAR(64) NOT NULL,
  goal_name VARCHAR(64) NOT NULL,
  value_ghs NUMERIC(10, 2) DEFAULT 0.00,
  url_path VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Executive Audit Reports History
CREATE TABLE IF NOT EXISTS shield_executive_reports (
  id BIGSERIAL PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL REFERENCES shield_sites(client_id) ON DELETE CASCADE,
  report_uid VARCHAR(64) UNIQUE NOT NULL,
  period_label VARCHAR(64) NOT NULL,
  overall_grade VARCHAR(8) NOT NULL DEFAULT 'A+',
  uptime_pct NUMERIC(5, 2) NOT NULL,
  report_payload JSONB NOT NULL,
  generated_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System & Audit Logs
CREATE TABLE IF NOT EXISTS shield_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL DEFAULT 'GLOBAL',
  severity VARCHAR(16) NOT NULL DEFAULT 'INFO', -- 'INFO', 'WARN', 'CRITICAL', 'AUDIT'
  subsystem VARCHAR(64) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  message TEXT NOT NULL,
  geo_region VARCHAR(64) DEFAULT 'Accra, GH',
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_shield_probes_client ON shield_health_probes(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shield_vitals_client ON shield_web_vitals(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shield_errors_client ON shield_error_events(client_id, status);
CREATE INDEX IF NOT EXISTS idx_shield_logs_client ON shield_audit_logs(client_id, logged_at DESC);
