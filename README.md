# Mayford Foods GH - Full-Stack Modern Web Platform & Operations Hub

Modernized, high-performance web platform and real-time operations engine for **Mayford Foods GH** (Adabraka & Dzorwulu branches in Accra, Ghana). Powered by **Supabase (PostgreSQL)** for data storage, **Resend** for transactional email delivery, and **Paystack** for Ghana GHS payment collection.

---

## Cloud Architecture: Supabase & Resend

| Service | Role | Configuration / Details |
|---|---|---|
| **Supabase** | Cloud PostgreSQL Database & Session Store | All 16 tables, check constraints, indexes, RLS policies, and RPC visitor counter ([`sql/supabase_schema.sql`](sql/supabase_schema.sql)). Direct connection via `DATABASE_URL` or `SUPABASE_DB_URL`. |
| **Resend** | Transactional & Branded Email Delivery | Dispatches branded HTML Academy Admission confirmations (`MFA-2026-XXXX`) and Customer Order receipts with cryptographic verification seals via `RESEND_API_KEY`. |
| **Paystack** | Payment Gateway (GHS) | Direct Mobile Money (MTN, Telecel, AirtelTigo) and Visa/Mastercard processing with HMAC-SHA256 signature verification. |

---

## Production Features Overview

### 1. Customer Experience & Branding
- **Elevated Brand Architecture**: Designed with inspiration from Airbnb and Uber/Uber Eats. Deep ink surfaces (`#111111`), warm neutrals (`#F7F7F7`), Mayford Crimson (`#B22222`), and crisp emerald accents.
- **Instant Scroll-to-Top Navigation**: Zero page-lag scroll resets (`<ScrollToTop />`) on all link clicks.
- **Anti-Distortion Skeleton Loading**: Fixed-aspect ratio skeletons (`aspect-[4/3]`) prevent layout shifts on slow mobile data connections.
- **Digital Menu & Cart**: Live cart state with quantity steppers, dynamic price recalculation, and branch selector.
- **Dynamic Delivery Zones**: Automated fee calculation for Accra zones (Adabraka, Dzorwulu, Achimota, Osu, East Legon, Spintex, Greater Accra).
- **Paystack Payment Integration**: Seamless inline and modal payment collection for Mobile Money (MTN, Telecel, AirtelTigo) and Bank Cards in GHS.
- **Real-Time Live Order Tracker (`/track-order`)**: 4-stage pipeline (*Order Received* $\rightarrow$ *Preparing* $\rightarrow$ *Ready for Dispatch/Pickup* $\rightarrow$ *Completed*) with background polling every 4 seconds and cryptographic verification seals (`MF-VRF-XXXXXXXX`).
- **Mayford Training Academy (`/training`)**: Structured admissions application with dynamic programme selector dropdowns and instant branded confirmation email generation via Resend.
- **Community Outreach (`/community`)**: Field documentation of meal donation drives and youth culinary mentorship.

---

### 2. Admin Operations & Kitchen Dispatch Hub
- **Security-Gated Access**: Dual-layer authentication with brute-force IP rate-limiting, timing-safe PIN check (`ADMIN_PIN`), and `scrypt` password hashing.
- **Real-Time "Always-On" Stream (SSE)**: Dedicated Server-Sent Events (`GET /api/admin/live-stream`) broadcasting new orders, status transitions, and payments instantly across kitchen terminals.
- **Synthesized Kitchen Audio Chime**: 3-tone Web Audio API synthesizer chime with persistent mute/unmute header toggle.
- **Live Dispatch Controls (`/admin/orders`)**:
  - Instant order prepending and visual highlight on new incoming orders.
  - **New In-Store Order** cashier flow with branch-scoped access, current-menu pricing, cash/MoMo/card tender, and payment collection status.
  - In-store sales are saved in the shared orders table and roll into paid revenue, outlet totals, order counts, top foods, sales-channel, and payment-mix reporting.
  - 1-click status pills (**`Pending`** $\rightarrow$ **`Preparing`** $\rightarrow$ **`Ready`** $\rightarrow$ **`Completed`**).
  - 1-click **Paid / Unpaid** payment toggle.
  - Full **Edit Order Modal** for modifying branch, delivery address, line items, and notes.
  - Automated WhatsApp and SMS customer dispatch alert generator.
- **Executive Analytics (`/admin/dashboard`)**:
  - Real-time revenue and Paystack settlement totals.
  - Live kitchen order breakdown.
  - Outlet performance comparison (Adabraka vs. Dzorwulu).
  - Fulfillment breakdown (Delivery vs. Pickup), sales-channel totals (Online vs. In-Store), and tender/payment mix.
  - Privacy-first visitor counter (removed from public footer and tracked in Admin).
- **Admissions CRM (`/admin/training-applications`)**:
  - Filter applicants by admission status (*New*, *Contacted*, *Interview Scheduled*, *Admitted*, *Archived*) and school.
  - Record interview notes and candidate follow-up records.
  - View exact dispatched branded confirmation email copies.
- **Cloud & Resend Diagnostics (`/admin/settings`)**:
  - Live indicator of Supabase / PostgreSQL database connection state.
  - Live Resend email test dispatcher tool.
  - Full Content & Menu Management (Dishes, Categories, Discounts, Adverts, Banners, Slides, Community).

---

### 3. Order Security & Anti-Bypass Architecture
1. **Authoritative Server-Side Pricing**: Client totals are recalculated on the server against the database prices, discounts, and delivery zones (`POST /api/orders`).
2. **HMAC-SHA256 Payment Verification Tokens**: `/api/payments/verify` signs Paystack transactions with a cryptographic token bound to `reference + verified_amount`. Tampered prices or forged `Paid` statuses are rejected (`403 Forbidden`).
3. **Anti-Replay Protection**: Reusing an existing Paystack reference across multiple orders is blocked (`409 Conflict`).
4. **Cryptographic Receipt Verification Seal**: Every completed order receives a unique tamper-proof signature (e.g. `MF-VRF-43138672`) verifiable on the customer receipt, tracker, and admin panel.
5. **Branch RBAC (IDOR Protection)**: Branch-level admins are cryptographically constrained to their assigned outlet (`outletScope(req)`).

---

## Setting Up Supabase & Resend

### 1. Supabase (Database) Setup
1. Create a project in [Supabase](https://supabase.com).
2. Go to **SQL Editor** $\rightarrow$ **New Query**.
3. For a **new/empty project only**, copy [`sql/supabase_schema.sql`](sql/supabase_schema.sql) into the SQL Editor and click **Run**. It drops/recreates tables, so do not rerun it on a database with data.
4. If your Supabase project already has the Mayford schema/data, **run the security hardening migration**:
   [`sql/migrations/20261005_harden_supabase_payment_security.sql`](sql/migrations/20261005_harden_supabase_payment_security.sql)
   This immediately locks down RLS policies, isolates financial/payment tables from the public Anon key, secures Paystack references with unique indexes, removes sensitive customer PII from public WebSockets, and provisions the tamper-proof `payment_audit_logs` ledger.
5. If in-store cashier orders are also needed, run [`sql/migrations/20261005_add_in_store_orders.sql`](sql/migrations/20261005_add_in_store_orders.sql).
6. Go to **Project Settings → Database → Connection string** (URI) and add the Supabase Postgres URI to your server environment.
   ```env
   SUPABASE_DB_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   SUPABASE_ONLY=true
   DEMO_MODE=off
   ```
   `DATABASE_URL` is also accepted instead of `SUPABASE_DB_URL`. With `SUPABASE_ONLY=true`, the server refuses MySQL and SQLite fallback if Supabase is unavailable.

### 2. Resend (Email Delivery) Setup
1. Create an account in [Resend](https://resend.com) and generate an API key (`re_...`).
2. Verify your sending domain (e.g. `mayfordfoodsgh.com`) or use onboarding sender in testing.
3. Add to your `.env`:
   ```env
   RESEND_API_KEY=re_your_api_key_here
   EMAIL_FROM=Mayford Foods GH <orders@mayfordfoodsgh.com>
   ```
4. Test email delivery directly from **Admin Panel $\rightarrow$ Settings $\rightarrow$ Resend Email Delivery Test**.

---

## Environment Configuration Reference

Create a `.env` in your production environment or root/`server`:

```env
# Server Port
PORT=4000

# Supabase PostgreSQL (Primary; URI copied from Supabase Project Settings → Database)
SUPABASE_DB_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
SUPABASE_ONLY=true
DEMO_MODE=off

# Resend Transactional Emails (Primary)
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=Mayford Foods GH <orders@mayfordfoodsgh.com>

# Paystack Payment Gateway (Ghana GHS)
PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key
PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret_key

# Security Secrets & Sessions
ADMIN_PIN=mayford2026
SESSION_SECRET=your-production-session-secret-32-chars-minimum
PAYMENT_SIGNING_SECRET=your-hmac-sha256-signing-secret

# Optional SMS Providers (Ghana)
ARKESEL_API_KEY=
HUBTEL_CLIENT_ID=
HUBTEL_CLIENT_SECRET=
SMS_SENDER_ID=MayfordGH
```

---

## Production Deployment Commands

```bash
# 1. Build Backend
cd server && npm install && npm run build

# 2. Build Frontend
cd ../react && npm install && npm run build

# 3. Start Production Server
cd ../server && npm start
```

---

## Standalone Sajama Shield

Sajama Shield runs independently under [`sajama-shield/`](sajama-shield/). Mayford loads the tag directly from `https://sajamashield.com/sajama-tag.js`; it sends telemetry straight to `https://sajamashield.com/api/shield/telemetry`. The registered Mayford site ID is `site_82be20b5-58ca-412a-998b-6a904a20eda7` (a public identifier, not a secret).

```bash
cd sajama-shield
npm ci
cp .env.example .env
# Set SAJAMA_SHIELD_KEY and SESSION_SECRET in .env before production use.
npm start
```

By default it serves its own dashboard and `/api/shield` API on port `5000`. In the Shield dashboard, **Add Site** generates a UUID site ID and automatically allows the origin from its Target URL. Use **Origins** on the selected site to add other exact origins such as `https://www.mayfordfoodsgh.com`; changes take effect immediately without editing `CORS_ORIGINS` or restarting Shield. That environment variable remains an optional global fallback that applies to every registered site; leave it blank for per-site management. See [`sajama-shield/README.md`](sajama-shield/README.md) for deployment and secret configuration. The optional Node telemetry client can be built from `sajama-shield/client-sdk`.

---

## Default Admin Credentials

| Username    | Password | Role           | Scope                 |
| ----------- | -------- | -------------- | --------------------- |
| `mainadmin` | `123456` | `super_admin`  | All branches & config |
| `adabraka`  | `123456` | `adabraka_admin` | Adabraka orders     |
| `dzorwulu`  | `123456` | `dzorwulu_admin` | Dzorwulu orders     |

- **Security PIN**: `mayford2026` (Configurable via `ADMIN_PIN`).
- Passwords can be changed anytime in **Settings $\rightarrow$ Update Staff Password** (hashed with `scrypt`).

---

## Image Handling & Media Performance

Every photo on the site is delivered as a small, modern, responsive image so pages
stay fast on Ghanaian mobile connections.

- **Two ways an image can arrive, both covered.**
  1. *Committed to the repo* (`react/public/assets/images/`): run `npm run images`
     (or let `predev`/`prebuild` do it) — this is the pipeline below.
  2. *Uploaded from the admin panel* (new dish, hero slide, advert, community
     photo): the API generates the same WebP ladder at runtime with `sharp`, so no
     rebuild or deploy is needed. Sizes are produced on demand, cached next to the
     uploads and served as static files, and `GET /api/image-manifest` tells the
     frontend the dimensions, placeholder colour and variant URLs.
- **Build-time pipeline.** `npm run images` (in `react/`) reads every file in
  `react/public/assets/images/`, writes WebP variants at 480 / 960 / 1600 px into
  `react/public/assets/images/optimized/`, and regenerates
  `react/src/generated/imageManifest.ts` (intrinsic size, dominant colour, variant
  URLs). Variants are committed, so installs, builds and deploys never need
  ImageMagick — only `npm run images` does (`magick` or `convert` on `PATH`).
  - Drop in a new photo and it is picked up automatically (`predev`/`prebuild`
    run the script in `--auto` mode, which skips quietly when ImageMagick is
    missing — the committed variants keep working). Use
    `npm run images -- --force` to rebuild, and `-- --shrink-originals` to also
    downscale oversized JPEG/PNG originals (these serve only as the
    `<picture>` fallback). Variants of renamed or deleted photos are pruned.
  - A file that cannot be processed still renders: the API scans the images
    folder, reports it in the manifest and builds its variants on first request,
    so nothing can silently drop out of the optimization path.
- **`<SmartImage>` component** (`react/src/components/SmartImage.tsx`) is used for
  every photo in the app. It emits a `<picture>` with the WebP `srcset`, an
  intrinsic `width`/`height` (no layout shift while loading), the photo's average
  colour as the placeholder tint (no white flash), `loading="lazy"` +
  `decoding="async"` by default, and a `fallbackSrc` chain instead of the old
  `onError` handlers. Use `priority` for the LCP image only (hero, dish preview)
  and pass `sizes` matching the layout, e.g.
  `sizes="(min-width: 1024px) 33vw, 100vw"`. `position` maps to
  `object-position` when a tall photo is cropped by a wide frame.
- **Admin uploads are optimized twice.** The browser re-encodes photos over
  ~350 KB to WebP with a 1600 px longest edge before sending them
  (`prepareImageForUpload` in `react/src/utils.ts`), and the API then generates
  the 480/960/1600 px ladder with `sharp` (`server/src/images.ts`) when the upload
  is saved. Deleting a slide, advert or community item also removes its generated
  variants. Video, GIF and SVG uploads pass through untouched.
- **Static media is cached** for a day with a week of `stale-while-revalidate`
  (`server/src/index.ts` + `vercel.json`); Vercel uploads under `/tmp` keep a
  1 hour TTL.
- Before the runtime manifest answers, an upload simply renders through
  `<SmartImage>` as a plain lazy `<img>` and upgrades to responsive variants as
  soon as the metadata lands — nothing ever appears broken.

---

## Deploying to Vercel

The repo is set up for Vercel out of the box (`vercel.json` + `api/index.ts`):

- The React app is built from `react/` and served as static files from `react/dist`.
- All `/api/*` routes run the Express app as a serverless function (`api/index.ts`).
- Import the repo in Vercel with the **Root Directory left as the repo root** (don't pick `react/` or `server/`), and Node.js **22.x**.
- Add the environment variables listed above in **Project → Settings → Environment Variables**. A Supabase Postgres URI (`SUPABASE_DB_URL` or `DATABASE_URL`) is required. Set `SUPABASE_ONLY=true` so the server fails closed instead of connecting to MySQL or temporary SQLite if Supabase is unavailable.
- Vercel's filesystem is temporary, so admin media uploads won't stick around between function instances. Use Supabase Storage or another external store for durable uploads. The runtime image derivatives (`sharp`) are generated on the same ephemeral disk and are cheap to rebuild, but they disappear with it — durable uploads on Supabase Storage would need the same treatment server-side.
- Server-Sent Events (`/api/admin/live-stream`) get cut off at the function's max duration (60s). The client reconnects automatically.
