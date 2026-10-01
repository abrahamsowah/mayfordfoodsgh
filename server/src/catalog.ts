/**
 * Pricing authority.
 *
 * The single most important rule in a storefront: prices, discounts and totals
 * are calculated on the server from the database. The client can only send
 * item ids and quantities.
 */
import { query } from './db';
import type { Row } from './db';
import { HttpError, requireInt } from './security';

export interface CartLineInput {
  id: number;
  quantity: number;
}

export interface PricedLine {
  menu_item_id: number;
  food_name: string;
  unit_price: number;
  list_price: number;
  discount_percent: number;
  quantity: number;
  line_total: number;
  image: string;
  category: string;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: 'GHS';
  itemCount: number;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function effectivePrice(row: { price?: unknown; discount_percent?: unknown }): number {
  const price = Number(row.price || 0);
  const discount = Number(row.discount_percent || 0);
  return round2(discount > 0 ? price - (price * discount) / 100 : price);
}

export interface StoreConfig {
  currency: 'GHS';
  deliveryFee: number;
  freeDeliveryOver: number;
  paystackEnabled: boolean;
}

export async function loadStoreConfig(): Promise<StoreConfig> {
  const rows = await query('SELECT delivery_fee, free_delivery_over, paystack_enabled FROM website_settings WHERE id = 1');
  const row = rows[0] || {};
  const envFee = process.env.DELIVERY_FEE !== undefined ? Number(process.env.DELIVERY_FEE) : undefined;
  return {
    currency: 'GHS',
    deliveryFee: round2(envFee !== undefined && Number.isFinite(envFee) ? envFee : Number(row.delivery_fee || 0)),
    freeDeliveryOver: round2(Number(row.free_delivery_over || 0)),
    paystackEnabled: row.paystack_enabled === undefined ? true : Number(row.paystack_enabled) === 1,
  };
}

export function deliveryFeeFor(subtotal: number, orderType: string, config: StoreConfig): number {
  if (orderType !== 'Delivery') return 0;
  if (config.freeDeliveryOver > 0 && subtotal >= config.freeDeliveryOver) return 0;
  return config.deliveryFee;
}

/**
 * Prices a cart straight from the database. Rejects unknown, unavailable or
 * tampered items, and normalises quantities.
 */
export async function priceCart(rawLines: unknown, orderType: string): Promise<PricedCart> {
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    throw new HttpError(400, 'Your cart is empty.');
  }
  if (rawLines.length > 60) throw new HttpError(400, 'Too many different items in one order.');

  // Coalesce duplicate ids, clamp quantities.
  const wanted = new Map<number, number>();
  for (const raw of rawLines as any[]) {
    const id = requireInt(raw?.id ?? raw?.menu_item_id, 'Item id', { min: 1 });
    const qty = requireInt(raw?.quantity ?? 1, 'Quantity', { min: 1, max: 99 });
    wanted.set(id, Math.min(99, (wanted.get(id) || 0) + qty));
  }

  const ids = [...wanted.keys()];
  const placeholders = ids.map(() => '?').join(',');
  const rows = await query(`SELECT * FROM menu_items WHERE id IN (${placeholders})`, ids);
  if (rows.length !== ids.length) {
    throw new HttpError(400, 'One of the items is no longer on the menu. Please refresh and try again.');
  }
  const unavailable = rows.filter((r) => String(r.status) !== 'available');
  if (unavailable.length > 0) {
    throw new HttpError(409, `${unavailable[0].food_name} is currently unavailable. Please remove it from your cart.`);
  }

  const byId = new Map(rows.map((r) => [Number(r.id), r]));
  const lines: PricedLine[] = ids.map((id) => {
    const row = byId.get(id)!;
    const quantity = wanted.get(id)!;
    const unit = effectivePrice(row);
    return {
      menu_item_id: id,
      food_name: String(row.food_name),
      unit_price: unit,
      list_price: round2(Number(row.price || 0)),
      discount_percent: Number(row.discount_percent || 0),
      quantity,
      line_total: round2(unit * quantity),
      image: String(row.image || ''),
      category: String(row.category || ''),
    };
  });

  const subtotal = round2(lines.reduce((sum, l) => sum + l.line_total, 0));
  const config = await loadStoreConfig();
  const deliveryFee = deliveryFeeFor(subtotal, orderType, config);

  return {
    lines,
    subtotal,
    deliveryFee,
    total: round2(subtotal + deliveryFee),
    currency: 'GHS',
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
  };
}

/** Human-readable order summary stored on the order row and sent on WhatsApp. */
export function summariseLines(lines: PricedLine[]): string {
  return lines.map((l) => `${l.food_name} x ${l.quantity} = GHS ${l.line_total.toFixed(2)}`).join('\n');
}
