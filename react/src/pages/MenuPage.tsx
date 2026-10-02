import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  MapPin,
  MessageCircle,
  QrCode,
  Search,
  ShoppingBag,
  Utensils,
  X,
} from 'lucide-react';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { Reveal } from '../components/motion';
import { useSettings } from '../components/SiteLayout';
import { Eyebrow, FoodCard, FoodCardSkeleton, LinkBtn, Section } from '../components/ui';
import type { MenuItem } from '../types';
import { ghs, waLink } from '../utils';

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const { count, total } = useCart();
  const { settings } = useSettings();

  useEffect(() => {
    api
      .get<{ items: MenuItem[] }>('/menu')
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
  }, []);

  const categories = useMemo(() => {
    if (!items) return ['All'];
    const set = Array.from(new Set(items.map((i) => i.category)));
    return ['All', ...set];
  }, [items]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { All: items?.length ?? 0 };
    for (const item of items ?? []) {
      map[item.category] = (map[item.category] || 0) + 1;
    }
    return map;
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter((i) => {
      const matchCategory = category === 'All' || i.category === category;
      const matchQuery =
        !q ||
        i.food_name.toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q);
      return matchCategory && matchQuery;
    });
  }, [items, category, query]);

  const adabrakaPhone = settings?.adabraka_phone || '0244143271';
  const dzorwuluPhone = settings?.dzorwulu_phone || '0533634378';

  return (
    <>
      {/* Editorial Menu Header */}
      <section className="border-b border-neutral-200 bg-[#F7F7F7] py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <Eyebrow>Digital Kitchen Menu</Eyebrow>
              <h1 className="text-3xl font-bold tracking-[-0.025em] text-[#111111] sm:text-4xl md:text-5xl">
                Order Fresh From Mayford
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[#6B6B6B] sm:text-base">
                Select your dishes, review your cart, and complete checkout to send your order directly to our Adabraka or Dzorwulu kitchen.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[#6B6B6B]">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#111111]" />
                  Adabraka &amp; Dzorwulu, Accra
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#111111]" />
                  {settings?.opening_hours || '9:00 AM - 9:30 PM Daily'}
                </span>
                <Link
                  to="/menu-access"
                  className="inline-flex items-center gap-1.5 font-semibold text-[#111111] underline underline-offset-4 hover:text-mayford-600"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  QR Code Menu
                </Link>
              </div>
            </div>

            {/* Search Input */}
            <div className="w-full max-w-md">
              <label htmlFor="menu-search" className="sr-only">
                Search dishes
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  id="menu-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search jollof, banku, yam, palava sauce..."
                  className="w-full rounded-md border border-neutral-300 bg-white py-2.5 pl-10 pr-9 text-sm text-[#111111] placeholder-neutral-400 outline-none transition-colors focus:border-[#111111] focus:ring-1 focus:ring-[#111111]"
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-neutral-400 hover:text-[#111111]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Category Bar (Uber Eats / Airbnb style) */}
      <div className="sticky top-16 z-30 border-b border-neutral-200 bg-white lg:top-[72px]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
            {categories.map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`relative shrink-0 px-4 py-3.5 text-xs font-semibold tracking-wide transition-colors sm:text-sm ${
                    active ? 'text-[#111111]' : 'text-[#6B6B6B] hover:text-[#111111]'
                  }`}
                >
                  <span>{c}</span>
                  <span className="ml-1.5 text-[11px] font-normal text-neutral-400">
                    ({categoryCounts[c] ?? 0})
                  </span>
                  {active && <span className="absolute inset-x-4 bottom-0 h-[2px] bg-[#111111]" />}
                </button>
              );
            })}
          </div>

          {count > 0 && (
            <Link
              to="/cart"
              className="hidden shrink-0 items-center gap-2 rounded-md bg-mayford-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-mayford-700 md:inline-flex"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>
                View Cart ({count}) · {ghs(total)}
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* Menu Items Grid */}
      <Section tone="white" className="!py-12 md:!py-16">
        <div className="mb-8 flex items-baseline justify-between">
          <h2 className="text-xl font-bold tracking-tight text-[#111111] sm:text-2xl">
            {category === 'All' ? 'All Dishes' : category}
          </h2>
          {items && (
            <span className="text-xs font-medium text-[#6B6B6B]">
              Showing {visible.length} {visible.length === 1 ? 'dish' : 'dishes'}
            </span>
          )}
        </div>

        {!items ? (
          <FoodCardSkeleton count={6} />
        ) : visible.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-[#F7F7F7] px-6 py-16 text-center">
            <Utensils className="mx-auto h-8 w-8 text-neutral-400" />
            <h3 className="mt-3 text-base font-bold text-[#111111]">No matching dishes found</h3>
            <p className="mt-1 text-sm text-[#6B6B6B]">
              Try clearing your search filter or selecting another menu category.
            </p>
            {(query || category !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategory('All');
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#111111] px-4 py-2 text-xs font-semibold text-white"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item, i) => (
              <Reveal key={item.id} delay={(i % 3) * 60}>
                <FoodCard item={item} />
              </Reveal>
            ))}
          </div>
        )}
      </Section>

      {/* Direct WhatsApp Ordering Band */}
      <Section tone="default" className="border-t border-neutral-200 !py-14">
        <div className="flex flex-col items-start justify-between gap-6 rounded-lg border border-neutral-200 bg-white p-6 sm:p-8 lg:flex-row lg:items-center">
          <div>
            <Eyebrow>Direct Kitchen Line</Eyebrow>
            <h2 className="text-xl font-bold tracking-tight text-[#111111] sm:text-2xl">
              Prefer to Place Your Order Over WhatsApp?
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-[#6B6B6B]">
              Message our Adabraka or Dzorwulu team directly for custom requests, office group orders, or delivery inquiries.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LinkBtn
              href={waLink(adabrakaPhone, 'Hello Mayford Foods Adabraka, I would like to place an order.')}
              external
              variant="dark"
            >
              <MessageCircle className="h-4 w-4 text-whatsapp" />
              <span>WhatsApp Adabraka</span>
            </LinkBtn>
            <LinkBtn
              href={waLink(dzorwuluPhone, 'Hello Mayford Foods Dzorwulu, I would like to place an order.')}
              external
              variant="outline"
            >
              <MessageCircle className="h-4 w-4 text-whatsapp" />
              <span>WhatsApp Dzorwulu</span>
            </LinkBtn>
          </div>
        </div>

        {/* FDA Hygiene & Allergen Compliance Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-5 py-3.5 text-xs text-[#6B6B6B]">
          <span>
            <strong className="text-[#111111]">Allergen &amp; Hygiene Notice:</strong> Traditional Ghanaian dishes may
            contain groundnuts, dried shrimp (shito), fish, dairy, or wheat. Prepared under FDA Ghana hygiene standards.
          </span>
          <div className="flex items-center gap-4 font-semibold text-[#111111]">
            <Link to="/track-order" className="underline hover:text-mayford-600">
              Track Existing Order
            </Link>
            <Link to="/legal" className="underline hover:text-mayford-600">
              Allergen &amp; Refund Policy
            </Link>
          </div>
        </div>
      </Section>

      {/* Uber Eats style Floating Cart Bar when items are in cart */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-20 sm:bottom-5 z-40 mx-auto w-full max-w-xl px-4 pointer-events-none">
          <div className="pointer-events-auto flex items-center justify-between gap-4 rounded-lg border border-white/15 bg-[#111111] px-5 py-3.5 text-white shadow-lift">
            <div className="flex items-center gap-3">
              <span className="flex h-7 min-w-7 items-center justify-center rounded-sm bg-mayford-600 px-2 text-xs font-bold tabular-nums">
                {count}
              </span>
              <div>
                <p className="text-xs font-medium text-neutral-400">Current Order</p>
                <p className="text-sm font-bold tabular-nums">{ghs(total)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/cart"
                className="rounded-md border border-white/20 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
              >
                View Cart
              </Link>
              <Link
                to="/checkout"
                className="inline-flex items-center gap-1.5 rounded-md bg-white px-4 py-2 text-xs font-semibold text-[#111111] transition-colors hover:bg-neutral-200"
              >
                <span>Checkout</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
