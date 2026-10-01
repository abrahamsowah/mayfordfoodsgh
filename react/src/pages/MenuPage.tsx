import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChefHat,
  Flame,
  LayoutGrid,
  MessageCircle,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Soup,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../api';
import { FoodCard, FoodRow } from '../components/FoodCard';
import { useCart } from '../context/CartContext';
import { Reveal } from '../components/motion';
import { useSettings } from '../components/SiteLayout';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  IconTile,
  LinkBtn,
  SearchInput,
  Section,
  Select,
  SkeletonCard,
} from '../components/ui';
import type { MenuItem } from '../types';
import { effectivePrice, ghs, waLink } from '../utils';

/* Category → icon, so the filter rail reads like an app, not a list */
const CATEGORY_ICONS: { match: RegExp; icon: LucideIcon }[] = [
  { match: /rice|jollof|waakye/i, icon: Wheat },
  { match: /soup|local|traditional|banku|fufu/i, icon: Soup },
  { match: /grill|bbq|chicken|meat/i, icon: Flame },
  { match: /continental|pasta|burger|pizza/i, icon: ChefHat },
];
function categoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS.find((c) => c.match.test(name))?.icon ?? UtensilsCrossed;
}


export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [offersOnly, setOffersOnly] = useState(false);
  const [sort, setSort] = useState<'popular' | 'price-asc' | 'price-desc'>('popular');
  const [added, setAdded] = useState<number | null>(null);
  const { count, total, addItem } = useCart();
  const { settings } = useSettings();

  useEffect(() => {
    api
      .get<{ items: MenuItem[] }>('/menu')
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
  }, []);

  const categories = useMemo(() => {
    if (!items) return ['All'];
    return ['All', ...Array.from(new Set(items.map((i) => i.category)))];
  }, [items]);

  const visible = useMemo(() => {
    let list = (items ?? []).filter((i) => category === 'All' || i.category === category);
    if (offersOnly) list = list.filter((i) => Number(i.discount_percent || 0) > 0);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((i) => `${i.food_name} ${i.description} ${i.category}`.toLowerCase().includes(q));
    if (sort === 'price-asc') list = [...list].sort((a, b) => effectivePrice(a) - effectivePrice(b));
    if (sort === 'price-desc') list = [...list].sort((a, b) => effectivePrice(b) - effectivePrice(a));
    return list;
  }, [items, category, offersOnly, search, sort]);

  function handleAdd(item: MenuItem) {
    addItem(item);
    setAdded(item.id);
    window.setTimeout(() => setAdded((v) => (v === item.id ? null : v)), 1400);
  }

  return (
    <>
      {/* Page intro — compact, functional, no poster hero */}
      <section className="border-b border-ink-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-10 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge tone="brand" icon={UtensilsCrossed}>
                Digital menu
              </Badge>
              <h1 className="mt-4 text-[2rem] font-extrabold leading-[1.1] tracking-tight text-ink-900 md:text-[2.5rem]">
                Order from our kitchen
              </h1>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-500">
                Add what you like to the cart, then confirm on WhatsApp with the branch closest to you. Prices in Ghana
                cedis.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:items-center">
              <SearchInput
                value={search}
                onChange={setSearch}
                icon={Search}
                placeholder="Search jollof, banku…"
                className="w-full sm:w-72"
              />
              {count > 0 ? (
                <Link
                  to="/cart"
                  className="flex h-12 shrink-0 items-center justify-between gap-3 rounded-tile bg-ink-900 pl-5 pr-2 text-white transition hover:bg-mayford-600"
                >
                  <span className="flex items-center gap-2.5 text-sm font-extrabold">
                    <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2.3} />
                    View cart · {ghs(total)}
                  </span>
                  <span className="flex h-8 min-w-8 items-center justify-center rounded-tile bg-mayford-600 px-2 text-[13px] font-extrabold tabular-nums">
                    {count}
                  </span>
                </Link>
              ) : (
                <LinkBtn href="/cart" variant="outline" size="md" icon={ShoppingBag} className="shrink-0 !h-12">
                  Cart
                </LinkBtn>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sticky filter bar */}
      <div className="sticky top-16 z-30 border-b border-ink-200 bg-white/95 md:top-[72px]">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-3">
            <div className="rail -mx-1 flex-1 gap-2 px-1">
              <Chip active={category === 'All'} icon={LayoutGrid} onClick={() => setCategory('All')}>
                All
              </Chip>
              {categories.slice(1).map((c) => (
                <Chip key={c} active={category === c} icon={categoryIcon(c)} onClick={() => setCategory(c)}>
                  {c}
                </Chip>
              ))}
              <Chip active={offersOnly} icon={Flame} onClick={() => setOffersOnly((v) => !v)}>
                Offers
              </Chip>
            </div>
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <SlidersHorizontal className="h-4 w-4 text-ink-400" strokeWidth={2.3} />
              <Select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                aria-label="Sort menu"
                className="!h-10 !w-40 !rounded-tile !pl-3.5 !text-[13px] !font-bold"
              >
                <option value="popular">Most popular</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <Section tone="white" className="!pt-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13.5px] font-bold text-ink-500">
            {items === null ? (
              'Loading menu…'
            ) : (
              <>
                <span className="text-ink-900">{visible.length}</span> item{visible.length === 1 ? '' : 's'}
                {category !== 'All' && <> in {category}</>}
                {offersOnly && <> on offer</>}
              </>
            )}
          </p>
          {settings?.opening_hours && (
            <p className="text-[12.5px] font-semibold text-ink-400">Open today · {settings.opening_hours}</p>
          )}
        </div>

        {items === null ? (
          <div className="grid gap-5 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="Nothing matches that yet"
            text="Try another search term or clear the filters to see the full menu."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setCategory('All');
                  setOffersOnly(false);
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            {/* Mobile: compact rows */}
            <div className="space-y-3 lg:hidden">
              {visible.map((item) => (
                <FoodRow key={item.id} item={item} added={added === item.id} onAdd={() => handleAdd(item)} />
              ))}
            </div>
            {/* Desktop: card grid */}
            <div className="hidden gap-5 lg:grid lg:grid-cols-3">
              {visible.map((item, i) => (
                <Reveal key={item.id} delay={(i % 3) * 60}>
                  <FoodCard item={item} added={added === item.id} onAdd={() => handleAdd(item)} />
                </Reveal>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* Order help band */}
      <Section className="!pt-0">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-6 rounded-card border border-ink-200 bg-white p-6 md:flex-row md:items-center md:p-8">
            <div className="flex items-start gap-4">
              <IconTile icon={MessageCircle} tone="success" size="lg" />
              <div>
                <h2 className="text-[17px] font-extrabold tracking-tight text-ink-900">Prefer to order by chat?</h2>
                <p className="mt-1 max-w-lg text-[13.5px] leading-relaxed text-ink-500">
                  Send us your order on WhatsApp and we will confirm the total, pickup time or delivery details right
                  away.
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <LinkBtn
                href={waLink(settings?.adabraka_phone || '0244143271', 'Hello Mayford Foods, I would like to place an order.')}
                external
                variant="whatsapp"
                size="lg"
                icon={MessageCircle}
              >
                Adabraka
              </LinkBtn>
              <LinkBtn
                href={waLink(settings?.dzorwulu_phone || '0533634378', 'Hello Mayford Foods, I would like to place an order.')}
                external
                variant="outline"
                size="lg"
                icon={MessageCircle}
              >
                Dzorwulu
              </LinkBtn>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
