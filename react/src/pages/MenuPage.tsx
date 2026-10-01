import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, ShoppingBag } from 'lucide-react';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { Reveal } from '../components/motion';
import { useSettings } from '../components/SiteLayout';
import { Card, Eyebrow, LinkBtn, Section, SectionTitle, Spinner, ZoomImg } from '../components/ui';
import type { MenuItem } from '../types';
import { effectivePrice, ghs, waLink } from '../utils';

function PriceTag({ item }: { item: MenuItem }) {
  const d = Number(item.discount_percent || 0);
  const base = Number(item.price || 0);
  if (d > 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-lg font-extrabold text-mayford-600">{ghs(effectivePrice(item))}</span>
        <del className="text-sm text-stone-400">{ghs(base)}</del>
        <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-extrabold text-green-700">{d}% OFF</span>
      </div>
    );
  }
  return <span className="text-lg font-extrabold text-mayford-600">{ghs(base)}</span>;
}

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [category, setCategory] = useState('All');
  const [justAdded, setJustAdded] = useState<number | null>(null);
  const { count, addItem } = useCart();
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

  const visible = useMemo(
    () => (items ?? []).filter((i) => category === 'All' || i.category === category),
    [items, category]
  );

  function handleAdd(item: MenuItem) {
    addItem(item);
    setJustAdded(item.id);
    setTimeout(() => setJustAdded((v) => (v === item.id ? null : v)), 1200);
  }

  return (
    <>
      {/* Menu hero band */}
      <section className="relative overflow-hidden bg-stone-950 py-16 md:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(178,34,34,0.5),transparent_60%)]" />
        <div className="relative mx-auto w-full max-w-6xl px-4 text-center sm:px-6">
          <Eyebrow light>Digital Menu</Eyebrow>
          <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">Our Menu</h1>
          <p className="mx-auto mt-4 max-w-xl text-stone-300">
            Fresh Ghanaian &amp; continental meals served daily. Add to your cart, check out, and we&apos;ll confirm
            your order on WhatsApp.
          </p>
          <LinkBtn href="/cart" className="mt-7 !bg-white !text-mayford-700 hover:!bg-mayford-50">
            <ShoppingBag className="h-4 w-4" /> Cart ({count})
          </LinkBtn>
        </div>
      </section>

      <Section tone="white" className="!pt-10">
        {/* Category filter chips (interactive menu) */}
        <div className="mb-10 flex flex-wrap justify-center gap-2.5">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                category === c
                  ? 'bg-mayford-600 text-white shadow-glow'
                  : 'bg-stone-100 text-stone-600 hover:bg-mayford-50 hover:text-mayford-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <SectionTitle center>{category === 'All' ? 'Available Foods' : category}</SectionTitle>

        {!items ? (
          <Spinner />
        ) : visible.length === 0 ? (
          <p className="py-16 text-center text-stone-500">
            No food items in this category right now. Please check back soon.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item, i) => (
              <Reveal key={item.id} delay={(i % 3) * 100}>
                <Card className="flex h-full flex-col">
                  <div className="relative">
                    <ZoomImg src={`/assets/images/${item.image}`} alt={item.food_name} className="h-56" />
                    {item.discount_percent > 0 && (
                      <span className="absolute left-4 top-4 rounded-full bg-green-600 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-white shadow">
                        {item.discount_percent}% off
                      </span>
                    )}
                    <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-mayford-700 backdrop-blur">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-lg font-extrabold tracking-tight text-stone-900">{item.food_name}</h3>
                    <p className="mt-1.5 flex-1 text-sm text-stone-600">{item.description}</p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <PriceTag item={item} />
                      <button
                        type="button"
                        onClick={() => handleAdd(item)}
                        className={`rounded-full px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow transition ${
                          justAdded === item.id ? 'bg-green-600' : 'bg-mayford-600 shadow-glow hover:bg-mayford-700'
                        }`}
                      >
                        {justAdded === item.id ? '✓ Added' : 'Add To Cart'}
                      </button>
                    </div>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        )}
      </Section>

      {/* Order via WhatsApp band */}
      <Section>
        <Reveal>
          <div className="rounded-[2.5rem] bg-gradient-to-r from-mayford-700 to-mayford-600 px-6 py-12 text-center shadow-lift md:px-12">
            <h2 className="text-3xl font-extrabold tracking-tight text-white">Prefer To Chat First?</h2>
            <p className="mx-auto mt-3 max-w-lg text-mayford-100">
              Place your order directly through WhatsApp and our team will confirm everything with you.
            </p>
            <div className="mt-7">
              <LinkBtn
                href={waLink(settings?.adabraka_phone || '0244143271', 'Hello Mayford Foods, I would like to place an order.')}
                external
                variant="white"
              >
                <MessageCircle className="h-4 w-4" /> Order via WhatsApp
              </LinkBtn>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
