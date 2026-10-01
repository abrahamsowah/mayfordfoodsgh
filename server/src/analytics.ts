/**
 * Business analytics: traffic, sales, revenue, customers, menu performance.
 *
 * Every figure is computed from real rows (orders, payments, page_views,
 * customers) — nothing is faked, so the dashboard is trustworthy.
 */
import { query, queryOne, nowSql } from './db';

export type Range = 'today' | '7d' | '30d' | '90d' | 'ytd' | 'all';

export function rangeStart(range: Range): string | null {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = (x: Date) => `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())} 00:00:00`;
  switch (range) {
    case 'today':
      return stamp(d);
    case '7d':
      d.setDate(d.getDate() - 6);
      return stamp(d);
    case '30d':
      d.setDate(d.getDate() - 29);
      return stamp(d);
    case '90d':
      d.setDate(d.getDate() - 89);
      return stamp(d);
    case 'ytd':
      return `${d.getFullYear()}-01-01 00:00:00`;
    default:
      return null;
  }
}

function dayKey(value: unknown): string {
  return String(value || '').slice(0, 10);
}

const REVENUE_STATUSES = `payment_status = 'paid'`;

export interface AnalyticsSummary {
  range: Range;
  from: string | null;
  generated_at: string;
  sales: {
    orders: number;
    completed: number;
    cancelled: number;
    pending: number;
    in_progress: number;
    revenue: number;
    paid_revenue: number;
    unpaid_value: number;
    average_order_value: number;
    items_sold: number;
    channel_split: { paystack: number; cash: number };
  };
  traffic: {
    visits: number;
    unique_visitors: number;
    page_views: number;
    today_views: number;
    top_pages: { path: string; views: number }[];
    sources: { source: string; visits: number }[];
    devices: { device: string; visits: number }[];
    daily: { date: string; views: number; visitors: number }[];
  };
  customers: {
    total: number;
    new_in_range: number;
    repeat: number;
    top: { name: string; phone: string; orders: number; spent: number }[];
  };
  menu: { name: string; quantity: number; revenue: number }[];
  payments: { status: string; count: number; amount: number }[];
  daily_sales: { date: string; orders: number; revenue: number }[];
  conversion: { rate: number; note: string };
}

export async function analyticsSummary(range: Range = '30d'): Promise<AnalyticsSummary> {
  const from = rangeStart(range);
  const orderWhere = from ? `WHERE order_date >= ?` : '';
  const orderParams = from ? [from] : [];
  const paidWhere = from ? `WHERE ${REVENUE_STATUSES} AND order_date >= ?` : `WHERE ${REVENUE_STATUSES}`;

  /* ---------- sales ---------- */
  const counts = await queryOne(
    `SELECT COUNT(*) AS orders,
            SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN status LIKE 'Cancelled%' THEN 1 ELSE 0 END) AS cancelled,
            SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN status IN ('Confirmed','Preparing','Ready','Out for delivery') THEN 1 ELSE 0 END) AS in_progress,
            SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END) AS paid_revenue,
            SUM(CASE WHEN payment_status = 'unpaid' THEN total ELSE 0 END) AS unpaid_value,
            SUM(total) AS gross_value
     FROM orders ${orderWhere}`,
    orderParams
  );
  const paidSplit = await queryOne(
    `SELECT SUM(CASE WHEN payment_method = 'paystack' THEN total ELSE 0 END) AS paystack,
            SUM(CASE WHEN payment_method <> 'paystack' THEN total ELSE 0 END) AS cash
     FROM orders ${paidWhere}`,
    orderParams
  );
  const items = await queryOne(
    `SELECT COALESCE(SUM(quantity),0) AS items FROM orders ${orderWhere ? `${orderWhere} AND` : 'WHERE'} 1=1`,
    orderParams
  );
  const daySales = await query(
    `SELECT order_date, COUNT(*) AS orders, SUM(total) AS revenue,
            SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END) AS paid
     FROM orders ${orderWhere} GROUP BY SUBSTR(order_date, 1, 10) ORDER BY order_date ASC`,
    orderParams
  );

  // Fill missing days so charts never lie about gaps.
  const dailySales = fillDays(daySales, range, (date) => {
    const row = daySales.find((r) => dayKey(r.order_date) === date);
    return { date, orders: Number(row?.orders || 0), revenue: Number(row?.paid || 0) };
  });

  /* ---------- traffic ---------- */
  const viewsWhere = from ? 'WHERE created_at >= ?' : '';
  const views = await queryOne(
    `SELECT COUNT(*) AS views, COUNT(DISTINCT session_key) AS visitors FROM page_views ${viewsWhere}`,
    orderParams
  );
  const todayViews = await queryOne(
    `SELECT COUNT(*) AS views, COUNT(DISTINCT session_key) AS visitors FROM page_views WHERE created_at >= ?`,
    [new Date(new Date().setHours(0, 0, 0, 0)).toISOString().slice(0, 10) + ' 00:00:00']
  );
  const topPages = await query(
    `SELECT path, COUNT(*) AS views FROM page_views ${viewsWhere} GROUP BY path ORDER BY views DESC LIMIT 10`,
    orderParams
  );
  const sources = await query(
    `SELECT COALESCE(NULLIF(source,''),'direct') AS source, COUNT(*) AS visits FROM page_views ${viewsWhere} GROUP BY source ORDER BY visits DESC LIMIT 8`,
    orderParams
  );
  const devices = await query(
    `SELECT COALESCE(NULLIF(device,''),'unknown') AS device, COUNT(*) AS visits FROM page_views ${viewsWhere} GROUP BY device ORDER BY visits DESC LIMIT 6`,
    orderParams
  );
  const dailyViews = await query(
    `SELECT SUBSTR(created_at,1,10) AS date, COUNT(*) AS views, COUNT(DISTINCT session_key) AS visitors
     FROM page_views ${viewsWhere} GROUP BY SUBSTR(created_at,1,10) ORDER BY date ASC`,
    orderParams
  );
  const visitCounter = await queryOne('SELECT total_visitors FROM visitor_counter WHERE id = 1');
  const daily = fillDays(dailyViews, range, (date) => {
    const row = dailyViews.find((r) => dayKey(r.date) === date);
    return { date, views: Number(row?.views || 0), visitors: Number(row?.visitors || 0) };
  });

  /* ---------- customers ---------- */
  const customerTotal = await queryOne('SELECT COUNT(*) AS c FROM customers');
  const newCustomers = from ? await queryOne('SELECT COUNT(*) AS c FROM customers WHERE created_at >= ?', [from]) : { c: customerTotal?.c || 0 };
  const repeat = await queryOne(
    `SELECT COUNT(*) AS c FROM (
       SELECT COALESCE(customer_id, phone) AS who FROM orders ${orderWhere} GROUP BY who HAVING COUNT(*) > 1
     ) t`,
    orderParams
  );
  const topCustomers = await query(
    `SELECT customer_name AS name, phone,
            COUNT(*) AS orders, SUM(total) AS spent
     FROM orders ${orderWhere} GROUP BY phone, customer_name ORDER BY spent DESC LIMIT 6`,
    orderParams
  );

  /* ---------- menu ---------- */
  const menuPerf = await query(
    `SELECT oi.food_name AS name, COALESCE(SUM(oi.quantity),0) AS quantity, SUM(oi.line_total) AS revenue
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     ${from ? 'WHERE o.order_date >= ?' : ''}
     GROUP BY oi.food_name ORDER BY quantity DESC LIMIT 8`,
    orderParams
  );

  /* ---------- payments ---------- */
  const payments = await query(
    `SELECT status, COUNT(*) AS count, COALESCE(SUM(amount),0) AS amount FROM payments
     ${from ? 'WHERE created_at >= ?' : ''} GROUP BY status`,
    orderParams
  );

  const completed = Number(counts?.completed || 0);
  const orderCount = Number(counts?.orders || 0);
  const visitCount = Number(views?.visitors || 0);

  return {
    range,
    from,
    generated_at: nowSql(),
    sales: {
      orders: orderCount,
      completed,
      cancelled: Number(counts?.cancelled || 0),
      pending: Number(counts?.pending || 0),
      in_progress: Number(counts?.in_progress || 0),
      revenue: round2(Number(counts?.paid_revenue || 0)),
      paid_revenue: round2(Number(counts?.paid_revenue || 0)),
      unpaid_value: round2(Number(counts?.unpaid_value || 0)),
      average_order_value: orderCount ? round2(Number(counts?.gross_value || 0) / orderCount) : 0,
      items_sold: Number(items?.items || 0),
      channel_split: {
        paystack: round2(Number(paidSplit?.paystack || 0)),
        cash: round2(Number(paidSplit?.cash || 0)),
      },
    },
    traffic: {
      visits: Number(visitCounter?.total_visitors || 0),
      unique_visitors: visitCount,
      page_views: Number(views?.views || 0),
      today_views: Number(todayViews?.views || 0),
      top_pages: topPages.map((r) => ({ path: String(r.path), views: Number(r.views) })),
      sources: sources.map((r) => ({ source: String(r.source), visits: Number(r.visits) })),
      devices: devices.map((r) => ({ device: String(r.device), visits: Number(r.visits) })),
      daily,
    },
    customers: {
      total: Number(customerTotal?.c || 0),
      new_in_range: Number(newCustomers?.c || 0),
      repeat: Number(repeat?.c || 0),
      top: topCustomers.map((r) => ({
        name: String(r.name),
        phone: String(r.phone),
        orders: Number(r.orders),
        spent: round2(Number(r.spent)),
      })),
    },
    menu: menuPerf.map((r) => ({ name: String(r.name), quantity: Number(r.quantity), revenue: round2(Number(r.revenue)) })),
    payments: payments.map((r) => ({ status: String(r.status), count: Number(r.count), amount: round2(Number(r.amount)) })),
    daily_sales: dailySales,
    conversion: {
      rate: visitCount ? round2((orderCount / visitCount) * 100) : 0,
      note: 'Orders divided by unique visitors in the selected period.',
    },
  };
}

function round2(n: number) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/** Expands sparse per-day rows into a continuous series. */
function fillDays<T>(rows: any[], range: Range, make: (date: string) => T): T[] {
  if (range === 'all') {
    return rows.map((r) => make(dayKey(r.date || r.order_date || r.created_at))).slice(-90);
  }
  const days = range === 'today' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
  const out: T[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const p = (n: number) => String(n).padStart(2, '0');
    out.push(make(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`));
  }
  return out;
}
