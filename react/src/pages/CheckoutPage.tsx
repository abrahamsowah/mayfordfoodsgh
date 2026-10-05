import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Check,
  CheckCircle2,
  CreditCard,
  Lock,
  MapPin,
  MessageCircle,
  ShoppingBag,
  Smartphone,
  Store,
  Wallet,
} from 'lucide-react';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useSettings } from '../components/SiteLayout';
import { launchOfficialPaystack, PaystackModal } from '../components/PaystackCheckout';
import { Alert, Btn, Card, Eyebrow, Field, Input, LinkBtn, Section, Select, Textarea } from '../components/ui';
import { SmartImage } from '../components/SmartImage';
import { assetUrl, ghs, outletWhatsApp, waLink } from '../utils';

export const ACCRA_DELIVERY_ZONES = [
  { id: 'adabraka_ridge', label: 'Adabraka / Asylum Down / Ridge', fee: 15 },
  { id: 'dzorwulu_airport', label: 'Dzorwulu / Abelemkpe / Airport Residential', fee: 15 },
  { id: 'achimota_tesano', label: 'Achimota / Tesano / Lapaz', fee: 20 },
  { id: 'osu_cantonments', label: 'Osu / Cantonments / Labone', fee: 25 },
  { id: 'east_legon_spintex', label: 'East Legon / Shiashie / Spintex', fee: 30 },
  { id: 'other_accra', label: 'Other Greater Accra Area', fee: 35 },
] as const;

interface CompletedReceipt {
  id: number;
  customer_name: string;
  phone: string;
  outlet: string;
  requested_outlet?: string;
  fulfillment_rerouted?: boolean;
  order_type: string;
  delivery_zone?: string | null;
  delivery_fee?: number;
  address: string;
  order_details: string;
  total: number;
  payment_method: string;
  payment_status: string;
  payment_reference?: string | null;
}

export default function CheckoutPage() {
  const { items, count, total: subtotal, clear } = useCart();
  const { settings } = useSettings();
  const [outlet, setOutlet] = useState<'Adabraka' | 'Dzorwulu'>('Adabraka');
  const [orderType, setOrderType] = useState<'Delivery' | 'Pickup'>('Delivery');
  const [deliveryZoneId, setDeliveryZoneId] = useState<string>('adabraka_ridge');
  const [paymentMethod, setPaymentMethod] = useState<'Paystack' | 'Pay on Delivery'>('Paystack');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stockNotice, setStockNotice] = useState('');

  // Pending checkout form state for Paystack modal
  const [pendingCustomer, setPendingCustomer] = useState<{
    customer_name: string;
    customer_email: string;
    phone: string;
    address: string;
  } | null>(null);
  const [paystackModalOpen, setPaystackModalOpen] = useState(false);
  const [receipt, setReceipt] = useState<CompletedReceipt | null>(null);

  if (items.length === 0 && !receipt) return <Navigate to="/menu" replace />;

  const selectedZone = ACCRA_DELIVERY_ZONES.find((z) => z.id === deliveryZoneId) || ACCRA_DELIVERY_ZONES[0];
  const deliveryFee = orderType === 'Delivery' ? selectedZone.fee : 0;
  const grandTotal = subtotal + deliveryFee;

  async function finalizeOrder(
    customer: { customer_name: string; customer_email: string; phone: string; address: string },
    method: 'Paystack' | 'Pay on Delivery',
    status: 'Paid' | 'Pending',
    reference?: string,
    paymentToken?: string
  ) {
    setBusy(true);
    setError('');
    try {
      let orderDetails = '';
      for (const item of items) {
        orderDetails += `${item.food_name} x ${item.quantity} = ${ghs(item.price * item.quantity)}\n`;
      }
      if (orderType === 'Delivery') {
        orderDetails += `Delivery (${selectedZone.label}) = ${ghs(deliveryFee)}\n`;
      }

      const res = await api.post<{
        ok: boolean;
        id: number;
        outlet: string;
        requested_outlet: string;
        fulfillment_rerouted: boolean;
        total: number;
        delivery_zone: string | null;
        delivery_fee: number;
        order_details: string;
        payment_status: string;
        payment_reference: string | null;
        receipt_signature?: string;
      }>('/orders', {
        customer_name: customer.customer_name,
        customer_email: customer.customer_email || null,
        phone: customer.phone,
        items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
        food_item: items.length === 1 ? items[0].food_name : 'Multiple Foods',
        quantity: count,
        outlet,
        order_type: orderType,
        delivery_zone: orderType === 'Delivery' ? deliveryZoneId : null,
        delivery_fee: deliveryFee,
        address: customer.address,
        order_details: orderDetails,
        total: grandTotal,
        payment_method: method,
        payment_status: status,
        payment_reference: reference || null,
        payment_token: paymentToken || null,
      });

      const completed: CompletedReceipt = {
        id: res.id,
        customer_name: customer.customer_name,
        phone: customer.phone,
        outlet: res.outlet || outlet,
        requested_outlet: res.requested_outlet || outlet,
        fulfillment_rerouted: Boolean(res.fulfillment_rerouted),
        order_type: orderType,
        delivery_zone: res.delivery_zone || (orderType === 'Delivery' ? selectedZone.label : null),
        delivery_fee: res.delivery_fee ?? deliveryFee,
        address: customer.address || 'N/A',
        order_details: res.order_details || orderDetails,
        total: res.total || grandTotal,
        payment_method: method,
        payment_status: res.payment_status || status,
        payment_reference: res.payment_reference || reference || null,
      };

      clear();
      setReceipt(completed);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckoutSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setStockNotice('');
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    const customer = {
      customer_name: String(fd.customer_name || '').trim(),
      customer_email: String(fd.customer_email || '').trim(),
      phone: String(fd.phone || '').trim(),
      address: String(fd.address || '').trim(),
    };

    if (paymentMethod === 'Pay on Delivery') {
      await finalizeOrder(customer, 'Pay on Delivery', 'Pending');
      return;
    }

    // Confirm inventory and receive the server-selected fulfillment outlet before charging a payment method.
    setBusy(true);
    try {
      const availability = await api.post<{
        outlet: string;
        requested_outlet: string;
        fulfillment_rerouted: boolean;
      }>('/orders/availability', {
        items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
        outlet,
        order_type: orderType,
      });
      if (availability.fulfillment_rerouted) {
        setStockNotice(`Delivery will be fulfilled by ${availability.outlet} because ${availability.requested_outlet} is out of stock.`);
      }
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
      return;
    }
    setBusy(false);

    // Paystack online payment flow
    setPendingCustomer(customer);
    const launched = await launchOfficialPaystack({
      publicKey: settings?.paystack_public_key,
      email: customer.customer_email,
      phone: customer.phone,
      customerName: customer.customer_name,
      amountGhs: grandTotal,
      outlet,
      onSuccess: (ref, token) => {
        void finalizeOrder(customer, 'Paystack', 'Paid', ref, token);
      },
    });

    if (!launched) {
      setPaystackModalOpen(true);
    }
  }

  // Completed Order & Payment Receipt View
  if (receipt) {
    const waMessage =
      `NEW MAYFORD FOODS ORDER #${receipt.id}\n` +
      `Customer: ${receipt.customer_name}\n` +
      `Phone: ${receipt.phone}\n` +
      `Items:\n${receipt.order_details}\n` +
      `Outlet: ${receipt.outlet}\n` +
      `Order Type: ${receipt.order_type}\n` +
      `Address: ${receipt.address}\n` +
      `Payment: ${receipt.payment_method} (${receipt.payment_status})` +
      (receipt.payment_reference ? `\nPaystack Ref: ${receipt.payment_reference}` : '') +
      `\nTOTAL: ${ghs(receipt.total)}`;

    return (
      <Section tone="default">
        <div className="mx-auto max-w-xl">
          <Card className="p-6 sm:p-10">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-[#111111] text-white">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                    Order #{receipt.id} Confirmed
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight text-[#111111]">
                    Thank You, {receipt.customer_name}
                  </h1>
                </div>
              </div>
              <span
                className={`rounded-sm px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                  receipt.payment_status === 'Paid'
                    ? 'bg-[#111111] text-white'
                    : 'border border-neutral-300 bg-[#FAF6E8] text-[#111111]'
                }`}
              >
                {receipt.payment_status}
              </span>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4 border-b border-neutral-200 pb-6 text-xs">
              <div>
                <dt className="font-medium text-[#6B6B6B]">Kitchen Branch</dt>
                <dd className="mt-1 font-bold text-[#111111]">
                  {receipt.outlet}
                  {receipt.fulfillment_rerouted && (
                    <span className="mt-1 block text-[11px] font-medium text-[#6B6B6B]">
                      Delivery routed from {receipt.requested_outlet} due to stock.
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-[#6B6B6B]">Fulfillment</dt>
                <dd className="mt-1 font-bold text-[#111111]">
                  {receipt.order_type}
                  {receipt.delivery_zone ? ` (${receipt.delivery_zone})` : ''}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-[#6B6B6B]">Payment Method</dt>
                <dd className="mt-1 font-bold text-[#111111]">{receipt.payment_method}</dd>
              </div>
              {receipt.payment_reference && (
                <div>
                  <dt className="font-medium text-[#6B6B6B]">Paystack Reference</dt>
                  <dd className="mt-1 font-mono font-bold text-[#111111]">{receipt.payment_reference}</dd>
                </div>
              )}
            </dl>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                Server-Verified Order Summary
              </p>
              <pre className="mt-2 whitespace-pre-wrap rounded-md border border-neutral-200 bg-[#FAF6E8] p-4 font-sans text-xs leading-relaxed text-[#111111]">
                {receipt.order_details.trim()}
              </pre>
              <div className="mt-4 flex items-center justify-between text-base font-bold text-[#111111]">
                <span>Total Amount</span>
                <span className="text-xl tabular-nums">{ghs(receipt.total)}</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkBtn
                href={`/track-order?ref=${encodeURIComponent(String(receipt.id))}&phone=${encodeURIComponent(receipt.phone)}`}
                variant="dark"
                className="flex-1 !py-3"
              >
                <span>Track Live Kitchen Status</span>
              </LinkBtn>
              <LinkBtn
                href={waLink(outletWhatsApp(receipt.outlet, settings), waMessage)}
                external
                variant="primary"
                className="flex-1 !py-3"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Send Receipt to {receipt.outlet} WhatsApp</span>
              </LinkBtn>
              <LinkBtn href="/menu" variant="outline" className="!py-3">
                <span>Back to Menu</span>
              </LinkBtn>
            </div>
          </Card>
        </div>
      </Section>
    );
  }

  return (
    <Section tone="default">
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end">
        <div>
          <Eyebrow>Complete Your Order</Eyebrow>
          <h1 className="text-3xl font-bold tracking-[-0.02em] text-[#111111] sm:text-4xl">Checkout</h1>
        </div>
        <Link
          to="/cart"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111111] hover:text-mayford-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to cart</span>
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Left: Fulfillment, Contact & Payment Form */}
        <Card className="p-6 sm:p-8">
          {error && <Alert tone="red">{error}</Alert>}
          {stockNotice && <Alert tone="orange">{stockNotice}</Alert>}

          <form onSubmit={handleCheckoutSubmit}>
            {/* Step 1: Select Kitchen Branch */}
            <div className="mb-7">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
                1. Select Kitchen Branch
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    {
                      id: 'Adabraka',
                      title: 'Adabraka Branch',
                      sub: 'Mayford Locals · Adabraka Market',
                      defaultZone: 'adabraka_ridge',
                    },
                    {
                      id: 'Dzorwulu',
                      title: 'Dzorwulu Branch',
                      sub: 'Mayford Fast Food · Dzorwulu Market',
                      defaultZone: 'dzorwulu_airport',
                    },
                  ] as const
                ).map((b) => {
                  const active = outlet === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setOutlet(b.id);
                        setDeliveryZoneId(b.defaultZone);
                      }}
                      className={`flex items-start justify-between rounded-md border p-4 text-left transition-colors ${
                        active
                          ? 'border-[#111111] bg-[#FAF6E8] text-[#111111]'
                          : 'border-neutral-200 bg-white text-[#6B6B6B] hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Store className="mt-0.5 h-4 w-4 shrink-0 text-[#111111]" />
                        <div>
                          <p className="text-sm font-bold text-[#111111]">{b.title}</p>
                          <p className="mt-0.5 text-xs text-[#6B6B6B]">{b.sub}</p>
                        </div>
                      </div>
                      {active && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-[#111111] text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Order Type & Accra Delivery Zone */}
            <div className="mb-7">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
                2. Fulfillment Method &amp; Zone
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(
                  [
                    { id: 'Delivery', label: 'Rider Delivery', icon: Bike, desc: 'Delivered to your Accra address' },
                    { id: 'Pickup', label: 'Branch Pickup (Free)', icon: ShoppingBag, desc: 'Collect directly at the kitchen' },
                  ] as const
                ).map((m) => {
                  const active = orderType === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setOrderType(m.id)}
                      className={`flex items-start justify-between rounded-md border p-4 text-left transition-colors ${
                        active
                          ? 'border-[#111111] bg-[#FAF6E8] text-[#111111]'
                          : 'border-neutral-200 bg-white text-[#6B6B6B] hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <m.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#111111]" />
                        <div>
                          <p className="text-sm font-bold text-[#111111]">{m.label}</p>
                          <p className="mt-0.5 text-xs text-[#6B6B6B]">{m.desc}</p>
                        </div>
                      </div>
                      {active && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-[#111111] text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {orderType === 'Delivery' && (
                <div className="mt-4">
                  <Field
                    label="Accra Delivery Zone (Rider Fee)"
                    hint="Standard rider dispatch fee is added to your order total."
                  >
                    <Select
                      name="delivery_zone"
                      value={deliveryZoneId}
                      onChange={(e) => setDeliveryZoneId(e.target.value)}
                    >
                      {ACCRA_DELIVERY_ZONES.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.label} ({ghs(z.fee)})
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              )}
            </div>

            {/* Step 3: Contact & Delivery Information */}
            <div className="mb-7 border-t border-neutral-200 pt-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#111111]">
                3. Contact &amp; Address Details
              </h2>
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Field label="Full Name">
                  <Input name="customer_name" placeholder="Enter your full name" required />
                </Field>
                <Field label="Phone Number">
                  <Input name="phone" placeholder="e.g. 024 000 0000" required />
                </Field>
              </div>
              <Field label="Email Address (For Paystack Receipt)">
                <Input name="customer_email" type="email" placeholder="you@example.com (optional)" />
              </Field>
              <Field
                label={
                  orderType === 'Delivery'
                    ? 'Delivery Address & Landmark'
                    : 'Pickup Notes (Optional)'
                }
              >
                <Textarea
                  name="address"
                  rows={3}
                  required={orderType === 'Delivery'}
                  placeholder={
                    orderType === 'Delivery'
                      ? 'Street name, building, neighbourhood, or nearby landmark in Accra'
                      : 'Any special instructions or preferred pickup time'
                  }
                />
              </Field>
            </div>

            {/* Step 4: Payment Method (Paystack vs Pay on Delivery) */}
            <div className="mb-7 border-t border-neutral-200 pt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
                4. Payment Method
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Paystack')}
                  className={`flex items-start justify-between rounded-md border p-4 text-left transition-colors ${
                    paymentMethod === 'Paystack'
                      ? 'border-[#111111] bg-[#FAF6E8] text-[#111111]'
                      : 'border-neutral-200 bg-white text-[#6B6B6B] hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[#111111]" />
                    <div>
                      <p className="text-sm font-bold text-[#111111]">Pay Now with Paystack</p>
                      <p className="mt-0.5 text-xs text-[#6B6B6B]">
                        MTN MoMo, Telecel Cash, AirtelTigo, or Bank Card
                      </p>
                    </div>
                  </div>
                  {paymentMethod === 'Paystack' && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-[#111111] text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('Pay on Delivery')}
                  className={`flex items-start justify-between rounded-md border p-4 text-left transition-colors ${
                    paymentMethod === 'Pay on Delivery'
                      ? 'border-[#111111] bg-[#FAF6E8] text-[#111111]'
                      : 'border-neutral-200 bg-white text-[#6B6B6B] hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-[#111111]" />
                    <div>
                      <p className="text-sm font-bold text-[#111111]">Pay on {orderType}</p>
                      <p className="mt-0.5 text-xs text-[#6B6B6B]">
                        Pay via Mobile Money or Cash upon {orderType.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  {paymentMethod === 'Pay on Delivery' && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-[#111111] text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              </div>
            </div>

            <Btn
              type="submit"
              disabled={busy}
              className="mt-2 w-full !bg-[#111111] !py-3.5 hover:!bg-[#262626]"
            >
              {paymentMethod === 'Paystack' ? (
                <>
                  <Lock className="h-4 w-4" />
                  <span>{busy ? 'Processing...' : `Pay ${ghs(grandTotal)} with Paystack`}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4" />
                  <span>{busy ? 'Submitting Order...' : `Place Order · ${ghs(grandTotal)}`}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Btn>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B6B6B]">
              <span className="inline-flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-[#111111]" />
                <span>Server-verified pricing &amp; Paystack PCI-DSS checkout</span>
              </span>
              <Link to="/legal" className="font-semibold text-[#111111] underline hover:text-mayford-600">
                Allergens &amp; Refund Policy
              </Link>
            </div>
          </form>
        </Card>

        {/* Right: Order Receipt */}
        <Card className="h-fit p-6 sm:p-7">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <h2 className="text-lg font-bold tracking-tight text-[#111111]">Order Summary</h2>
            <span className="text-xs font-semibold text-[#6B6B6B]">
              {count} {count === 1 ? 'item' : 'items'}
            </span>
          </div>

          <ul className="mt-5 divide-y divide-neutral-100">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
                <SmartImage
                  src={assetUrl('images', item.image)}
                  alt={item.food_name}
                  sizes="56px"
                  fallbackSrc="/assets/images/Jollof.png"
                  className="h-12 w-14 shrink-0 rounded-md bg-neutral-100 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#111111]">{item.food_name}</p>
                  <p className="text-xs text-[#6B6B6B]">
                    Qty {item.quantity} ({ghs(item.price)} each)
                  </p>
                </div>
                <span className="text-sm font-bold tabular-nums text-[#111111]">
                  {ghs(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-2 border-t border-neutral-200 pt-4 text-xs text-[#6B6B6B]">
            <div className="flex justify-between">
              <span>Food Subtotal</span>
              <span className="font-semibold tabular-nums text-[#111111]">{ghs(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>{orderType === 'Delivery' ? `Delivery (${selectedZone.label})` : 'Branch Pickup'}</span>
              <span className="font-semibold tabular-nums text-[#111111]">
                {orderType === 'Delivery' ? ghs(deliveryFee) : 'Free'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Selected Branch</span>
              <span className="font-semibold text-[#111111]">{outlet}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Method</span>
              <span className="font-semibold text-[#111111]">{paymentMethod}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4">
            <span className="text-base font-bold text-[#111111]">Total</span>
            <span className="text-2xl font-bold tabular-nums text-[#111111]">{ghs(grandTotal)}</span>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-md border border-neutral-200 bg-[#FAF6E8] px-3.5 py-2.5 text-xs text-[#111111]">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-mayford-600" />
            <span>Dispatched fresh from Mayford {outlet}, Accra.</span>
          </div>
        </Card>
      </div>

      {/* Paystack Interactive Modal */}
      {pendingCustomer && (
        <PaystackModal
          open={paystackModalOpen}
          email={pendingCustomer.customer_email}
          phone={pendingCustomer.phone}
          customerName={pendingCustomer.customer_name}
          amountGhs={grandTotal}
          outlet={outlet}
          onClose={() => setPaystackModalOpen(false)}
          onSuccess={(ref, token) => {
            setPaystackModalOpen(false);
            void finalizeOrder(pendingCustomer, 'Paystack', 'Paid', ref, token);
          }}
        />
      )}
    </Section>
  );
}
