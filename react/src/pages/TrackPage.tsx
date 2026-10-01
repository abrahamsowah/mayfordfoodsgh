import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bike,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Utensils,
  XCircle,
} from 'lucide-react';
import { api } from '../api';
import type { OrderTrackingPayload, PaymentGatewayStatus } from '../types';
import { Alert, Badge, Button, Card, Field, IconTile, Input, LinkBtn, PageHeader, Section, Spinner } from '../components/ui';
import { ghs, waLink } from '../utils';

/** Status → icon + tone, used by the tracker timeline. */
const STEP_ICON: Record<string, typeof Clock> = {
  Pending: Clock,
  Confirmed: BadgeCheck,
  Preparing: Utensils,
  Ready: PackageCheck,
  'Out for delivery': Bike,
  Completed: CheckCircle2,
};

const STATUS_TONE: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  Preparing: 'bg-mayford-50 text-mayford-700 border-mayford-200',
  Ready: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Out for delivery': 'bg-flame-50 text-flame-700 border-flame-200',
  Completed: 'bg-success-50 text-success-700 border-success-200',
  Cancelled: 'bg-red-50 text-red-700 border-red-200',
};

export default function TrackPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<OrderTrackingPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [gateway, setGateway] = useState<PaymentGatewayStatus | null>(null);
  const [paying, setPaying] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      try {
        const d = await api.get<OrderTrackingPayload & { ok: true }>(`/orders/track/${token}`);
        setData(d);
        setError('');
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Confirm a Paystack payment when the customer comes back from checkout.
  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) return;
    setPaying(true);
    api
      .post<{ status: string; charged?: boolean; already_paid?: boolean }>('/payments/confirm', { reference, token })
      .then((res) => {
        if (res.status === 'success') setNotice('Payment confirmed. Your order is now with the kitchen.');
        else setNotice(`Payment status: ${res.status}. You can try again below.`);
        void load(true);
      })
      .catch((err) => setNotice((err as Error).message))
      .finally(() => {
        setPaying(false);
        window.history.replaceState({}, '', `/track/${token}`);
      });
  }, [token, load]);

  useEffect(() => {
    api
      .get<PaymentGatewayStatus>('/payments/status')
      .then(setGateway)
      .catch(() => undefined);
  }, []);

  // Live tracking: refresh every 30 seconds while the order is in flight.
  useEffect(() => {
    if (!data || data.order.status === 'Completed' || data.cancelled) return;
    const timer = setInterval(() => void load(true), 30_000);
    return () => clearInterval(timer);
  }, [data, load]);

  async function payNow() {
    if (!token) return;
    setPaying(true);
    setNotice('');
    try {
      const res = await api.post<{ authorization_url: string; already_paid?: boolean }>('/payments/initialize', { token });
      if (res.already_paid) {
        setNotice('This order is already paid.');
        void load(true);
        return;
      }
      window.location.href = res.authorization_url;
    } catch (err) {
      setNotice((err as Error).message);
      setPaying(false);
    }
  }

  async function lookup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    setLookupBusy(true);
    setLookupError('');
    try {
      const res = await api.post<OrderTrackingPayload & { tracking_token: string }>('/orders/lookup', {
        order_code: String(fd.order_code || ''),
        phone: String(fd.phone || ''),
      });
      if (res.tracking_token) navigate(`/track/${res.tracking_token}`);
      else setLookupError('We found the order but could not open its tracker. Please call the branch.');
    } catch (err) {
      setLookupError((err as Error).message);
    } finally {
      setLookupBusy(false);
    }
  }

  const support = data?.support;
  const currentStepIndex = useMemo(() => {
    if (!data) return -1;
    const done = data.steps.filter((s) => s.done).length;
    return Math.max(0, done - 1);
  }, [data]);

  return (
    <Section className="!py-10 md:!py-14">
      <PageHeader
        icon={MapPin}
        title={token ? 'Follow your order live' : 'Track an order'}
        subtitle={
          token
            ? 'Every step, from the kitchen to your door — refreshed automatically.'
            : 'Enter the order code we gave you and the phone number used to order.'
        }
        action={
          token ? (
            <Button variant="outline" size="md" icon={RefreshCw} onClick={() => void load()} loading={loading}>
              Refresh
            </Button>
          ) : undefined
        }
      />

      {notice && (
        <div className="mb-5">
          <Alert tone={/confirmed/i.test(notice) ? 'green' : 'orange'}>{notice}</Alert>
        </div>
      )}

      {!token && (
        <div className="mx-auto max-w-xl">
          <Card className="p-6 md:p-7">
            {lookupError && <Alert tone="red">{lookupError}</Alert>}
            <form onSubmit={lookup} className="mt-3 space-y-4">
              <Field label="Order code" hint="It looks like MF-XXXXXXX and is on your receipt.">
                <Input name="order_code" placeholder="MF-XXXXXXX" required autoCapitalize="characters" />
              </Field>
              <Field label="Phone number used to order">
                <Input name="phone" inputMode="tel" placeholder="024 000 0000" required />
              </Field>
              <Button type="submit" variant="primary" size="lg" full icon={Search} loading={lookupBusy}>
                Find my order
              </Button>
            </form>
            <p className="mt-4 text-center text-[12.5px] text-ink-500">
              Ordered on WhatsApp? Call the branch and we will send you the tracking link.
            </p>
          </Card>
        </div>
      )}

      {token && loading && !data && <Spinner />}

      {token && error && !data && (
        <div className="mx-auto max-w-lg">
          <Card className="p-7 text-center">
            <IconTile icon={XCircle} tone="outline" size="lg" className="mx-auto" />
            <h3 className="mt-4 text-[16px] font-extrabold text-ink-900">We could not find that order</h3>
            <p className="mt-1 text-[13.5px] text-ink-500">{error}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <LinkBtn href="/track" variant="primary" size="md" icon={Search}>
                Try the order code
              </LinkBtn>
              <LinkBtn href="/contact" variant="outline" size="md" icon={MessageCircle}>
                Contact us
              </LinkBtn>
            </div>
          </Card>
        </div>
      )}

      {token && data && <Tracker data={data} currentStepIndex={currentStepIndex} gateway={gateway} paying={paying} onPay={payNow} support={support} />}
    </Section>
  );
}

function Tracker({
  data,
  currentStepIndex,
  gateway,
  paying,
  onPay,
  support,
}: {
  data: OrderTrackingPayload;
  currentStepIndex: number;
  gateway: PaymentGatewayStatus | null;
  paying: boolean;
  onPay: () => void;
  support?: { adabraka: string; dzorwulu: string; email: string };
}) {
  const { order, items, steps, cancelled } = data;
  const outletPhone = order.outlet === 'Adabraka' ? support?.adabraka : support?.dzorwulu;
  const statusClass = STATUS_TONE[cancelled ? 'Cancelled' : order.status] || STATUS_TONE.Pending;
  const canPay = !cancelled && order.payment_status !== 'paid' && (gateway?.enabled ?? false);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
      <div className="space-y-6">
        {/* Status hero */}
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/60 px-5 py-4">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-500">Order {order.order_code}</p>
              <p className="text-[13px] text-ink-500">
                Placed {order.created_at} · {order.order_type} · {order.outlet}
              </p>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-pill border px-3.5 py-1.5 text-[13px] font-extrabold ${statusClass}`}>
              {cancelled ? <XCircle className="h-4 w-4" strokeWidth={2.4} /> : <BadgeCheck className="h-4 w-4" strokeWidth={2.4} />}
              {cancelled ? 'Cancelled' : order.status}
            </span>
          </div>

          <div className="px-5 py-5">
            {cancelled && order.cancel_reason && <Alert tone="red">Reason: {order.cancel_reason}</Alert>}

            {(order.courier_name || order.eta_minutes) && !cancelled && (
              <div className="mb-5 flex flex-wrap items-center gap-3 rounded-tile border border-flame-100 bg-flame-50/70 px-4 py-3">
                <IconTile icon={Bike} tone="brand" size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-extrabold text-ink-900">
                    {order.courier_name ? `Rider: ${order.courier_name}` : 'Rider assigned soon'}
                  </p>
                  <p className="text-[12.5px] text-ink-600">
                    {order.eta_minutes ? `Arriving in about ${order.eta_minutes} minutes` : 'We will call you when the rider leaves.'}
                  </p>
                </div>
                {order.courier_phone && (
                  <a
                    href={`tel:${order.courier_phone}`}
                    className="inline-flex items-center gap-2 rounded-pill border border-ink-200 bg-white px-3.5 py-2 text-[12.5px] font-bold text-ink-800 hover:border-ink-300"
                  >
                    <Phone className="h-3.5 w-3.5" strokeWidth={2.4} />
                    Call rider
                  </a>
                )}
              </div>
            )}

            {/* Progress bar */}
            {!cancelled && (
              <div className="mb-6">
                <div className="h-2 w-full overflow-hidden rounded-pill bg-ink-100">
                  <div
                    className="h-full rounded-pill bg-gradient-to-r from-mayford-600 to-flame-500 transition-all duration-700"
                    style={{ width: `${Math.min(100, ((currentStepIndex + 1) / steps.length) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-[12.5px] font-semibold text-ink-500">
                  Step {Math.max(1, currentStepIndex + 1)} of {steps.length}
                </p>
              </div>
            )}

            <ol className="space-y-1">
              {steps.map((step) => {
                const Icon = STEP_ICON[step.key] || Clock;
                return (
                  <li key={step.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-pill border transition ${
                          step.done ? 'border-mayford-600 bg-mayford-600 text-white' : 'border-ink-200 bg-white text-ink-300'
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5" strokeWidth={2.4} />
                      </span>
                      <span className={`my-1 w-px flex-1 ${step.done ? 'bg-mayford-200' : 'bg-ink-150'}`} />
                    </div>
                    <div className="min-w-0 pb-4">
                      <p className={`text-[14px] font-extrabold ${step.done ? 'text-ink-900' : 'text-ink-400'}`}>{step.label}</p>
                      <p className={`text-[12.5px] ${step.done ? 'text-ink-500' : 'text-ink-400'}`}>{step.description}</p>
                      {step.at && <p className="mt-0.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-400">{step.at}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </Card>

        {/* Items */}
        <Card className="overflow-hidden">
          <div className="border-b border-ink-100 px-5 py-4">
            <h2 className="text-[15px] font-extrabold tracking-tight text-ink-900">What you ordered</h2>
          </div>
          <ul className="divide-y divide-ink-100">
            {items.map((line) => (
              <li key={`${line.food_name}-${line.menu_item_id}`} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-bold text-ink-900">{line.food_name}</p>
                  <p className="text-[12px] text-ink-500">
                    {line.quantity} × {ghs(line.unit_price)}
                  </p>
                </div>
                <span className="shrink-0 text-[13.5px] font-extrabold tabular-nums text-ink-900">{ghs(line.line_total)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-ink-100 px-5 py-4 text-[13.5px]">
            <div className="flex items-center justify-between text-ink-600">
              <span>Subtotal</span>
              <span className="font-bold tabular-nums text-ink-900">{ghs(order.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-ink-600">
              <span>Delivery</span>
              <span className="font-bold tabular-nums text-ink-900">{order.delivery_fee > 0 ? ghs(order.delivery_fee) : 'Free'}</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-dashed border-ink-200 pt-3">
              <span className="font-extrabold text-ink-900">Total</span>
              <span className="text-[20px] font-extrabold tabular-nums text-ink-900">{ghs(order.total)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-5 lg:sticky lg:top-24">
        <Card className="p-5">
          <h2 className="text-[15px] font-extrabold tracking-tight text-ink-900">Payment</h2>
          <div className="mt-3 flex items-center gap-3">
            <IconTile icon={order.payment_status === 'paid' ? CreditCard : Banknote} tone={order.payment_status === 'paid' ? 'brand' : 'outline'} size="sm" />
            <div>
              <p className="text-[13.5px] font-extrabold text-ink-900">
                {order.payment_status === 'paid' ? 'Paid' : order.payment_method === 'paystack' ? 'Awaiting payment' : 'Pay on delivery'}
              </p>
              <p className="text-[12.5px] text-ink-500">
                {order.payment_status === 'paid'
                  ? data.payment?.reference
                    ? `Ref ${data.payment.reference}`
                    : 'Payment received'
                  : order.payment_method === 'paystack'
                    ? 'Complete payment with Mobile Money or card.'
                    : 'Pay the rider or at pickup — cash or MoMo.'}
              </p>
            </div>
          </div>
          {canPay && (
            <Button variant="primary" size="lg" full className="mt-4" icon={CreditCard} loading={paying} onClick={onPay}>
              Pay {ghs(order.total)} now
            </Button>
          )}
          {!canPay && order.payment_status !== 'paid' && (
            <p className="mt-3 flex items-start gap-2 text-[12px] text-ink-500">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" strokeWidth={2.3} />
              {gateway?.enabled
                ? 'Online payment is optional — you can also pay on delivery.'
                : 'Online payment is not switched on yet. Pay on delivery, or ask us on WhatsApp for MoMo details.'}
            </p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-[15px] font-extrabold tracking-tight text-ink-900">Need help?</h2>
          <div className="mt-3 space-y-2.5 text-[13px]">
            {outletPhone && (
              <a href={`tel:${outletPhone}`} className="flex items-center gap-3 rounded-tile border border-ink-200 px-3.5 py-2.5 font-semibold text-ink-800 hover:border-ink-300">
                <Phone className="h-4 w-4 text-mayford-600" strokeWidth={2.4} />
                Call the {order.outlet} branch
              </a>
            )}
            <LinkBtn
              href={waLink(outletPhone || '0244143271', `Hello Mayford Foods, I need help with order ${order.order_code}.`)}
              external
              variant="whatsapp"
              size="md"
              full
              icon={MessageCircle}
            >
              Chat on WhatsApp
            </LinkBtn>
            <Link to="/contact" className="flex items-center justify-between rounded-tile border border-ink-200 px-3.5 py-2.5 font-semibold text-ink-800 hover:border-ink-300">
              Send us a message
              <ArrowRight className="h-4 w-4 text-ink-400" strokeWidth={2.4} />
            </Link>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-[15px] font-extrabold tracking-tight text-ink-900">Delivery details</h2>
          <dl className="mt-3 space-y-2.5 text-[13px]">
            <div className="flex gap-3">
              <Store className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" strokeWidth={2.3} />
              <div>
                <dt className="font-bold text-ink-700">Branch</dt>
                <dd className="text-ink-500">{order.outlet}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Bike className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" strokeWidth={2.3} />
              <div>
                <dt className="font-bold text-ink-700">{order.order_type === 'Delivery' ? 'Deliver to' : 'Pickup'}</dt>
                <dd className="text-ink-500">{order.address || 'Collect at the branch'}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" strokeWidth={2.3} />
              <div>
                <dt className="font-bold text-ink-700">Contact</dt>
                <dd className="text-ink-500">
                  {order.customer_name} · {order.phone}
                </dd>
              </div>
            </div>
            {order.notes && (
              <div className="flex gap-3">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" strokeWidth={2.3} />
                <div>
                  <dt className="font-bold text-ink-700">Notes</dt>
                  <dd className="text-ink-500">{order.notes}</dd>
                </div>
              </div>
            )}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="neutral">Order {order.order_code}</Badge>
            <Badge tone={order.payment_status === 'paid' ? 'success' : 'warning'}>{order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}
