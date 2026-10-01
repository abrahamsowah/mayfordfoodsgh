import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bike,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Store,
  User,
} from 'lucide-react';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  IconTile,
  Input,
  LinkBtn,
  PageHeader,
  Section,
  Sheet,
  Textarea,
} from '../components/ui';
import type { CartItem, CustomerAddress, PaymentGatewayStatus } from '../types';
import { ghs } from '../utils';

interface Placed {
  orderId: number;
  orderCode: string;
  trackUrl: string;
  trackingToken: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  items: CartItem[];
  outlet: string;
  orderType: string;
  whatsapp: string;
  paymentMethod: 'paystack' | 'cash';
}

export default function CheckoutPage() {
  const { items, count, total, clear } = useCart();
  const { customer } = useCustomer();
  const [orderType, setOrderType] = useState<'Pickup' | 'Delivery'>('Delivery');
  const [outlet, setOutlet] = useState<'Adabraka' | 'Dzorwulu' | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'cash'>('cash');
  const [address, setAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [gateway, setGateway] = useState<PaymentGatewayStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState<Placed | null>(null);

  useEffect(() => {
    api
      .get<PaymentGatewayStatus>('/payments/status')
      .then((g) => setGateway(g))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!customer) {
      setSavedAddresses([]);
      return;
    }
    api
      .get<{ addresses: CustomerAddress[] }>('/customer/addresses')
      .then((d) => {
        setSavedAddresses(d.addresses);
        const preferred = d.addresses.find((a) => a.is_default) || d.addresses[0];
        if (preferred) setAddress(preferred.address + (preferred.landmark ? ` (${preferred.landmark})` : ''));
      })
      .catch(() => undefined);
  }, [customer]);

  if (items.length === 0 && !placed) return <Navigate to="/menu" replace />;

  const onlineAvailable = Boolean(gateway?.enabled);

  async function placeOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (!outlet) {
      setError('Please choose the branch that will prepare your order.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const method = paymentMethod === 'paystack' && onlineAvailable ? 'paystack' : 'cash';
      const res = await api.post<{
        id: number;
        order_code: string;
        tracking_token: string;
        track_url: string;
        whatsapp_url: string;
        subtotal: number;
        delivery_fee: number;
        total: number;
      }>('/orders', {
        customer_name: String(fd.customer_name || ''),
        phone: String(fd.phone || ''),
        email: String(fd.email || '') || undefined,
        outlet,
        order_type: orderType,
        address: orderType === 'Delivery' ? String(fd.address || '') : '',
        order_details: String(fd.order_details || ''),
        payment_method: method,
        items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
      });

      const snapshot: Placed = {
        orderId: res.id,
        orderCode: res.order_code,
        trackUrl: res.track_url,
        trackingToken: res.tracking_token,
        total: res.total,
        subtotal: res.subtotal,
        deliveryFee: res.delivery_fee,
        items,
        outlet,
        orderType,
        whatsapp: res.whatsapp_url,
        paymentMethod: method,
      };
      setPlaced(snapshot);
      clear();

      // Straight into online payment when the customer chose it.
      if (method === 'paystack' && onlineAvailable) {
        const pay = await api.post<{ authorization_url: string }>('/payments/initialize', { token: res.tracking_token });
        if (pay.authorization_url) window.location.href = pay.authorization_url;
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const summaryItems = placed ? placed.items : items;
  const subtotal = placed ? placed.subtotal : total;
  const deliveryFee = placed ? placed.deliveryFee : 0;
  const grandTotal = placed ? placed.total : total;

  return (
    <>
      <Section className="!py-12 md:!py-16">
        <PageHeader
          icon={ShieldCheck}
          title="Checkout"
          subtitle={`Step 2 of 3 · ${count} item${count === 1 ? '' : 's'} ready to send`}
          action={
            <LinkBtn href="/cart" variant="outline" size="md" icon={ArrowLeft}>
              Back to cart
            </LinkBtn>
          }
        />

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          {/* Form */}
          <form onSubmit={placeOrder} className="space-y-5">
            {error && <Alert tone="red">{error}</Alert>}

            {!customer && (
              <Alert tone="info">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Have an account? Sign in to save addresses and track every order.</span>
                  <Link to="/account/login?next=/checkout" className="font-semibold underline">
                    Sign in
                  </Link>
                </span>
              </Alert>
            )}

            <Card className="p-5 md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <IconTile icon={User} tone="light" size="sm" />
                <div>
                  <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">Your details</h2>
                  <p className="text-[13px] text-ink-500">So the branch can confirm your order.</p>
                </div>
              </div>
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Field label="Full name">
                  <Input name="customer_name" placeholder="e.g. Akosua Mensah" required autoComplete="name" defaultValue={customer?.full_name || ''} />
                </Field>
                <Field label="Phone number">
                  <Input name="phone" inputMode="tel" placeholder="024 000 0000" required autoComplete="tel" defaultValue={customer?.phone || ''} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Email (optional)" hint="We will email your receipt and tracking link.">
                    <Input name="email" type="email" placeholder="you@example.com" autoComplete="email" defaultValue={customer?.email || ''} />
                  </Field>
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <IconTile icon={Bike} tone="light" size="sm" />
                <div>
                  <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">Pickup or delivery</h2>
                  <p className="text-[13px] text-ink-500">Delivery is available across Accra.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { value: 'Delivery', label: 'Delivery', hint: 'To your address', icon: Bike },
                    { value: 'Pickup', label: 'Pickup', hint: 'Collect in store', icon: Store },
                  ] as const
                ).map((o) => {
                  const active = orderType === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setOrderType(o.value)}
                      aria-pressed={active}
                      className={`flex items-start gap-3 rounded-card border p-4 text-left transition ${
                        active ? 'border-mayford-600 bg-mayford-50/60 ring-1 ring-mayford-600' : 'border-ink-200 bg-white hover:border-ink-300'
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-tile ${
                          active ? 'bg-mayford-600 text-white' : 'bg-ink-100 text-ink-500'
                        }`}
                      >
                        <o.icon className="h-5 w-5" strokeWidth={2.2} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-semibold text-ink-900">{o.label}</span>
                        <span className="block text-[12px] text-ink-500">{o.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5">
                <p className="mb-2.5 text-[13px] font-bold text-ink-700">
                  {orderType === 'Pickup' ? 'Pickup branch' : 'Which kitchen cooks it?'}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      { value: 'Adabraka', name: 'Mayford Locals', area: 'Adabraka Market, Shop 5' },
                      { value: 'Dzorwulu', name: 'Mayford Fast Food', area: 'Dzorwulu Market, Shop 12 & 14' },
                    ] as const
                  ).map((o) => {
                    const active = outlet === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setOutlet(o.value)}
                        aria-pressed={active}
                        className={`flex items-center gap-3 rounded-card border p-4 text-left transition ${
                          active ? 'border-mayford-600 bg-mayford-50/60 ring-1 ring-mayford-600' : 'border-ink-200 bg-white hover:border-ink-300'
                        }`}
                      >
                        <IconTile icon={Store} tone={active ? 'brand' : 'outline'} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-semibold text-ink-900">{o.name}</span>
                          <span className="block truncate text-[12px] text-ink-500">{o.area}</span>
                        </span>
                        {active && <CheckCircle2 className="h-5 w-5 shrink-0 text-mayford-600" strokeWidth={2.4} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {orderType === 'Delivery' && (
                <div className="mt-5">
                  {savedAddresses.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-ink-700">
                        <MapPin className="h-3.5 w-3.5 text-mayford-600" strokeWidth={2.4} />
                        Saved addresses
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {savedAddresses.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setAddress(a.address + (a.landmark ? ` (${a.landmark})` : ''))}
                            className="rounded-tile border border-ink-200 bg-white px-3.5 py-1.5 text-[13px] font-bold text-ink-700 hover:border-mayford-400 hover:text-mayford-700"
                          >
                            {a.label} · {a.address.slice(0, 28)}
                            {a.address.length > 28 ? '…' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <Field label="Delivery address" hint="Include a landmark so the rider finds you quickly.">
                    <Textarea
                      name="address"
                      rows={3}
                      placeholder="e.g. Ring Road Central, opposite Koala, House 12"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </Field>
                </div>
              )}
            </Card>

            <Card className="p-5 md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <IconTile icon={CreditCard} tone="light" size="sm" />
                <div>
                  <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">How would you like to pay?</h2>
                  <p className="text-[13px] text-ink-500">
                    {onlineAvailable ? 'Pay securely now, or pay when your food arrives.' : 'Pay when your food arrives or at pickup.'}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {onlineAvailable && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('paystack')}
                    aria-pressed={paymentMethod === 'paystack'}
                    className={`flex items-start gap-3 rounded-card border p-4 text-left transition ${
                      paymentMethod === 'paystack' ? 'border-mayford-600 bg-mayford-50/60 ring-1 ring-mayford-600' : 'border-ink-200 bg-white hover:border-ink-300'
                    }`}
                  >
                    <IconTile icon={CreditCard} tone={paymentMethod === 'paystack' ? 'brand' : 'outline'} size="sm" />
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold text-ink-900">Pay now online</span>
                      <span className="block text-[12px] text-ink-500">Mobile Money, card or bank · via Paystack</span>
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  aria-pressed={paymentMethod === 'cash'}
                  className={`flex items-start gap-3 rounded-card border p-4 text-left transition ${
                    paymentMethod === 'cash' ? 'border-mayford-600 bg-mayford-50/60 ring-1 ring-mayford-600' : 'border-ink-200 bg-white hover:border-ink-300'
                  }`}
                >
                  <IconTile icon={Banknote} tone={paymentMethod === 'cash' ? 'brand' : 'outline'} size="sm" />
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-ink-900">Pay on delivery</span>
                    <span className="block text-[12px] text-ink-500">Cash or MoMo when your order arrives</span>
                  </span>
                </button>
              </div>

              <div className="mt-5">
                <Field label="Notes for the kitchen (optional)">
                  <Textarea name="order_details" rows={2} placeholder="e.g. extra pepper, no onions, call on arrival" />
                </Field>
              </div>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <Button type="submit" variant="primary" size="lg" loading={busy} iconRight={ArrowRight} className="sm:flex-1">
                {busy ? 'Placing order…' : `Place order · ${ghs(grandTotal)}`}
              </Button>
              <LinkBtn href="/cart" variant="ghost" size="lg" className="sm:w-40">
                Cancel
              </LinkBtn>
            </div>
            <p className="flex items-center justify-center gap-2 text-center text-[13px] text-ink-500">
              <BadgeCheck className="h-4 w-4 text-success-600" strokeWidth={2.3} />
              Your order is recorded instantly — we confirm every order by phone or WhatsApp.
            </p>
          </form>

          {/* Summary */}
          <Card className="lg:sticky lg:top-24">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">Your order</h2>
              <Link to="/cart" className="text-[13px] font-bold text-mayford-700 hover:underline">
                Edit
              </Link>
            </div>
            <ul className="divide-y divide-ink-100">
              {summaryItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                  <img src={`/assets/images/${item.image}`} alt="" className="h-12 w-12 shrink-0 rounded-tile object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-ink-900">{item.food_name}</p>
                    <p className="text-[12px] text-ink-500">
                      {item.quantity} × {ghs(item.price)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[14px] font-semibold tabular-nums text-ink-900">{ghs(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-2.5 border-t border-ink-100 px-5 py-4 text-[14px]">
              <div className="flex items-center justify-between text-ink-600">
                <span>Subtotal ({count})</span>
                <span className="font-bold tabular-nums text-ink-900">{ghs(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-ink-600">
                <span>{orderType === 'Delivery' ? 'Delivery' : 'Pickup'}</span>
                <span className="text-[13px] font-semibold text-ink-500">
                  {orderType === 'Delivery' ? (deliveryFee > 0 ? ghs(deliveryFee) : 'Free') : 'Free'}
                </span>
              </div>
              <div className="flex items-baseline justify-between border-t border-dashed border-ink-200 pt-3">
                <span className="font-semibold text-ink-900">Total</span>
                <span className="text-[20px] font-semibold tabular-nums text-ink-900">{ghs(grandTotal)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-ink-100 bg-ink-50/70 px-5 py-4">
              <Badge tone="neutral" icon={Store}>
                {outlet ? `${outlet} branch` : 'Choose a branch'}
              </Badge>
              <Badge tone={paymentMethod === 'paystack' && onlineAvailable ? 'brand' : 'neutral'} icon={paymentMethod === 'paystack' && onlineAvailable ? CreditCard : Banknote}>
                {paymentMethod === 'paystack' && onlineAvailable ? 'Pay online' : 'Pay on delivery'}
              </Badge>
            </div>
          </Card>
        </div>
      </Section>

      {/* Post-order confirmation */}
      <Sheet
        open={!!placed}
        onClose={() => setPlaced(null)}
        title="Order received"
        subtitle="We have it. Track it live, or confirm on WhatsApp."
        maxWidth="max-w-md"
      >
        {placed && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-card border border-success-100 bg-success-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-600" strokeWidth={2.4} />
              <div className="text-[14px] leading-relaxed text-success-700">
                <p className="font-semibold">Order {placed.orderCode} recorded.</p>
                <p className="mt-0.5">
                  Sent to the <strong>{placed.outlet}</strong> branch. We will confirm your total and{' '}
                  {placed.orderType === 'Delivery' ? 'delivery time' : 'pickup time'} by phone.
                </p>
              </div>
            </div>

            <div className="rounded-card border border-ink-200 p-4 text-[14px]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink-700">Total</span>
                <span className="font-semibold tabular-nums text-ink-900">{ghs(placed.total)}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="font-bold text-ink-700">Payment</span>
                <span className="font-semibold text-ink-600">{placed.paymentMethod === 'paystack' ? 'Online (Paystack)' : 'On delivery'}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="font-bold text-ink-700">Track</span>
                <Link to={`/track/${placed.trackingToken}`} className="font-semibold text-mayford-700 hover:underline">
                  Live status
                </Link>
              </div>
            </div>

            {placed.paymentMethod === 'paystack' && (
              <LinkBtn href={`/track/${placed.trackingToken}`} variant="primary" size="lg" full icon={CreditCard}>
                Pay {ghs(placed.total)} with Mobile Money or card
              </LinkBtn>
            )}
            <LinkBtn href={placed.whatsapp} external variant="whatsapp" size="lg" full icon={MessageCircle}>
              Open WhatsApp to confirm
            </LinkBtn>
            <LinkBtn href={`/track/${placed.trackingToken}`} variant="outline" size="lg" full icon={Bike}>
              Track my order
            </LinkBtn>
            <LinkBtn href="/menu" variant="ghost" size="lg" full iconRight={ChevronRight}>
              Order something else
            </LinkBtn>
          </div>
        )}
      </Sheet>
    </>
  );
}
