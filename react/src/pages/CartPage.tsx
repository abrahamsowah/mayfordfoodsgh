import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Utensils,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Btn, Card, Eyebrow, LinkBtn, Section } from '../components/ui';
import { SmartImage } from '../components/SmartImage';
import { assetUrl, ghs } from '../utils';

export default function CartPage() {
  const { items, count, total, updateQuantity, removeItem, clear } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <Section tone="default">
        <div className="mx-auto max-w-md rounded-lg border border-neutral-200 bg-white p-10 text-center sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-[#F7F7F7] text-[#111111]">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-[#111111]">Your cart is empty</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#6B6B6B]">
            Add freshly prepared Ghanaian and continental dishes from our menu to get started.
          </p>
          <div className="mt-7">
            <LinkBtn href="/menu" variant="dark" className="w-full">
              <Utensils className="h-4 w-4" />
              <span>Browse Menu</span>
            </LinkBtn>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section tone="default">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end">
        <div>
          <Eyebrow>Your Order</Eyebrow>
          <h1 className="text-3xl font-bold tracking-[-0.02em] text-[#111111] sm:text-4xl">
            Shopping Cart ({count} {count === 1 ? 'item' : 'items'})
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/menu"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111111] hover:text-mayford-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Add more dishes</span>
          </Link>
          <span className="text-neutral-300">|</span>
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B6B6B] transition-colors hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear cart</span>
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.65fr_1fr]">
        {/* Itemized List */}
        <Card className="divide-y divide-neutral-200">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6"
            >
              <div className="flex items-center gap-4">
                <SmartImage
                  src={assetUrl('images', item.image)}
                  alt={item.food_name}
                  sizes="80px"
                  fallbackSrc="/assets/images/Jollof.png"
                  className="h-16 w-20 shrink-0 rounded-md bg-neutral-100 object-cover"
                />
                <div>
                  <h2 className="text-base font-bold text-[#111111]">{item.food_name}</h2>
                  <p className="mt-0.5 text-xs font-medium tabular-nums text-[#6B6B6B]">
                    {ghs(item.price)} each
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-5 sm:justify-end">
                {/* Quantity Stepper */}
                <div className="inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    aria-label={`Decrease quantity of ${item.food_name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-sm text-[#111111] transition-colors hover:bg-neutral-100"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-8 px-2 text-center text-xs font-bold tabular-nums text-[#111111]">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    aria-label={`Increase quantity of ${item.food_name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-sm text-[#111111] transition-colors hover:bg-neutral-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Line Subtotal */}
                <div className="min-w-24 text-right tabular-nums">
                  <span className="text-sm font-bold text-[#111111]">
                    {ghs(item.price * item.quantity)}
                  </span>
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.food_name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </Card>

        {/* Order Summary */}
        <Card className="h-fit p-6 sm:p-7">
          <h2 className="text-lg font-bold tracking-tight text-[#111111]">Order Summary</h2>

          <dl className="mt-5 space-y-3 border-t border-neutral-100 pt-5 text-sm">
            <div className="flex justify-between text-[#6B6B6B]">
              <dt>Items ({count})</dt>
              <dd className="font-semibold tabular-nums text-[#111111]">{ghs(total)}</dd>
            </div>
            <div className="flex justify-between text-[#6B6B6B]">
              <dt>Fulfillment</dt>
              <dd className="font-medium text-[#111111]">Pickup or Delivery</dd>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-4 text-base">
              <dt className="font-bold text-[#111111]">Total</dt>
              <dd className="text-xl font-bold tabular-nums text-[#111111]">{ghs(total)}</dd>
            </div>
          </dl>

          <Btn
            type="button"
            className="mt-6 w-full !bg-mayford-600 !py-3 hover:!bg-mayford-700"
            onClick={() => navigate('/checkout')}
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="h-4 w-4" />
          </Btn>

          <div className="mt-4 flex items-start gap-2.5 rounded-md bg-[#F7F7F7] p-3 text-xs text-[#6B6B6B]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#111111]" />
            <span>
              Select your preferred branch (Adabraka or Dzorwulu) at checkout and confirm instantly via WhatsApp.
            </span>
          </div>
        </Card>
      </div>
    </Section>
  );
}
