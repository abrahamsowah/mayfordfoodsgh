import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
  Star,
  Tag,
  Utensils,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useSettings } from '../components/SiteLayout';
import { useCart } from '../context/CartContext';
import { Reveal } from '../components/motion';
import { Eyebrow, FoodCard, FoodCardSkeleton, LinkBtn, Section, SectionHeader, Stars } from '../components/ui';
import { SmartImage } from '../components/SmartImage';
import type { Advert, AdVideo, MenuItem, Rating, Slide } from '../types';
import { assetUrl, ghs, waLink } from '../utils';

function HeroGallery({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, [slides.length]);

  const fallbackImages = ['hero.png', 'hero2.png', 'hero3.png'];
  const list = slides.length > 0 ? slides.map((s) => s.image) : fallbackImages;

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-neutral-900 lg:aspect-[5/4]">
      {list.map((img, i) => (
        <SmartImage
          key={`${img}-${i}`}
          src={assetUrl('images', img)}
          alt="Mayford Foods signature dishes"
          priority={i === 0}
          sizes="(min-width: 1024px) 58vw, 100vw"
          position="50% 38%"
          className={`hero-slide absolute inset-0 h-full w-full object-cover ${
            i === index ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Bottom caption & controls */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4 sm:p-5">
        <div className="flex items-center gap-2">
          {list.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 transition-all ${
                i === index ? 'w-6 bg-white' : 'w-1.5 bg-neutral-400 hover:bg-neutral-200'
              }`}
            />
          ))}
        </div>

        {list.length > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => setIndex((i) => (i - 1 + list.length) % list.length)}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-[#111111] text-white transition-colors hover:bg-[#262626]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => setIndex((i) => (i + 1) % list.length)}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-[#111111] text-white transition-colors hover:bg-[#262626]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AdvertShowcase({ adverts }: { adverts: Advert[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (adverts.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % adverts.length), 6500);
    return () => clearInterval(t);
  }, [adverts.length]);

  if (adverts.length === 0) return null;
  const active = adverts[index] || adverts[0];

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="grid items-center md:grid-cols-[1.15fr_0.85fr]">
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-mayford-600">
            <Tag className="h-3.5 w-3.5" />
            <span>Featured Promotion</span>
          </div>
          <h3 className="mt-2.5 text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">{active.title}</h3>
          <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-[#6B6B6B] sm:text-base">{active.description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <LinkBtn href={active.button_link || '/menu'} variant="dark">
              <span>{active.button_text || 'Order Now'}</span>
              <ArrowRight className="h-4 w-4" />
            </LinkBtn>
            {adverts.length > 1 && (
              <div className="flex items-center gap-1.5">
                {adverts.map((a, idx) => (
                  <button
                    key={a.id}
                    type="button"
                    aria-label={`View offer ${idx + 1}`}
                    onClick={() => setIndex(idx)}
                    className={`h-1.5 transition-all ${
                      idx === index ? 'w-6 bg-[#111111]' : 'w-2 bg-neutral-300 hover:bg-neutral-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="relative aspect-[16/10] w-full bg-neutral-100 md:aspect-auto md:h-full md:min-h-[260px]">
          <SmartImage
            src={assetUrl('adverts', active.banner_image)}
            alt={active.title}
            priority
            sizes="(min-width: 768px) 42vw, 100vw"
            fallbackSrc={assetUrl('images', active.banner_image)}
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [videos, setVideos] = useState<AdVideo[]>([]);
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<'Adabraka' | 'Dzorwulu'>('Adabraka');
  const [ratings, setRatings] = useState<{ ratings: Rating[]; average: number; count: number } | null>(null);
  const { settings } = useSettings();
  const { count, total } = useCart();

  useEffect(() => {
    api.get<{ slides: Slide[] }>('/slides').then((d) => setSlides(d.slides)).catch(() => undefined);
    api.get<{ adverts: Advert[] }>('/adverts').then((d) => setAdverts(d.adverts)).catch(() => undefined);
    api.get<{ videos: AdVideo[] }>('/advertisement-videos').then((d) => setVideos(d.videos)).catch(() => undefined);
    api
      .get<{ items: MenuItem[] }>('/menu')
      .then((d) => setMenu(d.items.slice(0, 6)))
      .catch(() => setMenu([]));
    api
      .get<{ ratings: Rating[]; average: number; count: number }>('/public-ratings')
      .then(setRatings)
      .catch(() => undefined);
  }, []);

  const adabrakaPhone = settings?.adabraka_phone || '0244143271';
  const dzorwuluPhone = settings?.dzorwulu_phone || '0533634378';
  const activeBranchPhone = selectedBranch === 'Adabraka' ? adabrakaPhone : dzorwuluPhone;

  return (
    <>
      {/* ================= HERO (UBER EATS + AIRBNB ARCHITECTURE) ================= */}
      <section className="border-b border-neutral-200 bg-white py-10 md:py-16 lg:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:px-8">
          {/* Left Column: Editorial Headline + Branch Fulfillment Selector */}
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-mayford-600">
              <MapPin className="h-3.5 w-3.5" />
              <span>Accra · Adabraka &amp; Dzorwulu</span>
            </div>

            <h1 className="mt-3 text-4xl font-bold leading-[1.06] tracking-[-0.03em] text-[#111111] sm:text-5xl lg:text-[3.35rem]">
              Ghanaian &amp; Continental Kitchen, Prepared Fresh Daily.
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#6B6B6B] sm:text-lg">
              Order signature local dishes and continental favourites for pickup or delivery, book full-service event catering, or train at our culinary academy in Accra.
            </p>

            {/* Uber-style Fulfillment Widget */}
            <div className="mt-8 rounded-lg border border-neutral-200 bg-[#FAF6E8] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                  Select Nearest Kitchen
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#111111]">
                  <Clock className="h-3.5 w-3.5 text-mayford-600" />
                  {settings?.opening_hours || '9:00 AM - 9:30 PM Daily'}
                </span>
              </div>

              <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                {(['Adabraka', 'Dzorwulu'] as const).map((branch) => {
                  const active = selectedBranch === branch;
                  return (
                    <button
                      key={branch}
                      type="button"
                      onClick={() => setSelectedBranch(branch)}
                      className={`flex flex-col items-start rounded-md border p-3 text-left transition-colors ${
                        active
                          ? 'border-[#111111] bg-white text-[#111111] shadow-2xs'
                          : 'border-neutral-200 bg-white/60 text-[#6B6B6B] hover:border-neutral-300 hover:text-[#111111]'
                      }`}
                    >
                      <span className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wider">
                        <span>{branch}</span>
                        {active && <span className="h-2 w-2 bg-mayford-600" />}
                      </span>
                      <span className="mt-1 text-xs text-[#6B6B6B]">
                        {branch === 'Adabraka' ? 'Mayford Locals · Adabraka' : 'Mayford Fast Food · Dzorwulu'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                <Link
                  to="/menu"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-[#111111] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#262626]"
                >
                  <Utensils className="h-4 w-4" />
                  <span>Explore Menu &amp; Order</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={waLink(activeBranchPhone, `Hello Mayford Foods ${selectedBranch}, I would like to place an order.`)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-[#111111] transition-colors hover:border-[#111111]"
                >
                  <MessageCircle className="h-4 w-4 text-whatsapp" />
                  <span>WhatsApp {selectedBranch}</span>
                </a>
              </div>
            </div>

            {/* Key Metrics Strip */}
            <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-neutral-200 pt-6">
              <div>
                <dt className="text-xs font-medium text-[#6B6B6B]">Accra Branches</dt>
                <dd className="mt-1 text-xl font-bold tracking-tight text-[#111111] sm:text-2xl">2 Locations</dd>
              </div>
              <div className="border-l border-neutral-200 pl-4">
                <dt className="text-xs font-medium text-[#6B6B6B]">Practical Academy</dt>
                <dd className="mt-1 text-xl font-bold tracking-tight text-[#111111] sm:text-2xl">70% Hands-On</dd>
              </div>
              <div className="border-l border-neutral-200 pl-4">
                <dt className="text-xs font-medium text-[#6B6B6B]">Guest Rating</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-xl font-bold tracking-tight text-[#111111] sm:text-2xl">
                  <Star className="h-4 w-4 fill-[#111111] text-[#111111]" />
                  <span>{ratings && ratings.count > 0 ? ratings.average.toFixed(1) : '4.9'}</span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Right Column: Hero Photography Frame */}
          <div>
            <HeroGallery slides={slides} />
          </div>
        </div>
      </section>

      {/* ================= THE MAYFORD STANDARD (PILLARS) ================= */}
      <section className="border-b border-[#E7D7A8] bg-[#F7EED6]">
        <div className="mx-auto grid max-w-7xl divide-y divide-[#E7D7A8] px-4 sm:grid-cols-2 sm:divide-y-0 sm:px-6 lg:grid-cols-4 lg:divide-x lg:px-8">
          {[
            {
              icon: Utensils,
              title: 'Cooked Fresh Every Morning',
              text: 'Prepared from scratch daily using local produce and traditional recipes.',
            },
            {
              icon: MapPin,
              title: 'Adabraka & Dzorwulu',
              text: 'Two established Accra kitchens offering dine-in, pickup, and delivery.',
            },
            {
              icon: Award,
              title: 'Full-Service Event Catering',
              text: 'End-to-end food service for weddings, corporate functions, and family events.',
            },
            {
              icon: GraduationCap,
              title: 'Hospitality Training Academy',
              text: 'Practical culinary and restaurant management programmes led by working chefs.',
            },
          ].map((pillar, idx) => (
            <div
              key={pillar.title}
              className={`py-7 ${idx > 0 ? 'lg:pl-7' : ''} ${idx < 3 ? 'lg:pr-7' : ''}`}
            >
              <div className="flex items-start gap-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white border border-[#E7D7A8] text-mayford-700">
                  <pillar.icon className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[#111111]">{pillar.title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-[#6B6B6B]">{pillar.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= ACTIVE PROMOTIONS (IF ANY) ================= */}
      {adverts.length > 0 && (
        <Section tone="white" className="!pb-0 !pt-14">
          <AdvertShowcase adverts={adverts} />
        </Section>
      )}

      {/* ================= FEATURED MENU ================= */}
      <Section id="featured" tone="white">
        <SectionHeader
          eyebrow="Daily Kitchen Menu"
          title="Popular Dishes"
          text="Prepared fresh each morning at our Adabraka and Dzorwulu branches. Add items to your cart or place an instant order."
          action={
            <div className="flex items-center gap-3">
              {count > 0 && (
                <Link
                  to="/cart"
                  className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-[#111111] hover:border-[#111111]"
                >
                  <ShoppingBag className="h-3.5 w-3.5 text-mayford-600" />
                  <span>Cart ({count}) · {ghs(total)}</span>
                </Link>
              )}
              <LinkBtn href="/menu" variant="dark">
                <span>Full Menu</span>
                <ArrowRight className="h-4 w-4" />
              </LinkBtn>
            </div>
          }
        />

        {menu === null ? (
          <FoodCardSkeleton count={3} />
        ) : menu.length > 0 ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {menu.map((item, i) => (
              <Reveal key={item.id} delay={(i % 3) * 60}>
                <FoodCard item={item} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-200 bg-[#FAF6E8] p-12 text-center">
            <p className="text-sm text-[#6B6B6B]">Menu items are being updated. Please check back shortly.</p>
          </div>
        )}
      </Section>

      {/* ================= OUTSIDE CATERING ================= */}
      <Section tone="default" className="border-y border-neutral-200">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Photo Grid */}
          <Reveal className="lg:col-span-7">
            <div className="grid grid-cols-12 gap-3 sm:gap-4">
              <div className="col-span-7 overflow-hidden rounded-lg bg-neutral-200">
                <SmartImage
                  src="/assets/images/outsidecater1.jpeg"
                  alt="Mayford outside catering service"
                  sizes="(min-width: 1024px) 34vw, 100vw"
                  className="h-full max-h-[420px] min-h-[260px] w-full object-cover"
                />
              </div>
              <div className="col-span-5 flex flex-col gap-3 sm:gap-4">
                <div className="flex-1 overflow-hidden rounded-lg bg-neutral-200">
                  <SmartImage
                    src="/assets/images/outsidecater4.jpeg"
                    alt="Event buffet setup"
                    sizes="(min-width: 1024px) 24vw, (min-width: 640px) 50vw, 100vw"
                    className="h-full max-h-[202px] min-h-[124px] w-full object-cover"
                  />
                </div>
                <div className="flex-1 overflow-hidden rounded-lg bg-neutral-200">
                  <SmartImage
                    src="/assets/images/outsidecater7.jpeg"
                    alt="Catering team in action"
                    sizes="(min-width: 1024px) 24vw, (min-width: 640px) 50vw, 100vw"
                    className="h-full max-h-[202px] min-h-[124px] w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </Reveal>

          {/* Copy & Actions */}
          <Reveal delay={100} className="lg:col-span-5">
            <Eyebrow>Event Hospitality</Eyebrow>
            <h2 className="text-3xl font-bold tracking-[-0.02em] text-[#111111] sm:text-4xl">
              Outside Catering for Weddings, Corporate &amp; Private Events
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#6B6B6B]">
              From intimate executive lunches to large wedding receptions and family gatherings, our catering team manages menu planning, preparation, chafing setup, and professional service across Greater Accra.
            </p>

            <ul className="mt-6 space-y-3 border-t border-neutral-200 pt-6 text-sm text-[#111111]">
              {[
                'Tailored Ghanaian and continental buffet menus for any guest count',
                'Uniformed service staff, chafing dishes, and complete buffet setup',
                'Punctual delivery and on-site coordination anywhere in Accra',
              ].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-[#111111] text-white">
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                  <span className="font-medium">{point}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <LinkBtn href="/catering" variant="primary">
                <span>Book Event Catering</span>
                <ArrowRight className="h-4 w-4" />
              </LinkBtn>
              <LinkBtn
                href={waLink(adabrakaPhone, 'Hello Mayford Foods, I would like to inquire about event catering.')}
                external
                variant="outline"
              >
                <Phone className="h-4 w-4" />
                <span>Inquire on WhatsApp</span>
              </LinkBtn>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ================= OUR OUTLETS ================= */}
      <Section tone="white">
        <SectionHeader
          eyebrow="Our Locations"
          title="Visit Our Kitchens in Accra"
          text="Open seven days a week for dine-in, takeaway, and direct delivery orders."
          action={
            <LinkBtn href="/outlets" variant="outline">
              <span>Branch Details</span>
              <ArrowUpRight className="h-4 w-4" />
            </LinkBtn>
          }
        />

        <div className="grid gap-8 md:grid-cols-2">
          {[
            {
              name: 'Mayford Locals, Adabraka',
              area: 'Adabraka Market, Building A, Shop 5, Accra',
              img: 'adabraka.webp',
              phone: adabrakaPhone,
              map: 'https://maps.app.goo.gl/2ppyyaRxGfyJE4CM7',
            },
            {
              name: 'Mayford Fast Food, Dzorwulu',
              area: 'Dzorwulu Market, Shop 12 & 14, Accra',
              img: 'dzorwulu.jpeg',
              phone: dzorwuluPhone,
              map: 'https://maps.app.goo.gl/gmKTiQe96npfgTDN7',
            },
          ].map((branch, i) => (
            <Reveal key={branch.name} delay={i * 80}>
              <div className="group flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white">
                <div className="relative aspect-[16/9] overflow-hidden bg-neutral-100">
                  <SmartImage
                    src={`/assets/images/${branch.img}`}
                    alt={branch.name}
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between p-6 sm:p-7">
                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-xl font-bold tracking-tight text-[#111111]">{branch.name}</h3>
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#111111]">
                        <span className="h-2 w-2 bg-emerald-600" />
                        <span>Open Daily</span>
                      </span>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-[#6B6B6B]">
                      <p className="flex items-center gap-2.5">
                        <MapPin className="h-4 w-4 shrink-0 text-[#111111]" />
                        <span>{branch.area}</span>
                      </p>
                      <p className="flex items-center gap-2.5">
                        <Clock className="h-4 w-4 shrink-0 text-[#111111]" />
                        <span>{settings?.opening_hours || 'Monday - Sunday, 9:00 AM - 9:30 PM'}</span>
                      </p>
                      <p className="flex items-center gap-2.5">
                        <Phone className="h-4 w-4 shrink-0 text-[#111111]" />
                        <span className="font-semibold text-[#111111]">{branch.phone}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-neutral-100 pt-5">
                    <LinkBtn href={branch.map} external variant="dark" className="flex-1">
                      <MapPin className="h-4 w-4" />
                      <span>Directions</span>
                    </LinkBtn>
                    <LinkBtn
                      href={waLink(branch.phone, `Hello ${branch.name}!`)}
                      external
                      variant="outline"
                      className="flex-1"
                    >
                      <MessageCircle className="h-4 w-4 text-whatsapp" />
                      <span>WhatsApp</span>
                    </LinkBtn>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ================= VIDEO SHOWCASE (IF ANY) ================= */}
      {videos.length > 0 && (
        <Section tone="default" className="border-t border-neutral-200">
          <SectionHeader
            eyebrow="Inside Mayford"
            title="Kitchen & Event Highlights"
            text="A closer look at our food preparation, catering service, and daily operations."
          />
          {videos.length === 1 ? (
            <Reveal>
              <div className="mx-auto max-w-4xl overflow-hidden rounded-lg border border-neutral-200 bg-[#111111]">
                <div className="relative aspect-video w-full">
                  <video
                    controls
                    preload="metadata"
                    poster={assetUrl('images', videos[0].poster_url) || '/assets/images/hero.png'}
                    className="absolute inset-0 h-full w-full object-contain"
                  >
                    <source src={assetUrl('videos', videos[0].video_name)} />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </Reveal>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {videos.map((v, i) => (
                <Reveal key={v.id} delay={i * 80}>
                  <div className="overflow-hidden rounded-lg border border-neutral-200 bg-[#111111]">
                    <div className="relative aspect-video w-full">
                      <video
                        controls
                        preload="metadata"
                        poster={assetUrl('images', v.poster_url) || '/assets/images/hero.png'}
                        className="absolute inset-0 h-full w-full object-contain"
                      >
                        <source src={assetUrl('videos', v.video_name)} />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ================= COMMUNITY IMPACT ================= */}
      <section className="bg-[#111111] py-16 text-white md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            light
            eyebrow="Social Responsibility"
            title="Community Impact & Outreach"
            text="We believe a neighbourhood kitchen should strengthen the community it serves through food donations, outreach programmes, and local training."
            action={
              <LinkBtn href="/community" variant="ghost">
                <span>View Outreach</span>
                <ArrowRight className="h-4 w-4" />
              </LinkBtn>
            }
          />

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                img: 'community1.png',
                title: 'Food Donations',
                desc: 'Hot meals shared regularly with families and vulnerable groups in Accra.',
              },
              {
                img: 'community2.png',
                title: 'Outreach Programmes',
                desc: 'Partnering with neighbourhood organizations to support local welfare.',
              },
              {
                img: 'community5.png',
                title: 'Community Support',
                desc: 'Investing in youth skills and hospitality mentorship across Ghana.',
              },
            ].map((item, i) => (
              <Reveal key={item.img} delay={i * 80}>
                <Link to="/community" className="group block">
                  <div className="aspect-[4/3] overflow-hidden rounded-lg bg-neutral-900">
                    <SmartImage
                      src={`/assets/images/${item.img}`}
                      alt={item.title}
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-neutral-300 transition-colors">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-neutral-400">{item.desc}</p>
                    </div>
                    <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-neutral-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CUSTOMER REVIEWS ================= */}
      {ratings && ratings.count > 0 && (
        <Section tone="default" className="border-b border-neutral-200">
          <SectionHeader
            eyebrow="Verified Feedback"
            title={`Rated ${ratings.average.toFixed(1)} out of 5 by Our Guests`}
            text={`Based on ${ratings.count} verified customer review${ratings.count > 1 ? 's' : ''} across food orders, catering, and training.`}
          />

          {ratings.ratings.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {ratings.ratings.map((r, i) => (
                <Reveal key={r.id} delay={i * 70}>
                  <figure className="flex h-full flex-col justify-between rounded-lg border border-neutral-200 bg-white p-6">
                    <div>
                      <Stars n={r.rating} />
                      <blockquote className="mt-4 text-sm leading-relaxed text-[#111111]">
                        &ldquo;{r.comment || `Rated ${r.service_type} ${r.rating} out of 5.`}&rdquo;
                      </blockquote>
                    </div>
                    <figcaption className="mt-5 border-t border-neutral-100 pt-3.5">
                      <p className="text-xs font-bold text-[#111111]">{r.customer_name}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-[#6B6B6B]">{r.service_type}</p>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ================= TRAINING ACADEMY & FOUNDERS ================= */}
      <Section tone="white">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Training Academy Card */}
          <Reveal>
            <div className="flex h-full flex-col justify-between rounded-lg border border-neutral-200 bg-[#F7EED6] p-7 sm:p-10">
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#111111] text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <Eyebrow className="mt-5">Mayford Training Academy</Eyebrow>
                <h2 className="text-2xl font-bold tracking-[-0.02em] text-[#111111] sm:text-3xl">
                  Train With Working Chefs in Real Commercial Kitchens
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#6B6B6B] sm:text-base">
                  Our curriculum is 70% practical and 30% theory, equipping students with culinary arts, restaurant operations, and hospitality leadership skills.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-6">
                <LinkBtn href="/training" variant="dark">
                  <span>Explore Programmes</span>
                  <ArrowRight className="h-4 w-4" />
                </LinkBtn>
                <LinkBtn href="/contact" variant="outline">
                  <span>Admissions Inquiry</span>
                </LinkBtn>
              </div>
            </div>
          </Reveal>

          {/* Founders / Family Heritage Card */}
          <Reveal delay={100}>
            <div className="grid h-full gap-6 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-[0.85fr_1.15fr] sm:p-8">
              <div className="overflow-hidden rounded-md bg-neutral-100">
                <SmartImage
                  src="/assets/images/ownersofmayford.jpeg"
                  alt="Founders of Mayford Foods"
                  sizes="(min-width: 640px) 30vw, 100vw"
                  className="h-64 w-full object-cover object-top sm:h-full"
                />
              </div>
              <div className="flex flex-col justify-between">
                <div>
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-[#FAF6E8] text-[#111111]">
                    <HeartHandshake className="h-5 w-5" />
                  </div>
                  <Eyebrow className="mt-4">Family Owned &amp; Operated</Eyebrow>
                  <h2 className="text-2xl font-bold tracking-[-0.02em] text-[#111111]">
                    Built on Ghanaian Hospitality
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-[#6B6B6B]">
                    From a single kitchen to two bustling Accra branches and a professional training academy, the Mayford family remains hands-on in every plate served.
                  </p>
                </div>
                <div className="mt-6 border-t border-neutral-100 pt-5">
                  <LinkBtn href="/about" variant="outline" className="w-full sm:w-auto">
                    <span>Read Our Story</span>
                    <ArrowRight className="h-4 w-4" />
                  </LinkBtn>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
