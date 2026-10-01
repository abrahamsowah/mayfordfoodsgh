import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  CalendarHeart,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  GraduationCap,
  Heart,
  Leaf,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Play,
  Sparkles,
  Star,
  Store,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { api } from '../api';
import { FoodCard } from '../components/FoodCard';
import { useSettings } from '../components/SiteLayout';
import { useCart } from '../context/CartContext';
import { CountUp, Reveal } from '../components/motion';
import {
  Badge,
  Card,
  IconTile,
  LinkBtn,
  Section,
  SectionHeader,
  SkeletonCard,
  Stars,
  ZoomImg,
} from '../components/ui';
import type { Advert, AdVideo, MenuItem, Rating, Slide } from '../types';
import { waLink } from '../utils';

/* ==================================================================
   HERO — full-bleed kitchen photography + one clear next step
================================================================== */
function HeroSlider({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);
  if (slides.length === 0) return <div className="absolute inset-0 bg-ink-950" />;
  return (
    <>
      {slides.map((s, i) => (
        <img
          key={s.id}
          src={`/assets/images/${s.image}`}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ${
            i === index ? 'kenburns opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      <div className="absolute inset-0 scrim-side" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/20 to-transparent" />
    </>
  );
}

function Hero({ settings }: { settings: ReturnType<typeof useSettings>['settings'] }) {
  const [slides, setSlides] = useState<Slide[]>([]);
  useEffect(() => {
    api.get<{ slides: Slide[] }>('/slides').then((d) => setSlides(d.slides)).catch(() => undefined);
  }, []);

  return (
    <section className="relative overflow-hidden bg-ink-950">
      <div className="absolute inset-0">
        <HeroSlider slides={slides} />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-28 pt-16 sm:px-6 sm:pb-32 sm:pt-20 lg:px-8 lg:pb-40 lg:pt-28">
        <div className="max-w-2xl">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-pill border border-white/15 bg-white/10 py-1.5 pl-1.5 pr-4 backdrop-blur">
              <span className="flex h-6 items-center gap-1.5 rounded-pill bg-flame-500 px-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white">
                <Sparkles className="h-3 w-3" strokeWidth={2.6} /> Fresh daily
              </span>
              <span className="text-[12.5px] font-bold text-white/90">Cooked fresh every morning</span>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-6 text-[2.5rem] font-extrabold leading-[1.04] tracking-[-0.03em] text-white sm:text-[3.25rem] lg:text-[3.75rem]">
              Ghanaian food,
              <br />
              <span className="text-gradient">made for today.</span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-200 sm:text-base">
              Jollof, banku, rice balls, grills and continental plates from our two Accra kitchens. Order for pickup,
              delivery or let us cater your next event.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <LinkBtn href="/menu" variant="accent" size="lg" icon={UtensilsCrossed} className="w-full sm:w-auto">
                Order now
              </LinkBtn>
              <LinkBtn
                href={waLink(settings?.adabraka_phone || '0244143271', 'Hello Mayford Foods, I would like to order.')}
                external
                variant="white"
                size="lg"
                icon={MessageCircle}
                className="w-full sm:w-auto"
              >
                Order on WhatsApp
              </LinkBtn>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] font-bold text-white/85">
              <span className="inline-flex items-center gap-2">
                <Star className="h-4 w-4 fill-flame-500 text-flame-500" strokeWidth={2} /> Loved across Accra
              </span>
              <span className="inline-flex items-center gap-2">
                <Bike className="h-4 w-4 text-flame-400" strokeWidth={2.2} /> Delivery on Bolt Food
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-flame-400" strokeWidth={2.2} /> Open 7 days
              </span>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Overlapping info bar — the product's "delivery promise" strip */}
      <div className="relative mx-auto -mb-10 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal delay={380}>
          <div className="grid divide-ink-100 overflow-hidden rounded-card border border-ink-200 bg-white shadow-raised sm:grid-cols-3 sm:divide-x">
            {[
              { icon: Store, label: 'Two outlets', value: 'Adabraka & Dzorwulu' },
              { icon: Clock, label: 'Opening hours', value: settings?.opening_hours || '9:00 AM – 9:30 PM daily' },
              { icon: Bike, label: 'Delivery', value: 'Bolt Food across Accra' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3.5 px-5 py-4 sm:px-6">
                <IconTile icon={f.icon} tone="light" size="sm" />
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink-400">{f.label}</p>
                  <p className="truncate text-[13.5px] font-bold text-ink-900">{f.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ==================================================================
   QUICK ACTIONS — the four things people come here to do
================================================================== */
const ACTIONS = [
  { to: '/menu', icon: UtensilsCrossed, title: 'Full menu', hint: 'Ghanaian & continental', tone: 'brand' as const },
  { to: '/catering', icon: Sparkles, title: 'Catering', hint: 'Weddings & events', tone: 'flame' as const },
  { to: '/training', icon: GraduationCap, title: 'Training', hint: 'Academy courses', tone: 'dark' as const },
  { to: '/community', icon: Heart, title: 'Community', hint: 'Outreach work', tone: 'light' as const },
];

function QuickActions() {
  return (
    <Section className="!py-10 md:!py-12">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map((a, i) => (
          <Reveal key={a.to} delay={i * 60}>
            <Link
              to={a.to}
              className="group flex items-center gap-4 rounded-card border border-ink-200 bg-white p-4 shadow-xs transition duration-300 hover:-translate-y-1 hover:border-ink-300 hover:shadow-raised"
            >
              <IconTile icon={a.icon} tone={a.tone} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-extrabold tracking-tight text-ink-900">{a.title}</p>
                <p className="truncate text-[12.5px] text-ink-500">{a.hint}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-ink-600" strokeWidth={2.6} />
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ==================================================================
   PROMO CAROUSEL — DB adverts, presented like in-app banners
================================================================== */
function PromoCarousel({ adverts }: { adverts: Advert[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (adverts.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % adverts.length), 8000);
    return () => clearInterval(t);
  }, [adverts.length]);
  if (adverts.length === 0) return null;
  const go = (d: number) => setIndex((i) => (i + d + adverts.length) % adverts.length);

  return (
    <div className="relative">
      {adverts.map((a, i) => (
        <div
          key={a.id}
          className={`transition-all duration-700 ${i === index ? 'opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'}`}
        >
          <div className="grid overflow-hidden rounded-[1.75rem] bg-ink-950 shadow-pop md:grid-cols-[1.1fr_1fr]">
            <div className="relative order-2 h-52 md:order-1 md:h-full md:min-h-[20rem]">
              <img
                src={`/assets/adverts/${a.banner_image}`}
                alt={a.title}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `/assets/images/${a.banner_image}`;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent md:bg-gradient-to-r md:from-ink-950 md:via-ink-950/30 md:to-transparent" />
            </div>
            <div className="order-1 flex flex-col justify-center gap-4 p-6 md:order-2 md:p-10">
              <Badge tone="flame" icon={Flame} className="!bg-flame-500 !text-white">
                Limited offer
              </Badge>
              <h3 className="text-[1.6rem] font-extrabold leading-[1.12] tracking-tight text-white md:text-[2rem]">
                {a.title}
              </h3>
              <p className="max-w-md text-[14.5px] leading-relaxed text-ink-300">{a.description}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <LinkBtn href={a.button_link || '/menu'} variant="accent" size="md" iconRight={ArrowRight}>
                  {a.button_text || 'View menu'}
                </LinkBtn>
                {adverts.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Previous offer"
                      onClick={() => go(-1)}
                      className="flex h-9 w-9 items-center justify-center rounded-pill border border-white/15 text-white/80 transition hover:bg-white/10 hover:text-white"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={2.4} />
                    </button>
                    <button
                      type="button"
                      aria-label="Next offer"
                      onClick={() => go(1)}
                      className="flex h-9 w-9 items-center justify-center rounded-pill border border-white/15 text-white/80 transition hover:bg-white/10 hover:text-white"
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      {adverts.length > 1 && (
        <div className="mt-4 flex justify-center gap-1.5">
          {adverts.map((_, d) => (
            <button
              key={d}
              type="button"
              aria-label={`Go to offer ${d + 1}`}
              onClick={() => setIndex(d)}
              className={`h-1.5 rounded-pill transition-all ${d === index ? 'w-7 bg-mayford-600' : 'w-1.5 bg-ink-300 hover:bg-ink-400'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================================================================
   POPULAR DISHES — the actual ordering surface
================================================================== */
function PopularDishes({ items, loading }: { items: MenuItem[]; loading: boolean }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState<number | null>(null);

  function add(item: MenuItem) {
    addItem(item);
    setAdded(item.id);
    window.setTimeout(() => setAdded((v) => (v === item.id ? null : v)), 1500);
  }

  return (
    <Section tone="white" id="popular">
      <SectionHeader
        eyebrow="Straight from the kitchen"
        title="Popular right now"
        text="Signature plates our customers keep coming back for at both outlets."
        action={
          <LinkBtn href="/menu" variant="ghost" size="md" iconRight={ArrowRight} className="hidden sm:inline-flex">
            Full menu
          </LinkBtn>
        }
      />

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-card border border-dashed border-ink-200 bg-ink-50 py-14 text-center text-sm text-ink-500">
          The menu is being updated — please check back shortly.
        </p>
      ) : (
        <>
          {/* Mobile: swipeable rail with snap points */}
          <div className="rail -mx-4 gap-4 px-4 pb-6 sm:hidden">
            {items.map((m) => (
              <div key={m.id} className="w-[76%] shrink-0">
                <FoodCard item={m} added={added === m.id} onAdd={() => add(m)} />
              </div>
            ))}
          </div>
          <div
            className={`hidden gap-5 sm:grid sm:grid-cols-2 lg:grid-cols-3 ${
              items.length < 3 ? 'mx-auto max-w-3xl lg:grid-cols-2' : ''
            }`}
          >
            {items.slice(0, 6).map((m, i) => (
              <Reveal key={m.id} delay={(i % 3) * 70}>
                <FoodCard item={m} added={added === m.id} onAdd={() => add(m)} />
              </Reveal>
            ))}
          </div>
          <div className="mt-6 text-center sm:hidden">
            <LinkBtn href="/menu" variant="dark" size="lg" iconRight={ArrowRight} full>
              Browse the full menu
            </LinkBtn>
          </div>
        </>
      )}
    </Section>
  );
}

/* ==================================================================
   VALUE PROPS — one bordered panel, four reasons
================================================================== */
const VALUES = [
  { icon: ChefHat, title: 'Cooked fresh daily', text: 'Every pot starts from scratch each morning.' },
  { icon: Users, title: 'Family owned', text: 'Run by the Mayford family since day one.' },
  { icon: Leaf, title: 'Local ingredients', text: 'Sourced from Accra markets, never frozen.' },
  { icon: GraduationCap, title: 'Training academy', text: '70% hands-on hospitality education.' },
];

function ValueStrip() {
  return (
    <Section className="!py-10 md:!py-14">
      <Reveal>
        <div className="grid divide-ink-100 overflow-hidden rounded-card border border-ink-200 bg-white shadow-xs sm:grid-cols-2 sm:divide-x lg:grid-cols-4">
          {VALUES.map((v, i) => (
            <div key={v.title} className={`flex items-start gap-3.5 p-5 md:p-6 ${i > 1 ? 'border-t border-ink-100 lg:border-t-0' : ''}`}>
              <IconTile icon={v.icon} tone="light" size="sm" />
              <div>
                <h3 className="text-[14px] font-extrabold tracking-tight text-ink-900">{v.title}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">{v.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}

/* ==================================================================
   CATERING — split section with a stat card
================================================================== */
function CateringSection() {
  return (
    <Section tone="white">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal className="order-2 lg:order-1">
          <div className="relative">
            <div className="grid grid-cols-5 gap-4">
              <img
                src="/assets/images/outsidecater4.jpeg"
                alt="Catering setup"
                className="col-span-3 h-64 w-full rounded-card object-cover md:h-80"
              />
              <div className="col-span-2 flex flex-col gap-4">
                <img src="/assets/images/outsidecater1.jpeg" alt="Catering service" className="h-[7.5rem] w-full rounded-card object-cover md:h-36" />
                <img src="/assets/images/outsidecater7.jpeg" alt="Catering buffet" className="h-[7.5rem] w-full rounded-card object-cover md:h-36" />
              </div>
            </div>
            <div className="absolute -bottom-5 left-5 flex items-center gap-3 rounded-card border border-ink-200 bg-white px-4 py-3 shadow-raised">
              <IconTile icon={CalendarHeart} tone="flame" size="sm" />
              <div className="leading-tight">
                <p className="text-[15px] font-extrabold tabular-nums text-ink-900">
                  <CountUp value={500} suffix="+" />
                </p>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">Events served</p>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={100} className="order-1 lg:order-2">
          <Badge tone="brand" icon={Sparkles}>
            Outside catering
          </Badge>
          <h2 className="mt-4 text-[1.75rem] font-extrabold leading-[1.15] tracking-tight text-ink-900 md:text-[2.1rem]">
            We feed weddings, boardrooms &amp; everything in between
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
            Tell us the date and the guest count — we plan the menu, cook on site, serve and clean up. Anywhere in
            Accra.
          </p>
          <ul className="mt-6 space-y-3.5">
            {[
              { icon: UtensilsCrossed, text: 'Custom menus for any guest count' },
              { icon: Users, text: 'Professional wait & setup team' },
              { icon: Navigation, text: 'Delivery and on-site service in Accra' },
            ].map((li) => (
              <li key={li.text} className="flex items-center gap-3 text-[14.5px] font-semibold text-ink-700">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-success-50 text-success-600">
                  <li.icon className="h-4 w-4" strokeWidth={2.4} />
                </span>
                {li.text}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkBtn href="/catering" variant="primary" size="lg" icon={Sparkles}>
              Plan my event
            </LinkBtn>
            <LinkBtn href="/contact" variant="outline" size="lg">
              Ask a question
            </LinkBtn>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* ==================================================================
   VIDEOS — "see us in action"
================================================================== */
function VideoCard({ src, title, featured = false }: { src: string; title: string; featured?: boolean }) {
  const [ratio, setRatio] = useState<number | null>(null);
  return (
    <Card className={`group overflow-hidden ${featured ? 'ring-2 ring-flame-500/30' : ''}`}>
      <div className="relative bg-ink-950" style={{ aspectRatio: ratio ? `${ratio}` : '16 / 9' }}>
        <video
          controls
          preload="metadata"
          playsInline
          className="absolute inset-0 h-full w-full object-contain"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight);
          }}
        >
          <source src={src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="flex items-center gap-3 border-t border-ink-100 px-4 py-3.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-tile bg-ink-900 text-white">
          <Play className="h-4 w-4 fill-current" strokeWidth={0} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-extrabold text-ink-900">{title}</p>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">Mayford in motion</p>
        </div>
      </div>
    </Card>
  );
}

function VideoSection({ videos }: { videos: AdVideo[] }) {
  if (videos.length === 0) return null;
  return (
    <Section className="!pt-0">
      <SectionHeader
        eyebrow="Now showing"
        title="See us in action"
        text="A look inside our kitchens, events and community work."
      />
      <div className={`grid gap-6 ${videos.length === 1 ? 'mx-auto max-w-3xl' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
        {videos.map((v, i) => (
          <Reveal key={v.id} delay={i * 80}>
            <VideoCard
              src={`/assets/videos/${v.video_name}`}
              title={`Advertisement ${i + 1}`}
              featured={videos.length > 1 && i === 0}
            />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ==================================================================
   COMMUNITY — dark chapter with photo cards
================================================================== */
function CommunitySection() {
  const cards = [
    { img: 'community1.png', label: 'Food donations' },
    { img: 'community2.png', label: 'Outreach programs' },
    { img: 'community5.png', label: 'Community support' },
  ];
  return (
    <section className="relative overflow-hidden bg-ink-950 py-16 md:py-24">
      <div className="absolute inset-0 bg-dots-dark opacity-25" />
      <div className="absolute -top-24 left-1/3 h-72 w-72 rounded-full bg-mayford-600/25 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          light
          eyebrow="Mayford cares"
          title="Giving back is part of the recipe"
          text="Food donations, outreach programmes and community support across Accra."
          action={
            <LinkBtn href="/community" variant="ghost" size="md" iconRight={ArrowRight} className="!text-flame-300 hover:!bg-white/10 hover:!text-white">
              See our impact
            </LinkBtn>
          }
        />
        <div className="grid gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <Reveal key={c.img} delay={i * 90}>
              <Link
                to="/community"
                className="group relative block overflow-hidden rounded-card ring-1 ring-white/10 transition duration-300 hover:ring-flame-500/50"
              >
                <img
                  src={`/assets/images/${c.img}`}
                  alt={c.label}
                  className="h-64 w-full object-cover transition duration-[900ms] group-hover:scale-[1.05] md:h-72"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                  <div>
                    <p className="text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-flame-400">Mayford cares</p>
                    <p className="mt-1.5 text-[15px] font-extrabold tracking-tight text-white">{c.label}</p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 -translate-x-1 items-center justify-center rounded-pill bg-white/10 text-white opacity-0 backdrop-blur transition duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                    <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==================================================================
   OUTLETS
================================================================== */
function OutletsSection({ settings }: { settings: ReturnType<typeof useSettings>['settings'] }) {
  const outlets = [
    {
      name: 'Mayford Locals',
      area: 'Adabraka',
      img: 'adabraka.webp',
      address: 'Adabraka Market, Building A, Shop 5',
      phone: settings?.adabraka_phone || '0244143271',
      map: 'https://www.google.com/maps/search/?api=1&query=Adabraka+Market+Building+A+Shop+5+Accra+Ghana',
    },
    {
      name: 'Mayford Fast Food',
      area: 'Dzorwulu',
      img: 'dzorwulu.jpeg',
      address: 'Dzorwulu Market, Shop 12 & 14',
      phone: settings?.dzorwulu_phone || '0533634378',
      map: 'https://www.google.com/maps/search/?api=1&query=Dzorwulu+Market+Shop+12+14+Accra+Ghana',
    },
  ];
  return (
    <Section tone="white">
      <SectionHeader
        eyebrow="Find us"
        title="Two kitchens, one standard"
        text="Walk in, call ahead or order for delivery — both branches are open every day."
        action={
          <LinkBtn href="/outlets" variant="outline" size="md" iconRight={ArrowRight}>
            All outlet details
          </LinkBtn>
        }
      />
      <div className="grid gap-5 md:grid-cols-2">
        {outlets.map((o, i) => (
          <Reveal key={o.area} delay={i * 90}>
            <Card interactive className="h-full">
              <div className="relative">
                <ZoomImg src={`/assets/images/${o.img}`} alt={o.name} className="aspect-[16/9]" />
                <div className="absolute left-4 top-4 flex items-center gap-2">
                  <Badge tone="white" className="!h-8 !px-3">
                    <MapPin className="h-3.5 w-3.5 text-mayford-600" strokeWidth={2.6} />
                    {o.area}
                  </Badge>
                  <Badge tone="white" className="!h-8 !px-3">
                    <span className="mr-0.5 h-1.5 w-1.5 rounded-full bg-success-500" /> Open now
                  </Badge>
                </div>
              </div>
              <div className="p-5 md:p-6">
                <h3 className="text-[17px] font-extrabold tracking-tight text-ink-900">{o.name}</h3>
                <p className="mt-1.5 flex items-start gap-2 text-[13.5px] text-ink-500">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" strokeWidth={2.2} />
                  {o.address}
                </p>
                <p className="mt-1.5 flex items-center gap-2 text-[13.5px] text-ink-500">
                  <Clock className="h-4 w-4 shrink-0 text-ink-400" strokeWidth={2.2} />
                  {settings?.opening_hours || 'Monday – Sunday, 9:00 AM – 9:30 PM'}
                </p>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <LinkBtn href={o.map} external variant="dark" size="sm" icon={Navigation}>
                    Directions
                  </LinkBtn>
                  <LinkBtn href={waLink(o.phone)} external variant="whatsapp" size="sm" icon={MessageCircle}>
                    WhatsApp
                  </LinkBtn>
                  <LinkBtn href={`tel:${o.phone}`} variant="outline" size="sm" icon={Phone}>
                    {o.phone}
                  </LinkBtn>
                </div>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ==================================================================
   REVIEWS
================================================================== */
function ReviewsSection({ data }: { data: { ratings: Rating[]; average: number; count: number } }) {
  if (!data.count) return null;
  return (
    <Section>
      <SectionHeader
        eyebrow="Customer reviews"
        title="Loved by our customers"
        text={`${data.count} customer${data.count > 1 ? 's have' : ' has'} rated Mayford Foods.`}
        action={
          <div className="flex items-center gap-3 rounded-pill border border-ink-200 bg-white px-4 py-2.5 shadow-xs">
            <span className="text-2xl font-extrabold leading-none text-ink-900">{data.average.toFixed(1)}</span>
            <div>
              <Stars n={data.average} size="sm" />
              <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">Average rating</p>
            </div>
          </div>
        }
      />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {data.ratings.slice(0, 6).map((r, i) => (
          <Reveal key={r.id} delay={(i % 3) * 80}>
            <Card className="flex h-full flex-col p-5">
              <div className="flex items-center justify-between">
                <Stars n={r.rating} size="sm" />
                <Badge tone="neutral" size="sm">
                  {r.service_type}
                </Badge>
              </div>
              <blockquote className="mt-3.5 flex-1 text-[14px] leading-relaxed text-ink-700">
                “{r.comment || `Rated ${r.service_type} ${r.rating}/5`}”
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3 border-t border-ink-100 pt-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-pill bg-mayford-50 text-[13px] font-extrabold text-mayford-700">
                  {r.customer_name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="text-[13px] font-bold text-ink-900">{r.customer_name}</span>
              </figcaption>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ==================================================================
   FINAL CTA
================================================================== */
function CtaSection({ whatsapp }: { whatsapp: string }) {
  return (
    <Section tone="white" className="!pt-0">
      <Reveal>
        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-mayford-700 via-mayford-800 to-ink-950 px-6 py-12 text-center md:px-16 md:py-16">
          <div className="absolute inset-0 bg-dots-dark opacity-20" />
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-flame-500/25 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto max-w-2xl">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-inset ring-white/20 backdrop-blur">
              <UtensilsCrossed className="h-7 w-7 text-flame-400" strokeWidth={2.1} />
            </div>
            <h2 className="text-[1.75rem] font-extrabold leading-tight tracking-tight text-white md:text-[2.25rem]">
              Hungry? We are already cooking.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-ink-200">
              Build your order in the cart, or send us a message and our team will help you choose.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <LinkBtn href="/menu" variant="accent" size="lg" icon={UtensilsCrossed}>
                Start an order
              </LinkBtn>
              <LinkBtn href={waLink(whatsapp, 'Hello Mayford Foods!')} external variant="white" size="lg" icon={MessageCircle}>
                Chat with us
              </LinkBtn>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/* ==================================================================
   PAGE
================================================================== */
export default function HomePage() {
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [videos, setVideos] = useState<AdVideo[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [ratings, setRatings] = useState<{ ratings: Rating[]; average: number; count: number } | null>(null);
  const { settings } = useSettings();

  useEffect(() => {
    api.get<{ adverts: Advert[] }>('/adverts').then((d) => setAdverts(d.adverts)).catch(() => undefined);
    api.get<{ videos: AdVideo[] }>('/advertisement-videos').then((d) => setVideos(d.videos)).catch(() => undefined);
    api
      .get<{ items: MenuItem[] }>('/menu')
      .then((d) => setMenu(d.items.slice(0, 6)))
      .catch(() => undefined)
      .finally(() => setMenuLoading(false));
    api
      .get<{ ratings: Rating[]; average: number; count: number }>('/public-ratings')
      .then(setRatings)
      .catch(() => undefined);
  }, []);

  return (
    <>
      <Hero settings={settings} />

      <div className="mt-12 md:mt-16">
        <QuickActions />
      </div>

      {adverts.length > 0 && (
        <Section className="!pt-0">
          <Reveal>
            <PromoCarousel adverts={adverts} />
          </Reveal>
        </Section>
      )}

      <PopularDishes items={menu} loading={menuLoading} />
      <ValueStrip />

      {videos.length > 0 && <VideoSection videos={videos} />}

      <CateringSection />
      <CommunitySection />
      <OutletsSection settings={settings} />

      {ratings && <ReviewsSection data={ratings} />}

      <TrainingCta />
      <CtaSection whatsapp={settings?.adabraka_phone || '0244143271'} />
    </>
  );
}

/* ==================================================================
   TRAINING CTA — compact dark card
================================================================== */
function TrainingCta() {
  return (
    <Section className="!pb-0">
      <Reveal>
        <Card className="overflow-hidden !border-ink-900 !bg-ink-950">
          <div className="grid gap-8 p-6 md:grid-cols-[1.3fr_1fr] md:items-center md:p-10">
            <div>
              <div className="flex items-center gap-3">
                <IconTile icon={GraduationCap} tone="glass" />
                <Badge tone="dark" icon={BadgeCheck} className="!bg-white/10 !text-flame-300">
                  Mayford Training Academy
                </Badge>
              </div>
              <h2 className="mt-5 text-[1.6rem] font-extrabold leading-tight tracking-tight text-white md:text-[2rem]">
                Train in real kitchens, taught by chefs who cook every day
              </h2>
              <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-ink-300">
                Culinary arts, restaurant management and hospitality excellence — 70% practical, with an
                entrepreneurship track for students who want to launch their own food business.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <LinkBtn href="/training" variant="accent" size="lg" iconRight={ArrowRight}>
                  Explore programmes
                </LinkBtn>
                <LinkBtn href="/contact" variant="ghost" size="lg" className="!text-white hover:!bg-white/10">
                  Talk to admissions
                </LinkBtn>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 70, suffix: '%', label: 'Practical training' },
                { value: 3, suffix: '', label: 'Training schools' },
                { value: 6, suffix: '', label: 'Career pathways' },
                { value: 1, suffix: '', label: 'Entrepreneurship track' },
              ].map((s) => (
                <div key={s.label} className="rounded-card border border-white/10 bg-white/5 p-4">
                  <p className="text-2xl font-extrabold tabular-nums text-flame-400">
                    <CountUp value={s.value} suffix={s.suffix} />
                  </p>
                  <p className="mt-1 text-[11.5px] font-bold uppercase tracking-[0.14em] text-ink-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </Reveal>
    </Section>
  );
}
