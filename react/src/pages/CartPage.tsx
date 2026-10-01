import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Info,
  MessageCircle,
  Pencil,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  UtensilsCrossed,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../components/SiteLayout';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconTile,
  LinkBtn,
  PageHeader,
  QtyStepper,
  Section,
} from '../components/ui';
import { ghs, waLink } from '../utils';

export default function CartPage() {
  const { items, count, total, setQuantity, removeItem, clear } = useCart();
  const navigate = useNavigate();
  const { settings } = useSettings();

  if (items.length === 0) {
    return (
      <Section className="!py-14">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          text="Add a few dishes from the menu and they will show up here — ready to check out or confirm on WhatsApp."
          action={
            <LinkBtn href="/menu" variant="primary" size="lg" icon={UtensilsCrossed}>
              Browse the menu
            </LinkBtn>
          }
        />
      </Section>
    );
  }

  return (
    <Section className="!py-12 md:!py-16">
      <PageHeader
        icon={ShoppingBag}
        title="Your cart"
        subtitle={`${count} item${count === 1 ? '' : 's'} · confirm on WhatsApp at checkout`}
        action={
          <>
            <LinkBtn href="/menu" variant="outline" size="md" icon={ArrowLeft} className="hidden sm:inline-flex">
              Add more items
            </LinkBtn>
            <Button variant="ghost" size="md" icon={Trash2} onClick={() => clear()} className="!text-danger-600 hover:!bg-danger-50">
              Clear cart
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr] lg:items-start">
        {/* Line items */}
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-3 sm:p-4">
              <div className="flex gap-3.5 sm:gap-4">
                <Link to="/menu" className="relative h-20 w-20 shrink-0 overflow-hidden rounded-tile bg-ink-100 sm:h-24 sm:w-24">
                  <img src={`/assets/images/${item.image}`} alt={item.food_name} className="h-full w-full object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink-900">{item.food_name}</h3>
                      <p className="mt-0.5 text-[13px] font-semibold text-ink-400">{ghs(item.price)} each</p>
                    </div>
                    <p className="shrink-0 text-[15px] font-semibold tabular-nums text-ink-900">
                      {ghs(item.price * item.quantity)}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                    <QtyStepper value={item.quantity} onChange={(q) => setQuantity(item.id, q)} size="sm" />
                    <div className="flex items-center gap-2">
                      <Link
                        to="/menu"
                        className="flex h-8 items-center gap-1.5 rounded-tile px-3 text-[13px] font-bold text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2.4} /> Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.food_name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-tile text-ink-400 transition hover:bg-danger-50 hover:text-danger-600"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2.3} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          <div className="flex items-center gap-3 rounded-tile border border-info-100 bg-info-50 px-4 py-3.5 text-[13px] font-semibold text-info-700">
            <Info className="h-4 w-4 shrink-0" strokeWidth={2.4} />
            Delivery fees are confirmed by the branch on WhatsApp — you are only charged for the food here.
          </div>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-24">
          <Card className="overflow-hidden">
            <div className="border-b border-ink-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">Order summary</h2>
            </div>
            <div className="space-y-3 px-5 py-5 text-[14px]">
              <div className="flex items-center justify-between text-ink-600">
                <span>Items ({count})</span>
                <span className="font-bold tabular-nums text-ink-900">{ghs(total)}</span>
              </div>
              <div className="flex items-center justify-between text-ink-600">
                <span className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-ink-400" strokeWidth={2.2} /> Delivery
                </span>
                <span className="text-[13px] font-semibold text-ink-500">Confirmed on WhatsApp</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-dashed border-ink-200 pt-4">
                <span className="text-[15px] font-semibold text-ink-900">Total</span>
                <span className="text-[24px] font-semibold tabular-nums tracking-tight text-ink-900">{ghs(total)}</span>
              </div>
            </div>
            <div className="space-y-3 border-t border-ink-100 bg-ink-50/70 px-5 py-5">
              <Button
                variant="primary"
                size="lg"
                full
                iconRight={ArrowRight}
                onClick={() => navigate('/checkout')}
              >
                Proceed to checkout
              </Button>
              <LinkBtn
                href={waLink(settings?.adabraka_phone || '0244143271', 'Hello Mayford Foods, I would like to order.')}
                external
                variant="outline"
                size="lg"
                full
                icon={MessageCircle}
              >
                Order on WhatsApp instead
              </LinkBtn>
            </div>
          </Card>

          <ul className="mt-4 space-y-3 px-1">
            {[
              { icon: Store, text: 'Pickup from Adabraka or Dzorwulu' },
              { icon: Truck, text: 'Delivery across Accra via Bolt Food' },
              { icon: ShieldCheck, text: 'You confirm every order before it is cooked' },
            ].map((t) => (
              <li key={t.text} className="flex items-center gap-3 text-[13px] font-semibold text-ink-500">
                <IconTile icon={t.icon} tone="outline" size="sm" className="!h-8 !w-8 !rounded-xl" strokeWidth={2.3} />
                {t.text}
              </li>
            ))}
          </ul>

          <div className="mt-5 flex items-center justify-between rounded-tile border border-ink-200 bg-white px-4 py-3">
            <Badge tone="success" icon={ShieldCheck}>
              No payment taken online
            </Badge>
            <span className="text-[12px] font-semibold text-ink-400">Pay on delivery / pickup</span>
          </div>
        </div>
      </div>
    </Section>
  );
}
