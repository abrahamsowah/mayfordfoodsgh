import { useState, type FormEvent } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bike,
  CheckCircle2,
  ChevronRight,
  MessageCircle,
  ShieldCheck,
  Store,
  User,
} from 'lucide-react';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useSettings } from '../components/SiteLayout';
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
import type { CartItem } from '../types';
import { ghs, outletWhatsApp, waLink } from '../utils';

type Placed = { message: string; whatsappHref: string; total: number; items: CartItem[]; outlet: string };

export default function CheckoutPage() {
  const { items, count, total, clear } = useCart();
  const { settings } = useSettings();
  const [orderType, setOrderType] = useState<'Pickup' | 'Delivery'>('Delivery');
  const [outlet, setOutlet] = useState<'Adabraka' | 'Dzorwulu' | ''>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState<Placed | null>(null);

  if (items.length === 0 && !placed) return <Navigate to="/menu" replace />;

  async function placeOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = Object.fromEntries(new FormData(form).entries());
    if (!outlet) {
      setError('Please choose the branch that will prepare your order.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      let orderDetails = '';
      for (const item of items) {
        orderDetails += `${item.food_name} x ${item.quantity} = ${ghs(item.price * item.quantity)}\n`;
      }
      await api.post('/orders', {
        customer_name: String(fd.customer_name || ''),
        phone: String(fd.phone || ''),
        food_item: 'Multiple Foods',
        quantity: count,
        outlet,
        order_type: orderType,
        address: orderType === 'Delivery' ? String(fd.address || '') : '',
        order_details: orderDetails,
        total,
      });

      const message =
        `NEW MAYFORD FOODS ORDER\n` +
        `Customer: ${fd.customer_name}\n` +
        `Phone: ${fd.phone}\n` +
        `Items:\n${orderDetails}` +
        `Outlet: ${outlet}\n` +
        `Order Type: ${orderType}\n` +
        (orderType === 'Delivery' ? `Address: ${fd.address || '-'}\n` : '') +
        `TOTAL: ${ghs(total)}`;

      setPlaced({
        message,
        whatsappHref: waLink(outletWhatsApp(outlet, settings), message),
        total,
        items,
        outlet,
      });
      clear();
      form.reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const summaryItems = placed ? placed.items : items;

  return (
    <>
      <Section className="!py-10 md:!py-14">
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

            <Card className="p-5 md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <IconTile icon={User} tone="light" size="sm" />
                <div>
                  <h2 className="text-[15px] font-extrabold tracking-tight text-ink-900">Your details</h2>
                  <p className="text-[12.5px] text-ink-500">So the branch can confirm your order.</p>
                </div>
              </div>
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Field label="Full name">
                  <Input name="customer_name" placeholder="e.g. Akosua Mensah" required autoComplete="name" />
                </Field>
                <Field label="Phone number">
                  <Input name="phone" inputMode="tel" placeholder="024 000 0000" required autoComplete="tel" />
                </Field>
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <IconTile icon={Bike} tone="light" size="sm" />
                <div>
                  <h2 className="text-[15px] font-extrabold tracking-tight text-ink-900">Pickup or delivery</h2>
                  <p className="text-[12.5px] text-ink-500">Delivery is available across Accra.</p>
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
                        <span className="block text-[14px] font-extrabold text-ink-900">{o.label}</span>
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
                          <span className="block text-[13.5px] font-extrabold text-ink-900">{o.name}</span>
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
                  <Field label="Delivery address" hint="Include a landmark so the rider finds you quickly.">
                    <Textarea name="address" rows={3} placeholder="e.g. Ring Road Central, opposite Koala, House 12" required />
                  </Field>
                </div>
              )}
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <Button type="submit" variant="primary" size="lg" loading={busy} iconRight={ArrowRight} className="sm:flex-1">
                {busy ? 'Placing order…' : `Place order · ${ghs(total)}`}
              </Button>
              <LinkBtn href="/cart" variant="ghost" size="lg" className="sm:w-40">
                Cancel
              </LinkBtn>
            </div>
            <p className="flex items-center justify-center gap-2 text-center text-[12.5px] text-ink-500">
              <BadgeCheck className="h-4 w-4 text-success-600" strokeWidth={2.3} />
              Final confirmation happens in WhatsApp — no card details needed.
            </p>
          </form>

          {/* Summary */}
          <Card className="lg:sticky lg:top-24">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <h2 className="text-[15px] font-extrabold tracking-tight text-ink-900">Your order</h2>
              <Link to="/cart" className="text-[12.5px] font-bold text-mayford-700 hover:underline">
                Edit
              </Link>
            </div>
            <ul className="divide-y divide-ink-100">
              {summaryItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                  <img src={`/assets/images/${item.image}`} alt="" className="h-12 w-12 shrink-0 rounded-tile object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold text-ink-900">{item.food_name}</p>
                    <p className="text-[12px] text-ink-500">
                      {item.quantity} × {ghs(item.price)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[13.5px] font-extrabold tabular-nums text-ink-900">
                    {ghs(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="space-y-2.5 border-t border-ink-100 px-5 py-4 text-[13.5px]">
              <div className="flex items-center justify-between text-ink-600">
                <span>Subtotal ({count})</span>
                <span className="font-bold tabular-nums text-ink-900">{ghs(placed ? placed.total : total)}</span>
              </div>
              <div className="flex items-center justify-between text-ink-600">
                <span>{orderType === 'Delivery' ? 'Delivery' : 'Pickup'}</span>
                <span className="text-[12.5px] font-semibold text-ink-500">
                  {orderType === 'Delivery' ? 'Confirmed on WhatsApp' : 'Free'}
                </span>
              </div>
              <div className="flex items-baseline justify-between border-t border-dashed border-ink-200 pt-3">
                <span className="font-extrabold text-ink-900">Total</span>
                <span className="text-[20px] font-extrabold tabular-nums text-ink-900">{ghs(placed ? placed.total : total)}</span>
              </div>
            </div>
            <div className="border-t border-ink-100 bg-ink-50/70 px-5 py-4">
              <Badge tone="neutral" icon={Store}>
                {outlet ? `${outlet} branch` : 'Choose a branch'}
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
        subtitle="One last step — confirm it with the branch on WhatsApp."
        maxWidth="max-w-md"
      >
        {placed && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-card border border-success-100 bg-success-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-600" strokeWidth={2.4} />
              <div className="text-[13.5px] leading-relaxed text-success-700">
                <p className="font-extrabold">Your order has been recorded.</p>
                <p className="mt-0.5">
                  We sent it to the <strong>{placed.outlet}</strong> branch. Open WhatsApp to confirm your total and{' '}
                  {orderType === 'Delivery' ? 'delivery time' : 'pickup time'}.
                </p>
              </div>
            </div>

            <div className="rounded-card border border-ink-200 p-4 text-[13.5px]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink-700">Total</span>
                <span className="font-extrabold tabular-nums text-ink-900">{ghs(placed.total)}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="font-bold text-ink-700">Branch</span>
                <span className="font-semibold text-ink-600">{placed.outlet}</span>
              </div>
            </div>

            <LinkBtn href={placed.whatsappHref} external variant="whatsapp" size="lg" full icon={MessageCircle}>
              Open WhatsApp to confirm
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
