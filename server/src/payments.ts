/**
 * Payment gateway abstraction — Paystack is the live provider.
 *
 * Money rules enforced here:
 *  - The client never tells us what to charge; the order total comes from the DB.
 *  - Paystack works in minor units (pesewas): amount = round(total * 100).
 *  - A payment is only marked paid after a server-side VERIFY call whose
 *    returned amount + currency match the order we stored.
 *  - Webhooks are authenticated with HMAC-SHA512 over the raw request body.
 */
import crypto from 'crypto';
import { execute, nowSql, queryOne, query } from './db';
import { hashIp, HttpError } from './security';

const PAYSTACK_BASE = 'https://api.paystack.co';

export type PaystackChannel = 'mobile_money' | 'card' | 'bank_transfer' | 'ussd' | 'qr' | 'bank';

export function paystackSecret(): string {
  return String(process.env.PAYSTACK_SECRET_KEY || '').trim();
}

export function paystackPublic(): string {
  return String(process.env.PAYSTACK_PUBLIC_KEY || '').trim();
}

export function paystackEnabled(): boolean {
  return paystackSecret().length > 0 && /^(sk|pk)_/.test(paystackSecret());
}

/** Live availability of the gateway (used by the storefront + admin). */
export async function paystackStatus() {
  const enabled = paystackEnabled();
  return {
    provider: 'paystack',
    enabled,
    currency: 'GHS',
    public_key: paystackPublic() || null,
    mode: paystackSecret().startsWith('sk_live') ? 'live' : paystackSecret().startsWith('sk_test') ? 'test' : enabled ? 'unknown' : 'disabled',
    configured: {
      secret_key: Boolean(process.env.PAYSTACK_SECRET_KEY),
      public_key: Boolean(process.env.PAYSTACK_PUBLIC_KEY),
      webhook: `${process.env.PUBLIC_API_URL || ''}/api/payments/webhook/paystack`.replace(/^\/api/, '/api'),
    },
  };
}

export function toPesewas(amountGhs: number): number {
  return Math.round(Number(amountGhs || 0) * 100);
}

export function fromPesewas(minor: number): number {
  return Math.round(Number(minor || 0)) / 100;
}

/** LOW-LEVEL: signed call to the Paystack API. */
async function paystackRequest<T = any>(
  path: string,
  init: { method?: string; body?: any } = {}
): Promise<T> {
  if (!paystackEnabled()) throw new HttpError(503, 'Payments are not enabled yet. Please choose "Pay on delivery" or contact us on WhatsApp.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${PAYSTACK_BASE}${path}`, {
      method: init.method || 'GET',
      headers: {
        Authorization: `Bearer ${paystackSecret()}`,
        'Content-Type': 'application/json',
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
    const payload = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || payload?.status === false) {
      const message = String(payload?.message || `Paystack request failed (${res.status})`);
      throw new HttpError(res.status === 401 ? 502 : 502, message);
    }
    return payload as T;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if ((err as Error).name === 'AbortError') throw new HttpError(504, 'Payment gateway timed out. Please try again.');
    throw new HttpError(502, `Could not reach the payment gateway: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

export interface InitInput {
  email: string;
  amountGhs: number;
  reference: string;
  orderId: number;
  orderCode: string;
  customerName: string;
  phone: string;
  metadata?: Record<string, any>;
}

/** Starts a transaction and returns the Paystack hosted checkout URL. */
export async function initialiseTransaction(input: InitInput) {
  const callbackUrl =
    process.env.PAYSTACK_CALLBACK_URL ||
    (process.env.APP_URL ? `${process.env.APP_URL.replace(/\/$/, '')}/order/track` : undefined) ||
    'https://mayfordfoodsgh.com/order/track';

  const payload = await paystackRequest<{ data: any }>('/transaction/initialize', {
    method: 'POST',
    body: {
      email: input.email,
      amount: toPesewas(input.amountGhs),
      currency: 'GHS',
      reference: input.reference,
      callback_url: callbackUrl,
      channels: ['mobile_money', 'card', 'bank_transfer'] as PaystackChannel[],
      metadata: {
        order_id: input.orderId,
        order_code: input.orderCode,
        customer_name: input.customerName,
        phone: input.phone,
        custom_fields: [
          { display_name: 'Order code', variable_name: 'order_code', value: input.orderCode },
          { display_name: 'Outlet', variable_name: 'outlet', value: String(input.metadata?.outlet || '') },
        ],
        ...input.metadata,
      },
    },
  });

  return {
    reference: String(payload.data?.reference || input.reference),
    access_code: String(payload.data?.access_code || ''),
    authorization_url: String(payload.data?.authorization_url || ''),
  };
}

export interface VerifiedPayment {
  status: 'success' | 'failed' | 'abandoned' | 'pending' | 'reversed';
  reference: string;
  amountGhs: number;
  currency: string;
  channel: string;
  email: string;
  paidAt: string | null;
  raw: any;
}

export async function verifyTransaction(reference: string): Promise<VerifiedPayment> {
  const payload = await paystackRequest<{ data: any }>(`/transaction/verify/${encodeURIComponent(reference)}`);
  const data = payload.data || {};
  return {
    status: String(data.status || 'pending') as VerifiedPayment['status'],
    reference: String(data.reference || reference),
    amountGhs: fromPesewas(data.amount),
    currency: String(data.currency || 'GHS'),
    channel: String(data.channel || ''),
    email: String(data.customer?.email || ''),
    paidAt: data.paid_at ? String(data.paid_at) : null,
    raw: data,
  };
}

/** HMAC-SHA512 check for webhook authenticity (raw body required). */
export function verifyWebhookSignature(rawBody: Buffer | string, signature: unknown): boolean {
  const secret = paystackSecret();
  if (!secret) return false;
  const provided = String(signature || '').trim();
  if (!provided) return false;
  const expected = crypto.createHmac('sha512', secret).update(rawBody as any).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ------------------------------------------------------------------
   Payment records
------------------------------------------------------------------ */
export async function upsertPaymentRecord(input: {
  orderId: number | null;
  reference: string;
  amountGhs: number;
  status: string;
  channel?: string | null;
  payload?: any;
  paidAt?: string | null;
}) {
  const existing = await queryOne('SELECT id FROM payments WHERE reference = ?', [input.reference]);
  const payloadJson = input.payload ? JSON.stringify(input.payload).slice(0, 20000) : null;
  if (existing) {
    await execute(
      `UPDATE payments SET order_id = COALESCE(?, order_id), amount = ?, status = ?, channel = COALESCE(?, channel),
        provider_payload = COALESCE(?, provider_payload), paid_at = COALESCE(?, paid_at) WHERE id = ?`,
      [input.orderId, input.amountGhs, input.status, input.channel ?? null, payloadJson, input.paidAt ?? null, existing.id]
    );
    return Number(existing.id);
  }
  const res = await execute(
    `INSERT INTO payments (order_id, provider, reference, amount, currency, channel, status, provider_payload, paid_at, created_at)
     VALUES (?, 'paystack', ?, ?, 'GHS', ?, ?, ?, ?, ?)`,
    [input.orderId, input.reference, input.amountGhs, input.channel ?? null, input.status, payloadJson, input.paidAt ?? null, nowSql()]
  );
  return res.insertId;
}

export async function paginatedPayments(limit: number, offset: number) {
  const rows = await query(
    `SELECT p.*, o.order_code FROM payments p LEFT JOIN orders o ON o.id = p.order_id
     ORDER BY p.id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`
  );
  const total = await queryOne('SELECT COUNT(*) AS c FROM payments');
  return { payments: rows, total: Number(total?.c || 0) };
}

export { hashIp };
