# Sajama Shield

Sajama Shield is a standalone website monitor. It performs real HTTP checks from the Shield server and accepts browser performance/error telemetry directly from the installed tag. It does not use Mayford as a telemetry proxy, and it does not generate sample monitoring measurements.

## Run locally

Requires Node.js 22 or newer.

```sh
cd sajama-shield
npm ci
cp .env.example .env
# Set SAJAMA_SHIELD_KEY and SESSION_SECRET in the environment or deployment config.
npm start
```

The service listens on `0.0.0.0:5000` by default. The development-only default key is `sajama2026`; production requires a unique Shield key and a stable session secret, each at least 32 characters. Local JSON mode persists a snapshot in `shield-data.json` (ignored by Git).

## Configure

- `SAJAMA_SHIELD_KEY`: administrator sign-in key. Production requires a unique value of at least 32 characters and rejects the development default.
- `SESSION_SECRET`: stable, random session signing secret of at least 32 characters in production.
- `HOST`: bind address (default `0.0.0.0`).
- `PORT`: listener port (default `5000`).
- `MAYFORD_SITE_ID`: optional public site identifier for the initial Mayford monitor.
- `SHIELD_STORAGE_BACKEND`: `json` for local development or `supabase` for cloud persistence.
- `SUPABASE_URL`: the Supabase project URL, used by the Shield server only.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase key. Never expose it in browser code, the tag, or a client-side environment variable.

### Supabase persistence

Shield connects directly from its own Node.js server to Supabase; Mayford is not a proxy. To enable cloud storage:

1. Create or select a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in that project's SQL editor.
2. Set `SHIELD_STORAGE_BACKEND=supabase`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in the Shield server's environment. Keep the service-role key in server secrets only.
3. Restart Shield. Startup reads the Shield tables and verifies access before opening the HTTP listener. `/api/health` reports the selected storage backend and whether the most recent Supabase operation succeeded.

The dashboard reports **Supabase connected** only after a successful server-side operation; absent credentials select local JSON in development and do not indicate cloud connectivity. Configure Shield separately from Mayford, and do not add a Mayford API proxy. Supabase mode also maintains a local recovery snapshot and retries transient failed writes. Run `npm ci` after dependency changes.

The first site is Mayford Foods GH. The monitor starts with no measurements; real checks are added only after the first HTTP request completes. Checks run every 60 seconds from this Shield instance. They are not multi-region checks.

## Browser telemetry

Select **Install tag** in the dashboard and add the script to the monitored site. The browser sends telemetry directly to the Shield host. Add additional exact origins using **Origins**; the target origin is included automatically. The site ID is public, not a secret. Never put the Shield administrator key in browser code.

Shield stores real page-view, Web Vitals, and browser-error events received from the tag. Measurements with no samples are shown as unavailable rather than filled with defaults. Browser paths are stored without query strings; random per-tab session tokens are stored only as keyed hashes, and session counts are not person-level visitor counts.

## Monitoring scope

The current monitor performs a scheduled HTTP GET from one Shield instance, retains the last 24 hours of checks and browser telemetry, and provides a public status page at `/status/:clientId`. Failed request duration means elapsed time to failure, not an HTTP response time. This is a focused monitor, not feature-equivalent to a multi-region commercial observability platform.

For production, use HTTPS behind a trusted reverse proxy, a persistent session store if running multiple instances, a stable secret, and a durable database when the JSON store no longer suits the workload.
