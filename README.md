# Mayford Foods GH — React + TypeScript + Tailwind + MySQL

The old PHP/MySQL website has been migrated to a modern stack:

| Layer      | Technology                                             |
| ---------- | ------------------------------------------------------ |
| Frontend   | React 19 + TypeScript (Vite) + Tailwind CSS 4, React Router |
| Backend    | Node.js + Express + TypeScript, cookie-session auth    |
| Database   | MySQL / MariaDB (schema in [`sql/mayfordfoodsgh.sql`](sql/mayfordfoodsgh.sql)) |

All original features are preserved:

- **Public site** — home page (hero image slider, rotating advertisement cards,
  latest advertisement videos, featured meals, outside catering, community impact,
  outlets, training, owners), About, Outlets, digital Menu (with QR page), Cart,
  Checkout, single-item quick order, Catering (gallery, video, booking form),
  Community (DB-driven media), Contact, Training Academy (application form),
  scrolling marquee banners, floating WhatsApp button with **Feedback** and
  **Rate Mayford** popups, visitor counter.
- **Orders** — checkout inserts the order into the `orders` table and opens
  WhatsApp with the full encoded order message (same flow as the PHP site).
- **Admin** — PIN gate (`mayford2026`) → username/password login → dashboard with
  revenue / pending / completed stats, live "new order / application / message"
  notifications with sound, orders with search + status filters + status updates,
  menu items (add/edit/delete with image upload), categories, discounts,
  advertisement banners, marquee banners, hero slides, ad videos, community media,
  ratings, catering bookings, contact messages (super admin), training
  applications, website settings, reset revenue (super admin).
- **Roles** — `super_admin` (mainadmin), `adabraka_admin` (adabraka) and
  `dzorwulu_admin` (dzorwulu) see only their outlet's orders, exactly like before.

## 1. Create the database

Copy the SQL and import it (phpMyAdmin → Import, or CLI):

```bash
mysql -u root -p < sql/mayfordfoodsgh.sql
```

The file creates the database `mayfordfoodsgh` with **all 15 tables** and starter
data (admins, banners, categories, menu items, slider images, settings, …).

## 2. Configure the server

```bash
cd server
cp .env.example .env   # then edit values if your MySQL is not local root/empty
```

Environment variables (see `.env.example`):

```
PORT=4000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=mayfordfoodsgh
ADMIN_PIN=mayford2026
SESSION_SECRET=change-me
DEMO_MODE=auto     # auto = fall back to SQLite demo DB if MySQL is unreachable
```

> **Demo mode:** if MySQL is not reachable the server automatically starts an
> in-file SQLite database (`server/data/demo.sqlite`) pre-loaded with the same
> schema and seed data, so you can run and preview the whole site before
> connecting MySQL. Set `DEMO_MODE=off` to force MySQL.

## 3. Run

```bash
# Terminal 1 — API server (also serves the built frontend)
cd server && npm install && npm run build && npm start

# Terminal 2 (dev only) — hot-reload frontend on http://localhost:5173
cd react && npm install && npm run dev
```

Production: `cd react && npm install && npm run build`, then the Express server
serves `react/dist` automatically on `http://localhost:4000`.

## 4. Admin access

1. Footer → tiny 🔒 link (or open `/admin-pin`)
2. PIN: `mayford2026`
3. Login (all passwords `123456`):

| Username    | Role               | Scope                 |
| ----------- | ------------------ | --------------------- |
| `mainadmin` | super_admin        | everything            |
| `adabraka`  | adabraka_admin     | Adabraka orders       |
| `dzorwulu`  | dzorwulu_admin     | Dzorwulu orders       |

## Project layout

```
sql/mayfordfoodsgh.sql   # full copy-paste MySQL schema + seed data
server/                  # Express + TS API (routes 1:1 with the old PHP endpoints)
  src/index.ts           # all API routes + static hosting of the built frontend
  src/db.ts              # MySQL driver with SQLite demo fallback
react/                   # Vite + React + TS + Tailwind
  public/assets/         # images / videos / sounds + admin uploads
    images/  videos/  sounds/  adverts/  community/
  src/pages/             # public + admin pages
  src/components/        # layout, cart, shared UI
```

## Notes on the migration

- The cart moved from PHP `$_SESSION` to `localStorage` (same behaviour, works
  across refreshes; the SPA is the only client).
- Discounts now apply to the cart/checkout total (the PHP site displayed the
  discount but charged the full price).
- The catering page now includes the booking form that feeds the existing
  `catering_bookings` table (the PHP page only had a WhatsApp link, but the
  table and admin view already existed).
- Passwords are stored/compared exactly as in the original database
  (plain text). Consider hashing them with `password_hash()`-style logic if you
  rotate accounts.
