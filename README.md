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
  - 1-click status pills (**`Pending`** $\rightarrow$ **`Preparing`** $\rightarrow$ **`Ready`** $\rightarrow$ **`Completed`**).
  - 1-click **Paid / Unpaid** payment toggle.
  - Full **Edit Order Modal** for modifying branch, delivery address, line items, and notes.
  - Automated WhatsApp and SMS customer dispatch alert generator.
- **Executive Analytics (`/admin/dashboard`)**:
  - Real-time revenue and Paystack settlement totals.
  - Live kitchen order breakdown.
  - Outlet performance comparison (Adabraka vs. Dzorwulu).
  - Fulfillment breakdown (Delivery vs. Pickup).
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
3. Copy the entire contents of [`sql/supabase_schema.sql`](sql/supabase_schema.sql) and click **Run**.
4. Go to **Project Settings** $\rightarrow$ **Database** $\rightarrow$ **Connection string** (URI).
5. Add to your `.env`:
   ```env
   DATABASE_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   ```

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

# Supabase PostgreSQL Database (Primary)
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
DEMO_MODE=auto

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

## Default Admin Credentials

| Username    | Password | Role           | Scope                 |
| ----------- | -------- | -------------- | --------------------- |
| `mainadmin` | `123456` | `super_admin`  | All branches & config |
| `adabraka`  | `123456` | `adabraka_admin` | Adabraka orders     |
| `dzorwulu`  | `123456` | `dzorwulu_admin` | Dzorwulu orders     |

- **Security PIN**: `mayford2026` (Configurable via `ADMIN_PIN`).
- Passwords can be changed anytime in **Settings $\rightarrow$ Update Staff Password** (hashed with `scrypt`).
