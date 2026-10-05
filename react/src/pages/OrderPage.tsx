import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Lock,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useSettings } from '../components/SiteLayout';
import { launchOfficialPaystack, PaystackModal } from '../components/PaystackCheckout';
import { ACCRA_DELIVERY_ZONES } from './CheckoutPage';
import { Alert, Btn, Card, Eyebrow, Field, Input, LinkBtn, Section, Select, Spinner, Textarea } from '../components/ui';
import { SmartImage } from '../components/SmartImage';
import type { MenuItem } from '../types';
import { assetUrl, effectivePrice, ghs, outletWhatsApp, waLink } from '../utils';

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const [food, setFood] = useState<MenuItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [qty, setQty] = useState(1);
  const [orderType, setOrderType] = useState<'Delivery' | 'Pickup'>('Delivery');
  const [deliveryZoneId, setDeliveryZoneId] = useState<string>('adabraka_ridge');
  const [paymentMethod, setPaymentMethod] = useState<'Paystack' | 'Pay on Delivery'>('Paystack');
  const [addedToCart, setAddedToCart] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stockNotice, setStockNotice] = useState('');
  const [pendingOrder, setPendingOrder] = useState<{
    customer_name: string;
    customer_email: string;
    phone: string;
    outlet: string;
    order_type: string;
    delivery_zone: string | null;
    address: string;
    quantity: number;
  } | null>(null);
  const [paystackModalOpen, setPaystackModalOpen] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<{
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
    quantity: number;
    total: number;
    payment_method: string;
    payment_status: string;
    payment_reference?: string | null;
  } | null>(null);

  const { settings } = useSettings();
  const { addItem } = useCart();

  useEffect(() => {
    if (!id) return;
    api
      .get<{ item: MenuItem }>(`/menu/${id}`)
      .then((d) => setFood(d.item))
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <Section tone="default">
        <div className="mx-auto max-w-md rounded-lg border border-neutral-200 bg-white p-10 text-center">
          <h1 className="text-xl font-bold text-[#111111]">Dish not found</h1>
          <p className="mt-2 text-sm text-[#6B6B6B]">
            This item may have been updated or removed from the menu.
          </p>
          <Link
            to="/menu"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#111111] px-5 py-2.5 text-xs font-semibold text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Menu</span>
          </Link>
        </div>
      </Section>
    );
  }

  if (!food) {
    return (
      <Section tone="default">
        <Spinner />
      </Section>
    );
  }

  const unitPrice = effectivePrice(food);
  const subtotal = unitPrice * qty;
  const selectedZone = ACCRA_DELIVERY_ZONES.find((z) => z.id === deliveryZoneId) || ACCRA_DELIVERY_ZONES[0];
  const deliveryFee = orderType === 'Delivery' ? selectedZone.fee : 0;
  const grandTotal = subtotal + deliveryFee;
  const hasDiscount = Number(food.discount_percent || 0) > 0;

  function handleAddToCart() {
    if (!food) return;
    for (let i = 0; i < qty; i++) {
      addItem(food);
    }
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1800);
  }

  async function submitOrderToBackend(
    orderData: NonNullable<typeof pendingOrder>,
    method: 'Paystack' | 'Pay on Delivery',
    status: 'Paid' | 'Pending',
    reference?: string,
    paymentToken?: string
  ) {
    const itemSubtotal = unitPrice * orderData.quantity;
    const fee = orderData.order_type === 'Delivery' ? selectedZone.fee : 0;
    const orderTotal = itemSubtotal + fee;
    setBusy(true);
    setError('');
    try {
      const res = await api.post<{
        ok: boolean;
        id: number;
        outlet: string;
        requested_outlet: string;
        fulfillment_rerouted: boolean;
        total: number;
        delivery_zone: string | null;
        delivery_fee: number;
        payment_status: string;
        payment_reference: string | null;
      }>('/orders', {
        customer_name: orderData.customer_name,
        customer_email: orderData.customer_email || null,
        phone: orderData.phone,
        menu_item_id: food!.id,
        food_item: food!.food_name,
        quantity: orderData.quantity,
        outlet: orderData.outlet,
        order_type: orderData.order_type,
        delivery_zone: orderData.delivery_zone,
        delivery_fee: fee,
        address: orderData.address,
        order_details: `${food!.food_name} x ${orderData.quantity} = ${ghs(itemSubtotal)}`,
        total: orderTotal,
        payment_method: method,
        payment_status: status,
        payment_reference: reference || null,
        payment_token: paymentToken || null,
      });

      setCompletedReceipt({
        id: res.id,
        customer_name: orderData.customer_name,
        phone: orderData.phone,
        outlet: res.outlet || orderData.outlet,
        requested_outlet: res.requested_outlet || orderData.outlet,
        fulfillment_rerouted: Boolean(res.fulfillment_rerouted),
        order_type: orderData.order_type,
        delivery_zone: res.delivery_zone || (orderData.order_type === 'Delivery' ? selectedZone.label : null),
        delivery_fee: res.delivery_fee ?? fee,
        address: orderData.address || 'N/A',
        quantity: orderData.quantity,
        total: res.total || orderTotal,
        payment_method: method,
        payment_status: res.payment_status || status,
        payment_reference: res.payment_reference || reference || null,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setStockNotice('');
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    const chosenType = String(fd.order_type || orderType) as 'Delivery' | 'Pickup';
    const orderData = {
      customer_name: String(fd.customer_name || '').trim(),
      customer_email: String(fd.customer_email || '').trim(),
      phone: String(fd.phone || '').trim(),
      outlet: String(fd.outlet || 'Adabraka'),
      order_type: chosenType,
      delivery_zone: chosenType === 'Delivery' ? deliveryZoneId : null,
      address: String(fd.address || '').trim(),
      quantity: Math.max(1, Number(fd.quantity || qty)),
    };

    if (paymentMethod === 'Pay on Delivery') {
      await submitOrderToBackend(orderData, 'Pay on Delivery', 'Pending');
      return;
    }

    setBusy(true);
    try {
      const availability = await api.post<{
        outlet: string;
        requested_outlet: string;
        fulfillment_rerouted: boolean;
      }>('/orders/availability', {
        menu_item_id: food!.id,
        outlet: orderData.outlet,
        order_type: orderData.order_type,
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

    setPendingOrder(orderData);
    const launched = await launchOfficialPaystack({
      publicKey: settings?.paystack_public_key,
      email: orderData.customer_email,
      phone: orderData.phone,
      customerName: orderData.customer_name,
      amountGhs: unitPrice * orderData.quantity + (chosenType === 'Delivery' ? selectedZone.fee : 0),
      outlet: orderData.outlet,
      onSuccess: (ref, token) => {
        void submitOrderToBackend(orderData, 'Paystack', 'Paid', ref, token);
      },
    });

    if (!launched) {
      setPaystackModalOpen(true);
    }
  }

  if (completedReceipt) {
    const waMessage =
      `NEW MAYFORD FOODS ORDER #${completedReceipt.id}\n` +
      `Customer: ${completedReceipt.customer_name}\n` +
      `Phone: ${completedReceipt.phone}\n` +
      `Food: ${food.food_name} x ${completedReceipt.quantity}\n` +
      `Outlet: ${completedReceipt.outlet}\n` +
      (completedReceipt.fulfillment_rerouted ? `Fulfilled at ${completedReceipt.outlet} instead of ${completedReceipt.requested_outlet} due to stock.\n` : '') +
      `Order Type: ${completedReceipt.order_type}\n` +
      `Address: ${completedReceipt.address}\n` +
      `Payment: ${completedReceipt.payment_method} (${completedReceipt.payment_status})` +
      (completedReceipt.payment_reference ? `\nPaystack Ref: ${completedReceipt.payment_reference}` : '') +
      `\nTotal: ${ghs(completedReceipt.total)}`;

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
                    Order #{completedReceipt.id} Confirmed
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight text-[#111111]">
                    Thank You, {completedReceipt.customer_name}
                  </h1>
                </div>
              </div>
              <span
                className={`rounded-sm px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                  completedReceipt.payment_status === 'Paid'
                    ? 'bg-[#111111] text-white'
                    : 'border border-neutral-300 bg-[#FAF6E8] text-[#111111]'
                }`}
              >
                {completedReceipt.payment_status}
              </span>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-md border border-neutral-200 bg-[#FAF6E8] p-4 text-sm">
              <div>
                <p className="font-bold text-[#111111]">
                  {food.food_name} (Qty {completedReceipt.quantity})
                </p>
                <p className="mt-0.5 text-xs text-[#6B6B6B]">
                  {completedReceipt.outlet} · {completedReceipt.order_type}
                  {completedReceipt.delivery_zone ? ` (${completedReceipt.delivery_zone})` : ''} ·{' '}
                  {completedReceipt.payment_method}
                </p>
                {completedReceipt.fulfillment_rerouted && (
                  <p className="mt-1 text-xs text-[#6B6B6B]">
                    Routed from {completedReceipt.requested_outlet} due to branch stock.
                  </p>
                )}
                {completedReceipt.payment_reference && (
                  <p className="mt-1 font-mono text-xs font-semibold text-[#111111]">
                    Ref: {completedReceipt.payment_reference}
                  </p>
                )}
              </div>
              <span className="text-lg font-bold tabular-nums text-[#111111]">
                {ghs(completedReceipt.total)}
              </span>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkBtn
                href={`/track-order?ref=${encodeURIComponent(String(completedReceipt.id))}&phone=${encodeURIComponent(completedReceipt.phone)}`}
                variant="dark"
                className="flex-1 !py-3"
              >
                <span>Track Live Kitchen Status</span>
              </LinkBtn>
              <LinkBtn
                href={waLink(outletWhatsApp(completedReceipt.outlet, settings), waMessage)}
                external
                variant="primary"
                className="flex-1 !py-3"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Send Receipt to {completedReceipt.outlet} WhatsApp</span>
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
      <div className="mb-6">
        <Link
          to="/menu"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111111] hover:text-mayford-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Menu</span>
        </Link>
      </div>

      <Card className="mx-auto max-w-5xl overflow-hidden">
        <div className="grid lg:grid-cols-2">
          {/* Dish Preview Side */}
          <div className="flex flex-col justify-between border-b border-neutral-200 bg-[#FAF6E8] p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <div>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-neutral-200">
                <SmartImage
                  src={assetUrl('images', food.image)}
                  alt={food.food_name}
                  priority
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  fallbackSrc="/assets/images/Jollof.png"
                  className="h-full w-full object-cover"
                />
                {hasDiscount && (
                  <span className="absolute left-3 top-3 rounded-sm bg-mayford-600 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
                    {food.discount_percent}% Off
                  </span>
                )}
              </div>

              <div className="mt-6">
                <Eyebrow>{food.category}</Eyebrow>
                <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#111111] sm:text-3xl">
                  {food.food_name}
                </h1>
                <div className="mt-2 flex items-baseline gap-2.5 tabular-nums">
                  <span className="text-xl font-bold text-[#111111]">{ghs(unitPrice)}</span>
                  {hasDiscount && (
                    <span className="text-sm text-neutral-400 line-through">{ghs(food.price)}</span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#6B6B6B]">
                  {food.description || 'Prepared fresh to order at our Adabraka and Dzorwulu kitchens.'}
                </p>
              </div>
            </div>

            {/* Add to Multi-Item Cart Option */}
            <div className="mt-8 border-t border-neutral-200 pt-5">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex h-10 items-center rounded-md border border-neutral-300 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="flex h-8 w-8 items-center justify-center rounded-sm text-[#111111] hover:bg-neutral-100"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-9 px-2 text-center text-sm font-bold tabular-nums text-[#111111]">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => q + 1)}
                    aria-label="Increase quantity"
                    className="flex h-8 w-8 items-center justify-center rounded-sm text-[#111111] hover:bg-neutral-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-[#111111] bg-white px-4 text-xs font-semibold text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
                >
                  {addedToCart ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>Added to Cart</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4" />
                      <span>Add {qty} to Cart</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Instant Order Form Side */}
          <div className="p-6 sm:p-8 lg:p-10">
            <Eyebrow>Direct Order</Eyebrow>
            <h2 className="text-xl font-bold tracking-tight text-[#111111] sm:text-2xl">
              Instant Checkout
            </h2>
            <p className="mt-1 text-xs text-[#6B6B6B]">
              Pay online with Paystack or place an order for delivery or pickup.
            </p>

            {error && (
              <div className="mt-4">
                <Alert tone="red">{error}</Alert>
              </div>
            )}
            {stockNotice && (
              <div className="mt-4">
                <Alert tone="orange">{stockNotice}</Alert>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-6">
              <input type="hidden" name="quantity" value={qty} />

              <div className="grid gap-x-4 sm:grid-cols-2">
                <Field label="Your Name">
                  <Input name="customer_name" placeholder="Full name" required />
                </Field>
                <Field label="Phone Number">
                  <Input name="phone" placeholder="024 000 0000" required />
                </Field>
              </div>

              <Field label="Email Address (Optional)">
                <Input name="customer_email" type="email" placeholder="For Paystack receipt" />
              </Field>

              <div className="grid gap-x-4 sm:grid-cols-2">
                <Field label="Kitchen Branch">
                  <Select name="outlet" required defaultValue="Adabraka">
                    <option value="Adabraka">Adabraka</option>
                    <option value="Dzorwulu">Dzorwulu</option>
                  </Select>
                </Field>
                <Field label="Fulfillment">
                  <Select
                    name="order_type"
                    required
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as 'Delivery' | 'Pickup')}
                  >
                    <option value="Delivery">Rider Delivery</option>
                    <option value="Pickup">Branch Pickup (Free)</option>
                  </Select>
                </Field>
              </div>

              {orderType === 'Delivery' && (
                <Field label="Accra Delivery Zone">
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
              )}

              <Field label={orderType === 'Delivery' ? 'Delivery Address & Landmark' : 'Pickup Notes (Optional)'}>
                <Textarea
                  name="address"
                  rows={2}
                  required={orderType === 'Delivery'}
                  placeholder="Street, building, or landmark in Accra"
                />
              </Field>

              {/* Payment Method Toggle */}
              <div className="mb-5">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Payment Method
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Paystack')}
                    className={`flex items-center justify-center gap-2 rounded-md border py-2.5 text-xs font-semibold transition-colors ${
                      paymentMethod === 'Paystack'
                        ? 'border-[#111111] bg-[#111111] text-white'
                        : 'border-neutral-300 bg-white text-[#111111] hover:bg-neutral-50'
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>Paystack (MoMo / Card)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Pay on Delivery')}
                    className={`flex items-center justify-center gap-2 rounded-md border py-2.5 text-xs font-semibold transition-colors ${
                      paymentMethod === 'Pay on Delivery'
                        ? 'border-[#111111] bg-[#111111] text-white'
                        : 'border-neutral-300 bg-white text-[#111111] hover:bg-neutral-50'
                    }`}
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    <span>Pay on Arrival</span>
                  </button>
                </div>
              </div>

              <div className="mb-5 space-y-1.5 rounded-md border border-neutral-200 bg-[#FAF6E8] px-4 py-3 text-xs">
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>
                    Food Subtotal ({qty} x {ghs(unitPrice)})
                  </span>
                  <span className="font-semibold tabular-nums text-[#111111]">{ghs(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>{orderType === 'Delivery' ? `Delivery (${selectedZone.label})` : 'Branch Pickup'}</span>
                  <span className="font-semibold tabular-nums text-[#111111]">
                    {orderType === 'Delivery' ? ghs(deliveryFee) : 'Free'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-200 pt-1.5 text-sm">
                  <span className="font-bold text-[#111111]">Total</span>
                  <span className="text-base font-bold tabular-nums text-[#111111]">{ghs(grandTotal)}</span>
                </div>
              </div>

              <Btn
                type="submit"
                disabled={busy}
                className="w-full !bg-[#111111] !py-3 hover:!bg-[#262626]"
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
            </form>
          </div>
        </div>
      </Card>

      {pendingOrder && (
        <PaystackModal
          open={paystackModalOpen}
          email={pendingOrder.customer_email}
          phone={pendingOrder.phone}
          customerName={pendingOrder.customer_name}
          amountGhs={unitPrice * pendingOrder.quantity + (pendingOrder.order_type === 'Delivery' ? selectedZone.fee : 0)}
          outlet={pendingOrder.outlet}
          onClose={() => setPaystackModalOpen(false)}
          onSuccess={(ref, token) => {
            setPaystackModalOpen(false);
            void submitOrderToBackend(pendingOrder, 'Paystack', 'Paid', ref, token);
          }}
        />
      )}
    </Section>
  );
}
