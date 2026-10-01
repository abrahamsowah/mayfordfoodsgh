/**
 * Order lifecycle: create → confirm → prepare → ready → out for delivery →
 * completed (or cancelled). Every step is recorded as an `order_events` row so
 * customers can follow the order and admins have a full history.
 */
import { execute, nowSql, query, queryOne, beginTx } from './db';
import type { Row } from './db';
import { HttpError, clientIp, optionalPhone, orderCode, requireText, trackingToken, clean } from './security';
import { priceCart, summariseLines, type PricedCart } from './catalog';
import { settings as storeSettings, sendMail, brandWrap } from './notify';

export const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Ready',
  'Out for delivery',
  'Completed',
  'Cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Statuses the customer sees as "in progress" on the tracking page. */
export const TIMELINE_STEPS: { key: OrderStatus; label: string; description: string }[] = [
  { key: 'Pending', label: 'Order received', description: 'We have your order and will confirm shortly.' },
  { key: 'Confirmed', label: 'Confirmed', description: 'The kitchen has accepted your order.' },
  { key: 'Preparing', label: 'Preparing', description: 'Your food is being prepared fresh.' },
  { key: 'Ready', label: 'Ready', description: 'Packed and ready to go.' },
  { key: 'Out for delivery', label: 'Out for delivery', description: 'A rider is on the way to you.' },
  { key: 'Completed', label: 'Completed', description: 'Delivered. Enjoy your meal!' },
];

export interface CreateOrderInput {
  customer_id?: number | null;
  customer_name: unknown;
  phone: unknown;
  email?: unknown;
  outlet: unknown;
  order_type: unknown;
  address?: unknown;
  order_details?: unknown;
  notes?: unknown;
  items?: unknown;
  legacy_food_item?: unknown;
  legacy_quantity?: unknown;
  payment_method?: unknown;
}

export interface CreatedOrder {
  order: Row;
  lines: PricedCart['lines'];
  tracking_token: string;
  whatsapp_url: string;
}

/**
 * Legacy clients (and the original PHP flow) sent a single food name +
 * quantity instead of a cart. Translate that into a priced line so nothing
 * breaks for a cached bundle.
 */
async function legacyItems(foodItem: unknown, quantity: unknown): Promise<{ id: number; quantity: number }[]> {
  const name = clean(foodItem, 190);
  const qty = Math.max(1, Math.min(99, Number(quantity) || 1));
  if (!name) throw new HttpError(400, 'Your cart is empty.');
  const rows = await query('SELECT id, food_name FROM menu_items WHERE LOWER(food_name) = LOWER(?) LIMIT 1', [name]);
  if (!rows[0]) throw new HttpError(400, `"${name}" is no longer on the menu. Please refresh and add it again.`);
  return [{ id: Number(rows[0].id), quantity: qty }];
}

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const store = await storeSettings();

  const customer_name = requireText(input.customer_name, 'Full name', { min: 2, max: 120 });
  const phone = optionalPhone(input.phone, 'Phone number');
  if (!phone) throw new HttpError(400, 'Phone number is required.');

  const outlet = clean(input.outlet, 40);
  if (!['Adabraka', 'Dzorwulu'].includes(outlet)) throw new HttpError(400, 'Choose a valid outlet (Adabraka or Dzorwulu).');

  const orderType = clean(input.order_type, 20) || 'Delivery';
  if (!['Delivery', 'Pickup'].includes(orderType)) throw new HttpError(400, 'Order type must be Delivery or Pickup.');

  const address = orderType === 'Delivery' ? requireText(input.address, 'Delivery address', { min: 5, max: 300 }) : clean(input.address, 300) || null;

  const emailRaw = clean(input.email, 200).toLowerCase();
  const email = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(emailRaw) ? emailRaw : null;

  const paymentMethod = clean(input.payment_method, 20) || 'cash';
  if (!['paystack', 'cash', 'momo'].includes(paymentMethod)) throw new HttpError(400, 'Unsupported payment method.');

  const items = Array.isArray(input.items) && input.items.length > 0 ? input.items : await legacyItems(input.legacy_food_item, input.legacy_quantity);
  const priced = await priceCart(items, orderType);

  const code = orderCode();
  const token = trackingToken();
  const notes = clean(input.order_details ?? input.notes, 500) || null;

  const tx = await beginTx();
  try {
    const inserted = await tx.execute(
      `INSERT INTO orders
        (order_code, customer_id, customer_name, phone, email, food_item, quantity, outlet, order_type, address,
         order_details, subtotal, delivery_fee, total, payment_method, payment_status, status,
         notification_status, order_date, updated_at, tracking_token)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'Pending', 'new', ?, ?, ?)`,
      [
        code,
        input.customer_id ?? null,
        customer_name,
        phone,
        email,
        priced.lines[0]?.food_name ?? 'Order',
        priced.itemCount,
        outlet,
        orderType,
        address,
        notes,
        priced.subtotal,
        priced.deliveryFee,
        priced.total,
        paymentMethod,
        'unpaid',
        nowSql(),
        nowSql(),
        token,
      ]
    );
    const orderId = inserted.insertId;

    for (const line of priced.lines) {
      await tx.execute(
        `INSERT INTO order_items (order_id, menu_item_id, food_name, unit_price, quantity, line_total) VALUES (?,?,?,?,?,?)`,
        [orderId, line.menu_item_id, line.food_name, line.unit_price, line.quantity, line.line_total]
      );
    }
    await tx.execute(`INSERT INTO order_events (order_id, status, note, actor, created_at) VALUES (?,?,?,?,?)`, [
      orderId,
      'Pending',
      'Order received through the website',
      'system',
      nowSql(),
    ]);
    await tx.commit();

    const order = (await queryOne('SELECT * FROM orders WHERE id = ?', [orderId])) as Row;

    // Fire-and-forget notifications: never block the customer on SMTP.
    void notifyNewOrder(order, priced, store).catch(() => undefined);

    const waNumber = outlet === 'Adabraka' ? store.adabraka_phone : store.dzorwulu_phone;
    const waMessage = [
      'NEW MAYFORD FOODS ORDER',
      `Order code: ${code}`,
      `Name: ${customer_name}`,
      `Phone: ${phone}`,
      `Outlet: ${outlet}`,
      `Type: ${orderType}`,
      address ? `Address: ${address}` : '',
      '',
      summariseLines(priced.lines),
      '',
      `Subtotal: GHS ${priced.subtotal.toFixed(2)}`,
      priced.deliveryFee ? `Delivery: GHS ${priced.deliveryFee.toFixed(2)}` : '',
      `TOTAL: GHS ${priced.total.toFixed(2)}`,
      '',
      `Track this order: ${publicTrackUrl(token)}`,
      notes ? `Notes: ${notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      order,
      lines: priced.lines,
      tracking_token: token,
      whatsapp_url: `https://wa.me/${waNumber.replace(/\D/g, '').replace(/^0/, '233')}?text=${encodeURIComponent(waMessage)}`,
    };
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export function publicTrackUrl(token: string): string {
  const base = (process.env.APP_URL || process.env.PUBLIC_SITE_URL || 'https://mayfordfoodsgh.com').replace(/\/$/, '');
  return `${base}/track/${token}`;
}

async function notifyNewOrder(order: Row, priced: PricedCart, store: { email: string; adabraka_phone: string; dzorwulu_phone: string }) {
  const adminBody = brandWrap(`New order ${order.order_code}`, [
    `Customer: ${order.customer_name} (${order.phone})`,
    `Outlet: ${order.outlet} — ${order.order_type}`,
    order.address ? `Address: ${order.address}` : '',
    '',
    summariseLines(priced.lines),
    '',
    `Total: GHS ${Number(order.total).toFixed(2)} (${order.payment_method === 'paystack' ? 'online payment' : 'pay on delivery'})`,
    `Track: ${publicTrackUrl(String(order.tracking_token))}`,
  ].filter(Boolean));
  await sendMail({ to: store.email, subject: `New order ${order.order_code} — Mayford Foods GH`, body: adminBody, relatedType: 'order', relatedId: order.id });

  if (order.email) {
    const customerBody = brandWrap(`Thank you, ${order.customer_name}!`, [
      `We have received order ${order.order_code}.`,
      '',
      summariseLines(priced.lines),
      '',
      `Total: GHS ${Number(order.total).toFixed(2)}`,
      order.payment_method === 'paystack' && order.payment_status !== 'paid'
        ? 'Your order will be prepared once payment is confirmed.'
        : 'We will confirm your order shortly on the phone number you gave us.',
      '',
      `Follow your order live: ${publicTrackUrl(String(order.tracking_token))}`,
      '',
      `Questions? Call Adabraka ${store.adabraka_phone} or Dzorwulu ${store.dzorwulu_phone}.`,
    ]);
    await sendMail({ to: order.email, subject: `Order ${order.order_code} received — Mayford Foods GH`, body: customerBody, relatedType: 'order', relatedId: order.id });
  }
}

/** The customer-facing timeline built from the recorded events. */
export async function orderTimeline(orderId: number, status: string) {
  const events = await query('SELECT * FROM order_events WHERE order_id = ? ORDER BY id ASC', [orderId]);
  if (events.length > 0) {
    return events.map((e) => ({
      status: String(e.status),
      note: e.note ? String(e.note) : null,
      at: String(e.created_at),
    }));
  }
  return [{ status: String(status), note: 'Order received', at: null }];
}

export async function orderItems(orderId: number) {
  return query('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC', [orderId]);
}

/** Full order payload shaped for the API (items + timeline + current status). */
export async function orderDetail(order: Row, { includePrivate = true }: { includePrivate?: boolean } = {}) {
  const [items, timeline, payment] = await Promise.all([
    orderItems(Number(order.id)),
    orderTimeline(Number(order.id), String(order.status)),
    queryOne('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1', [Number(order.id)]),
  ]);
  // Mark every step up to the furthest one reached as complete, so a customer
  // never sees "Out for delivery" while "Confirmed" still looks pending.
  const reached = timeline.reduce((max, t) => {
    const idx = TIMELINE_STEPS.findIndex((s) => s.key === t.status);
    return idx > max ? idx : max;
  }, -1);
  const completedReached = timeline.some((t) => t.status === 'Completed');
  const steps = TIMELINE_STEPS.map((step, idx) => ({
    key: step.key,
    label: step.label,
    description: step.description,
    done: idx <= reached && (step.key !== 'Completed' || completedReached),
    at: timeline.find((t) => t.status === step.key)?.at ?? null,
  }));
  const cancelled = String(order.status).startsWith('Cancelled');
  return {
    order: {
      id: Number(order.id),
      order_code: order.order_code || `MF-${order.id}`,
      customer_name: order.customer_name,
      phone: includePrivate ? order.phone : maskPhone(String(order.phone || '')),
      email: includePrivate ? order.email ?? null : null,
      outlet: order.outlet,
      order_type: order.order_type,
      address: includePrivate ? order.address ?? null : null,
      notes: order.order_details ?? null,
      subtotal: Number(order.subtotal || 0),
      delivery_fee: Number(order.delivery_fee || 0),
      total: Number(order.total || 0),
      status: order.status,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      payment_reference: includePrivate ? order.payment_reference ?? null : null,
      courier_name: order.courier_name ?? null,
      courier_phone: order.courier_phone ?? null,
      eta_minutes: order.eta_minutes ?? null,
      cancel_reason: order.cancel_reason ?? null,
      tracking_token: includePrivate ? order.tracking_token ?? null : null,
      created_at: order.order_date,
      updated_at: order.updated_at ?? order.order_date,
    },
    items: items.map((i) => ({
      menu_item_id: i.menu_item_id,
      food_name: i.food_name,
      unit_price: Number(i.unit_price),
      quantity: Number(i.quantity),
      line_total: Number(i.line_total),
    })),
    timeline,
    steps,
    cancelled,
    payment: payment
      ? { provider: payment.provider, reference: payment.reference, status: payment.status, amount: Number(payment.amount), channel: payment.channel, paid_at: payment.paid_at }
      : null,
  };
}

function maskPhone(phone: string): string {
  if (phone.length < 6) return '•••••';
  return `${phone.slice(0, 4)}•••${phone.slice(-3)}`;
}

/** Moves an order to a new status, records the event and notifies the customer. */
export async function advanceOrder(
  orderId: number,
  status: OrderStatus,
  opts: { note?: string | null; actor?: string; courier_name?: string | null; courier_phone?: string | null; eta_minutes?: number | null; reason?: string | null } = {}
): Promise<Row> {
  const order = await queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) throw new HttpError(404, 'Order not found.');
  const previous = String(order.status);

  await execute('UPDATE orders SET status = ?, updated_at = ?, courier_name = COALESCE(?, courier_name), courier_phone = COALESCE(?, courier_phone), eta_minutes = COALESCE(?, eta_minutes), cancel_reason = CASE WHEN ? LIKE \'%Cancelled%\' THEN ? ELSE cancel_reason END WHERE id = ?', [
    status,
    nowSql(),
    opts.courier_name ?? null,
    opts.courier_phone ?? null,
    opts.eta_minutes ?? null,
    status,
    opts.reason ?? null,
    orderId,
  ]);
  await execute('INSERT INTO order_events (order_id, status, note, actor, created_at) VALUES (?,?,?,?,?)', [
    orderId,
    status,
    opts.note ?? null,
    opts.actor ?? 'admin',
    nowSql(),
  ]);

  const updated = (await queryOne('SELECT * FROM orders WHERE id = ?', [orderId])) as Row;
  void notifyStatusChange(updated, previous, opts).catch(() => undefined);
  return updated;
}

async function notifyStatusChange(order: Row, previous: string, opts: { note?: string | null; courier_name?: string | null; courier_phone?: string | null; eta_minutes?: number | null; reason?: string | null }) {
  const store = await storeSettings();
  let email = order.email ? String(order.email) : null;
  if (!email && order.customer_id) {
    const customer = await queryOne('SELECT email FROM customers WHERE id = ?', [Number(order.customer_id)]);
    email = customer?.email ? String(customer.email) : null;
  }
  if (!email) return;
  const lines = [
    `${order.order_code} is now: ${order.status} (was ${previous}).`,
    opts.note ? `Note: ${opts.note}` : '',
    opts.courier_name ? `Rider: ${opts.courier_name}${opts.courier_phone ? ` — ${opts.courier_phone}` : ''}` : '',
    opts.eta_minutes ? `Estimated time: about ${opts.eta_minutes} minutes.` : '',
    opts.reason ? `Reason: ${opts.reason}` : '',
    '',
    `Track your order: ${publicTrackUrl(String(order.tracking_token))}`,
    `Adabraka ${store.adabraka_phone} | Dzorwulu ${store.dzorwulu_phone}`,
  ].filter(Boolean);
  await sendMail({
    to: email,
    subject: `Order ${order.order_code}: ${order.status} — Mayford Foods GH`,
    body: brandWrap('Order update', lines),
    relatedType: 'order',
    relatedId: order.id,
  });
}

/** Marks an order paid (used by Paystack webhook/verify and cash settlement). */
export async function markOrderPaid(order: Row, info: { reference?: string | null; channel?: string | null; method?: string; amount?: number }) {
  const paidAt = nowSql();
  await execute(
    `UPDATE orders SET payment_status = 'paid', paid_at = ?, payment_reference = ?, payment_method = ?, updated_at = ? WHERE id = ?`,
    [paidAt, info.reference ?? null, info.method ?? order.payment_method, paidAt, Number(order.id)]
  );
  await execute('INSERT INTO order_events (order_id, status, note, actor, created_at) VALUES (?,?,?,?,?)', [
    Number(order.id),
    String(order.status),
    `Payment confirmed${info.reference ? ` (ref ${info.reference})` : ''}`,
    'payment',
    paidAt,
  ]);
  const updated = (await queryOne('SELECT * FROM orders WHERE id = ?', [Number(order.id)])) as Row;
  if (updated.email) {
    const store = await storeSettings();
    await sendMail({
      to: String(updated.email),
      subject: `Payment received for ${updated.order_code} — Mayford Foods GH`,
      body: brandWrap('Payment confirmed', [
        `We have received GHS ${Number(updated.total).toFixed(2)} for order ${updated.order_code}.`,
        info.reference ? `Reference: ${info.reference}` : '',
        '',
        'Your order is now being prepared.',
        `Track it: ${publicTrackUrl(String(updated.tracking_token))}`,
        '',
        `Questions? Call Adabraka ${store.adabraka_phone} or Dzorwulu ${store.dzorwulu_phone}.`,
      ].filter(Boolean)),
      relatedType: 'order',
      relatedId: updated.id,
    });
  }
  return updated;
}

/** Best-effort request metadata for audit entries (unused fields are fine). */
export function requestMeta(req: { headers: Record<string, any>; socket?: any }) {
  return { ip: clientIp(req as any), ua: String(req.headers['user-agent'] || '').slice(0, 200) };
}
