# Sajama Shield — standalone observability console

Sajama Shield is a self-contained Express application. It does not import Mayford's React app, server, database, or session store. It serves its own dashboard, Shield API, client telemetry tag, and public status pages from this directory.

## Run locally

```bash
cd sajama-shield
npm ci
cp .env.example .env
# Edit .env and set a master key and session secret.
npm start
```

Open <http://localhost:5000>. For local development only, the default master key is `sajama2026`; you can also set `SAJAMA_SHIELD_KEY` in `.env`. Do not use the default key outside local development.

You can change `HOST` and `PORT`. The server binds to `0.0.0.0` by default so it works behind a reverse proxy or in a hosted preview. The API is served by this app under `/api/shield`; the dashboard calls that same-origin API. The telemetry tag is served at `/sajama-tag.js` and the public status page is `/status/:clientId`.

## Production configuration

Set these in `.env` or the hosting environment before starting with `NODE_ENV=production`:

- `SAJAMA_SHIELD_KEY`: a unique, long master key. Production startup rejects the development default.
- `SESSION_SECRET`: a stable random secret of at least 32 characters.
- `CORS_ORIGINS`: optional comma-separated global fallback that applies to every site. Prefer managing each client origin in the dashboard so the allowlist stays site-specific and updates without a restart.
- `SAJAMA_SHIELD_TOKEN`: optional shared token for the Node client agent's server-to-server heartbeat/log endpoints.
- `HOST` and `PORT`: default to `0.0.0.0` and `5000`.

The dashboard uses an HttpOnly, SameSite=Lax session cookie. Sessions are stored in the ignored `shield-sessions.json` file so they survive a single-process restart. This file store is for one Shield instance; use Redis or a database-backed session store if you run multiple instances. In production, terminate TLS at a trusted proxy and keep the session secret stable.

Application data (sites, logs, and error events) is stored in the ignored `shield-data.json` file. `schema.sql` documents a PostgreSQL schema for deployments that later move away from the built-in JSON repository; the current server does not require PostgreSQL.

## Dashboard API

The standalone UI and API are shipped together. Main routes include:

- `POST /api/shield/auth/login`, `GET /api/shield/auth/session`, and `POST /api/shield/auth/logout`
- `GET/POST /api/shield/sites`, `GET/PUT/DELETE /api/shield/sites/:clientId`
- `POST /api/shield/diagnose/:clientId` and `GET /api/shield/reports/:clientId`
- `GET /api/shield/logs` and `GET /api/shield/errors`
- Public tag ingestion: `POST /api/shield/telemetry`
- Optional Node agent ingestion: `POST /api/shield/ingest` and `POST /api/shield/logs`

`GET /api/health` provides a process health check. Dashboard management routes require the Shield login session (or an `X-Shield-Key` header for server-to-server administration). Secrets are not accepted in query strings. The Node agent routes use `X-Shield-Token` and require `SAJAMA_SHIELD_TOKEN` to be configured.

## Install the telemetry tag

In the dashboard, select **Add Site** and enter the site name and Target URL. Shield generates a unique `site_<UUID>` identifier and includes it in the **Client Tag** snippet. Paste that snippet into the client website, replacing the host only if your Shield deployment uses a different domain:

```html
<script src="https://shield.example.com/sajama-tag.js" data-site-id="site_550e8400-e29b-41d4-a716-446655440000" async></script>
```

For Mayford Foods GH, the deployed tag uses its registered site ID and sends directly to Sajama Shield:

```html
<script src="https://sajamashield.com/sajama-tag.js" data-site-id="site_82be20b5-58ca-412a-998b-6a904a20eda7" async></script>
```

The tag posts page/performance/error telemetry directly to the Shield host. The registered Target URL origin is allowed automatically. Open **Origins** in the Shield dashboard to add or remove other exact origins; updates are persisted and apply immediately without editing environment variables or restarting. The site ID is public, not a secret credential. Do not put the master key or agent token in browser code. CORS restricts browsers but does not authenticate non-browser requests.

## Build and use the Node client SDK

The SDK is an optional package in `client-sdk/`:

```bash
cd sajama-shield/client-sdk
npm ci
npm run build
```

Install that local package in a monitored Node service and configure its collector URL and token:

```ts
import { initSajamaShield } from '@sajama/shield-agent';

initSajamaShield({
  clientId: 'site_82be20b5-58ca-412a-998b-6a904a20eda7',
  clientToken: process.env.SAJAMA_SHIELD_TOKEN!,
  shieldCollectorUrl: 'https://shield.example.com/api/shield',
  environment: 'production',
});
```

`clientToken` must match `SAJAMA_SHIELD_TOKEN` configured on the Shield server. Set the URL to the public base API path; the agent appends `/ingest` and `/logs` itself.
