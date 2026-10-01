import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  ChevronRight,
  Clock,
  Minus,
  MessageCircle,
  Plus,
  Store,
  UtensilsCrossed,
} from 'lucide-react';
import { api } from '../api';
import { useSettings } from '../components/SiteLayout';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  IconTile,
  Input,
  LinkBtn,
  Section,
  Sheet,
  Textarea,
} from '../components/ui';
import type { MenuItem } from '../types';
import { effectivePrice, ghs, outletWhatsApp, waLink } from '../utils';

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const [food, setFood] = useState<MenuItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [outlet, setOutlet] = useState<'Adabraka' | 'Dzorwulu'>('Adabraka');
  const [orderType, setOrderType] = useState<'Pickup' | 'Delivery'>('Pickup');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [placedHref, setPlacedHref] = useState<string | null>(null);
  const [track, setTrack] = useState<{ token: string; code: string; total: number } | null>(null);
  const { settings } = useSettings();

  useEffect(() => {
    if (!id) return;
    api
      .get<{ item: MenuItem }>(`/menu/${id}`)
      .then((d) => setFood(d.item))
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <Section className="!py-16">
        <EmptyState
          icon={UtensilsCrossed}
          title="That dish is no longer on the menu"
          text="It may have been removed or renamed. Browse the menu to see what is available today."
          action={
            <LinkBtn href="/menu" variant="primary" size="lg" icon={UtensilsCrossed}>
              Browse the menu
            </LinkBtn>
          }
        />
      </Section>
    );
  }

  if (!food) {
    return (
      <Section className="!py-16">
        <div className="mx-auto max-w-4xl animate-pulse space-y-4">
          <div className="skeleton h-72 rounded-card" />
        </div>
      </Section>
    );
  }

  const unit = effectivePrice(food);
  const lineTotal = unit * quantity;

  async function placeOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = Object.fromEntries(new FormData(form).entries());
    setBusy(true);
    setError('');
    try {
      const res = await api.post<{
        order_code: string;
        tracking_token: string;
        whatsapp_url: string;
        total: number;
      }>('/orders', {
        customer_name: String(fd.customer_name || ''),
        phone: String(fd.phone || ''),
        email: String(fd.email || '') || undefined,
        outlet,
        order_type: orderType,
        address: orderType === 'Delivery' ? String(fd.address || '') : '',
        order_details: String(fd.order_details || `${food!.food_name} x ${quantity}`),
        payment_method: String(fd.payment_method || 'cash'),
        items: [{ id: food!.id, quantity }],
      });
      setTrack({ token: res.tracking_token, code: res.order_code, total: res.total });
      setPlacedHref(res.whatsapp_url || waLink(outletWhatsApp(outlet, settings), `Mayford order ${res.order_code}`));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Section className="!py-8 md:!py-12">
        <Link
          to="/menu"
          className="mb-5 inline-flex items-center gap-2 text-[13px] font-bold text-ink-500 transition hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.4} /> Back to menu
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr] lg:items-start">
          <Card className="overflow-hidden lg:sticky lg:top-24">
            <img src={`/assets/images/${food.image}`} alt={food.food_name} className="aspect-[4/3] w-full object-cover" />
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand" icon={UtensilsCrossed}>
                  {food.category}
                </Badge>
                <Badge tone="neutral" icon={Clock}>
                  25–35 min
                </Badge>
                {Number(food.discount_percent || 0) > 0 && (
                  <Badge tone="flame">{food.discount_percent}% off today</Badge>
                )}
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-ink-500">{food.description}</p>
            </div>
          </Card>

          <div>
            <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-ink-900 md:text-[2.25rem]">
              {food.food_name}
            </h1>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-[1.75rem] font-semibold tabular-nums text-mayford-700">{ghs(lineTotal)}</span>
              {Number(food.discount_percent || 0) > 0 && (
                <del className="text-[15px] font-semibold text-ink-400">{ghs(food.price * quantity)}</del>
              )}
              <span className="text-[13px] font-semibold text-ink-400">for {quantity}</span>
            </div>

            {error && (
              <div className="mt-4">
                <Alert tone="red">{error}</Alert>
              </div>
            )}

            <form onSubmit={placeOrder} className="mt-6 space-y-5">
              {/* Quantity */}
              <Card className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <IconTile icon={UtensilsCrossed} tone="light" size="sm" />
                  <div>
                    <p className="text-[14px] font-semibold text-ink-900">Quantity</p>
                    <p className="text-[12px] text-ink-500">How many plates?</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-tile border border-ink-200 p-1">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="flex h-10 w-10 items-center justify-center rounded-tile text-ink-600 transition hover:bg-ink-100 disabled:opacity-30"
                  >
                    <Minus className="h-4 w-4" strokeWidth={2.6} />
                  </button>
                  <span className="min-w-8 text-center text-[16px] font-semibold tabular-nums text-ink-900">{quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-tile bg-ink-900 text-white transition hover:bg-mayford-600"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.6} />
                  </button>
                </div>
              </Card>

              {/* Outlet + type */}
              <Card className="p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[13px] font-bold text-ink-700">Branch</p>
                    <div className="grid gap-2">
                      {(['Adabraka', 'Dzorwulu'] as const).map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => setOutlet(o)}
                          aria-pressed={outlet === o}
                          className={`flex items-center gap-3 rounded-tile border px-3.5 py-3 text-left transition ${
                            outlet === o ? 'border-mayford-600 bg-mayford-50/60' : 'border-ink-200 hover:border-ink-300'
                          }`}
                        >
                          <Store
                            className={`h-4 w-4 shrink-0 ${outlet === o ? 'text-mayford-600' : 'text-ink-400'}`}
                            strokeWidth={2.3}
                          />
                          <span className="text-[14px] font-bold text-ink-900">{o}</span>
                          {outlet === o && <CheckCircle2 className="ml-auto h-4 w-4 text-mayford-600" strokeWidth={2.5} />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[13px] font-bold text-ink-700">How do you want it?</p>
                    <div className="grid gap-2">
                      {(
                        [
                          { value: 'Pickup', icon: Store, hint: 'Collect in store' },
                          { value: 'Delivery', icon: Bike, hint: 'Bring it to me' },
                        ] as const
                      ).map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setOrderType(t.value)}
                          aria-pressed={orderType === t.value}
                          className={`flex items-center gap-3 rounded-tile border px-3.5 py-3 text-left transition ${
                            orderType === t.value ? 'border-mayford-600 bg-mayford-50/60' : 'border-ink-200 hover:border-ink-300'
                          }`}
                        >
                          <t.icon
                            className={`h-4 w-4 shrink-0 ${orderType === t.value ? 'text-mayford-600' : 'text-ink-400'}`}
                            strokeWidth={2.3}
                          />
                          <span className="text-[14px] font-bold text-ink-900">{t.value}</span>
                          <span className="ml-auto text-[12px] font-semibold text-ink-400">{t.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Contact */}
              <Card className="p-5">
                <h2 className="mb-4 text-[14px] font-semibold text-ink-900">Your details</h2>
                <div className="grid gap-x-4 sm:grid-cols-2">
                  <Field label="Full name">
                    <Input name="customer_name" placeholder="e.g. Kojo Asante" required />
                  </Field>
                  <Field label="Phone number">
                    <Input name="phone" inputMode="tel" placeholder="024 000 0000" required />
                  </Field>
                  <Field label="Email (optional)" hint="For your receipt and tracking link.">
                    <Input name="email" type="email" placeholder="you@example.com" />
                  </Field>
                  <Field label="Notes (optional)">
                    <Input name="order_details" placeholder="e.g. extra pepper" />
                  </Field>
                </div>
                {orderType === 'Delivery' && (
                  <Field label="Delivery address" hint="Add a landmark to help the rider.">
                    <Textarea name="address" rows={3} placeholder="e.g. Osu, Oxford Street, near the pharmacy" required />
                  </Field>
                )}
              </Card>

              <div className="flex items-baseline justify-between rounded-card border border-ink-200 bg-white px-5 py-4">
                <span className="text-[14px] font-bold text-ink-700">
                  Total · {quantity} × {ghs(unit)}
                </span>
                <span className="text-[24px] font-semibold tabular-nums tracking-tight text-ink-900">{ghs(lineTotal)}</span>
              </div>

              <Button type="submit" variant="primary" size="lg" full loading={busy} iconRight={ChevronRight}>
                {busy ? 'Placing order…' : 'Place order'}
              </Button>
              <p className="text-center text-[13px] text-ink-500">
                We will open WhatsApp so you can confirm with the {outlet} branch.
              </p>
            </form>
          </div>
        </div>
      </Section>

      <Sheet
        open={!!placedHref}
        onClose={() => setPlacedHref(null)}
        title="Order received"
        subtitle="Confirm it with the branch on WhatsApp."
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-card border border-success-100 bg-success-50 p-4 text-[14px] leading-relaxed text-success-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.4} />
            <p>
              <strong>{food.food_name}</strong> × {quantity} sent to the {outlet} branch. Open WhatsApp to confirm your
              total and {orderType === 'Delivery' ? 'delivery time' : 'pickup time'}.
            </p>
          </div>
          {track && (
            <div className="rounded-card border border-ink-200 p-4 text-[14px]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink-700">Order code</span>
                <span className="font-semibold text-ink-900">{track.code}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="font-bold text-ink-700">Total</span>
                <span className="font-semibold tabular-nums text-ink-900">{ghs(track.total)}</span>
              </div>
            </div>
          )}
          <LinkBtn href={placedHref || '#'} external variant="whatsapp" size="lg" full icon={MessageCircle}>
            Open WhatsApp to confirm
          </LinkBtn>
          {track && (
            <LinkBtn href={`/track/${track.token}`} variant="outline" size="lg" full icon={Bike}>
              Track this order live
            </LinkBtn>
          )}
          <LinkBtn href="/menu" variant="ghost" size="lg" full>
            Back to the menu
          </LinkBtn>
        </div>
      </Sheet>
    </>
  );
}
