import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Check,
  ChevronDown,
  Clock,
  Flame,
  GraduationCap,
  MapPin,
  Phone,
  ShoppingBag,
  Star,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useSettings } from '../components/SiteLayout';
import { useCart } from '../context/CartContext';
import { CountUp, Reveal } from '../components/motion';
import { Card, Eyebrow, LinkBtn, Section, SectionHeader, Stars, ZoomImg } from '../components/ui';
import type { Advert, AdVideo, MenuItem, Rating, Slide } from '../types';
import { effectivePrice, ghs, waLink } from '../utils';

/** Background image slider (original hero-slider, 5s rotation) with Ken Burns zoom */
function HeroSlider({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);
  if (slides.length === 0) return <div className="absolute inset-0 bg-mayford-800" />;
  return (
    <>
      {slides.map((s, i) => (
        <img
          key={s.id}
          src={`/assets/images/${s.image}`}
          alt="Mayford Foods"
          className={`hero-slide absolute inset-0 h-full w-full object-cover ${i === index ? 'kenburns opacity-100' : 'opacity-0'}`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-950/65 to-stone-950/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-transparent to-stone-950/40" />
    </>
  );
}

/** Rotating advertisement cards (original .advert-slide, 7s rotation) */
function AdvertCarousel({ adverts }: { adverts: Advert[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (adverts.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % adverts.length), 7000);
    return () => clearInterval(t);
  }, [adverts.length]);
  if (adverts.length === 0) return null;
  return (
    <div className="relative min-h-[380px]">
      {adverts.map((a, i) => (
        <div
          key={a.id}
          className={`advert-slide absolute inset-0 flex flex-col overflow-hidden rounded-[2rem] bg-white shadow-lift ring-1 ring-white/20 md:flex-row ${
            i === index ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <div className="flex flex-1 flex-col justify-center p-6 text-center md:p-8 md:text-left">
            <span className="mb-3 w-fit rounded-full bg-gradient-to-r from-mayford-600 to-flame-500 px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white">
              Special Offer
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">{a.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">{a.description}</p>
            <div className="mt-5">
              <LinkBtn href={a.button_link || '/menu'}>{a.button_text || 'View Menu'}</LinkBtn>
            </div>
            {adverts.length > 1 && (
              <div className="mt-5 flex gap-1.5">
                {adverts.map((_, d) => (
                  <span
                    key={d}
                    className={`h-1.5 rounded-full transition-all ${d === index ? 'w-6 bg-flame-500' : 'w-1.5 bg-stone-300'}`}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="relative h-44 md:h-auto md:w-1/2">
            <img
              src={`/assets/adverts/${a.banner_image}`}
              alt="Mayford Foods Advertisement"
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `/assets/images/${a.banner_image}`;
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Single "hero" video player: the frame adopts the video's TRUE aspect ratio
 * (portrait videos get a phone-style frame, landscape videos a wide one), so
 * the player always sits neatly in the section instead of stretching awkwardly.
 */
function HeroVideo({ src }: { src: string }) {
  const [ratio, setRatio] = useState<number | null>(null);
  const portrait = ratio !== null && ratio < 1;
  return (
    <div
      className={`relative mx-auto transition-[max-width] duration-500 ${portrait ? 'max-w-[24rem]' : 'max-w-5xl'}`}
    >
      <div
        className="absolute -inset-5 rounded-[3rem] bg-gradient-to-br from-mayford-600/15 via-flame-500/20 to-transparent blur-sm"
        aria-hidden="true"
      />
      <Card className="relative overflow-hidden !rounded-[2.5rem] p-2.5 ring-1 ring-stone-900/10">
        <div
          className="relative overflow-hidden rounded-[1.8rem] bg-stone-950"
          style={ratio ? { aspectRatio: `${ratio}` } : { aspectRatio: '16 / 9' }}
        >
          <video
            controls
            preload="metadata"
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
      </Card>
      <span className="absolute -top-4 left-8 flex items-center gap-2.5 rounded-full bg-white px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-mayford-700 shadow-lift ring-1 ring-stone-900/5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flame-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-flame-500" />
        </span>
        Now Showing
      </span>
    </div>
  );
}

/** Uniform 16:9 grid cell: letterboxes any video so mixed clips line up perfectly. */
function VideoFrame({ src }: { src: string }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-[1.4rem] bg-stone-950">
      <video controls preload="metadata" className="absolute inset-0 h-full w-full object-contain">
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

export default function HomePage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [videos, setVideos] = useState<AdVideo[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [justAdded, setJustAdded] = useState<number | null>(null);
  const [ratings, setRatings] = useState<{ ratings: Rating[]; average: number; count: number } | null>(null);
  const { settings } = useSettings();
  const { addItem } = useCart();

  useEffect(() => {
    api.get<{ slides: Slide[] }>('/slides').then((d) => setSlides(d.slides)).catch(() => undefined);
    api.get<{ adverts: Advert[] }>('/adverts').then((d) => setAdverts(d.adverts)).catch(() => undefined);
    api.get<{ videos: AdVideo[] }>('/advertisement-videos').then((d) => setVideos(d.videos)).catch(() => undefined);
    api
      .get<{ items: MenuItem[] }>('/menu')
      .then((d) => setMenu(d.items.slice(0, 6)))
      .catch(() => undefined);
    api
      .get<{ ratings: Rating[]; average: number; count: number }>('/public-ratings')
      .then(setRatings)
      .catch(() => undefined);
  }, []);

  function quickAdd(item: MenuItem) {
    addItem(item);
    setJustAdded(item.id);
    window.setTimeout(() => setJustAdded((v) => (v === item.id ? null : v)), 1400);
  }

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="noise relative flex min-h-[680px] items-center overflow-hidden md:min-h-[94vh]">
        <HeroSlider slides={slides} />
        <div className="absolute inset-0 bg-dots-dark opacity-20" />

        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-24 pt-20 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:pb-0">
          {/* Left: statement */}
          <div>
            <Reveal>
              <p className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.3em] text-flame-300 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-flame-400" />
                Proudly Accra Born &amp; Raised
              </p>
              <h1 className="text-[2.75rem] font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-[4.5rem]">
                Taste Of Ghana,
                <br />
                Served With <span className="text-gradient">Heart</span>
              </h1>
              <div className="kente-stripe mt-6 h-1.5 w-28 rounded-full" />
              <p className="mt-6 max-w-lg text-base leading-relaxed text-stone-300 md:text-lg">
                Fresh Ghanaian &amp; continental meals, outside catering, community outreach and professional
                training, all under one roof in the heart of Accra.
              </p>
            </Reveal>
            <Reveal delay={150}>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <LinkBtn href="/menu" className="!px-8 !py-4 !text-base">
                  <ShoppingBag className="h-5 w-5" />
                  Browse Our Menu
                </LinkBtn>
                <LinkBtn href="/outlets" variant="ghost" className="!px-8 !py-4 !text-base">
                  <MapPin className="h-5 w-5" />
                  Visit Our Outlets
                </LinkBtn>
              </div>
            </Reveal>
            <Reveal delay={300}>
              <dl className="glass mt-11 grid max-w-md grid-cols-3 divide-x divide-white/15 rounded-2xl p-6">
                {[
                  { value: 2, suffix: '', label: 'Accra Outlets' },
                  { value: 7, suffix: ' days', label: 'Open Every Week' },
                  { value: 100, suffix: '+', label: 'Happy Customers / Mo' },
                ].map((s) => (
                  <div key={s.label} className="px-4 first:pl-0 last:pr-0">
                    <dt className="sr-only">{s.label}</dt>
                    <dd className="text-2xl font-extrabold text-white md:text-3xl">
                      <CountUp value={s.value} suffix={s.suffix} />
                    </dd>
                    <dd className="mt-1 text-[10px] font-bold uppercase tracking-widest text-stone-400">{s.label}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          {/* Right: live offers with floating proof chips */}
          <Reveal delay={200} className="relative hidden md:block">
            <div className="absolute -inset-6 rounded-[3rem] bg-flame-500/10 blur-2xl" aria-hidden="true" />
            {adverts.length > 0 && <AdvertCarousel adverts={adverts} />}
            <div className="animate-float glass absolute -left-8 -top-8 z-20 flex items-center gap-3 rounded-2xl px-5 py-3.5">
              <Star className="h-5 w-5 fill-flame-400 text-flame-400" />
              <div className="leading-tight">
                <p className="text-sm font-extrabold text-white">Loved By Locals</p>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">Adabraka &amp; Dzorwulu</p>
              </div>
            </div>
            <div className="animate-float-late glass absolute -bottom-6 -right-6 z-20 flex items-center gap-3 rounded-2xl px-5 py-3.5">
              <Clock className="h-5 w-5 text-flame-400" />
              <div className="leading-tight">
                <p className="text-sm font-extrabold text-white">Open Today</p>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                  {settings?.opening_hours || '9:00 AM to 9:30 PM'}
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Mobile ad carousel */}
        <div className="relative z-10 px-4 pb-16 md:hidden">
          {adverts.length > 0 && <AdvertCarousel adverts={adverts} />}
        </div>

        {/* Scroll cue */}
        <a
          href="#featured"
          aria-label="Scroll to menu"
          className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.25em] text-stone-300 backdrop-blur transition hover:bg-white/15 md:flex"
        >
          Scroll
          <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
        </a>
      </section>

      {/* ================= WHY MAYFORD ================= */}
      <Section tone="white" className="!py-10 md:!py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Flame, title: 'Cooked Fresh, Daily', text: 'Every dish prepared from scratch each morning.' },
            { icon: Users, title: 'Family Owned', text: 'Run with pride and consistency since day one.' },
            { icon: Award, title: 'Trusted In Accra', text: 'Two neighbourhoods, one standard of quality.' },
            { icon: GraduationCap, title: 'Training Academy', text: '70% hands-on hospitality education.' },
          ].map((v, i) => (
            <Reveal key={v.title} delay={i * 70}>
              <div className="group flex h-full items-start gap-4 rounded-2xl bg-stone-50 p-5 ring-1 ring-stone-900/5 transition duration-300 hover:-translate-y-1 hover:bg-mayford-50 hover:shadow-soft hover:ring-mayford-200">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-mayford-600 to-mayford-800 text-white shadow-glow transition duration-300 group-hover:scale-110">
                  <v.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight text-stone-900">{v.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-stone-500">{v.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ================= FEATURED MEALS (live menu) ================= */}
      <Section id="featured" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-60" aria-hidden="true" />
        <div className="relative">
          <SectionHeader
            index="01"
            eyebrow="Fresh Daily"
            title={
              <>
                Featured <span className="text-flame-600">Meals</span>
              </>
            }
            text="Signature plates prepared from scratch every morning, served hot at both outlets."
          />
          {menu.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {menu.map((m, i) => (
                <Reveal key={m.id} delay={(i % 3) * 90}>
                  <Card className="group flex h-full flex-col">
                    <div className="relative overflow-hidden">
                      <ZoomImg src={`/assets/images/${m.image}`} alt={m.food_name} className="h-52" />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/50 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
                      <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-mayford-700 backdrop-blur">
                        {m.category}
                      </span>
                      {m.discount_percent > 0 && (
                        <span className="absolute right-4 top-4 rounded-full bg-flame-500 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-glow">
                          {m.discount_percent}% Off
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-extrabold tracking-tight text-stone-900">{m.food_name}</h3>
                        <div className="text-right">
                          <p className="text-lg font-extrabold text-mayford-700">{ghs(effectivePrice(m))}</p>
                          {m.discount_percent > 0 && (
                            <p className="text-xs text-stone-400 line-through">{ghs(m.price)}</p>
                          )}
                        </div>
                      </div>
                      <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-stone-600">{m.description}</p>
                      <button
                        type="button"
                        onClick={() => quickAdd(m)}
                        className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold transition duration-300 ${
                          justAdded === m.id
                            ? 'bg-green-600 text-white'
                            : 'bg-stone-900 text-white hover:gap-3 hover:bg-mayford-600'
                        }`}
                      >
                        {justAdded === m.id ? (
                          <>
                            <Check className="h-4 w-4" /> Added To Cart
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="h-4 w-4" /> Add To Cart
                          </>
                        )}
                      </button>
                    </div>
                  </Card>
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="text-center text-stone-500">Menu is being updated, please check back soon.</p>
          )}
          <Reveal className="mt-10 text-center">
            <LinkBtn href="/menu" variant="dark" className="!px-8 !py-3.5">
              View Full Menu <ArrowRight className="h-4 w-4" />
            </LinkBtn>
          </Reveal>
        </div>
      </Section>

      {/* ================= LATEST ADVERTISEMENTS (videos) ================= */}
      {videos.length > 0 && (
        <Section tone="white" className="relative overflow-hidden">
          <div className="absolute inset-0 bg-dots opacity-60" aria-hidden="true" />
          <div className="relative">
            <SectionHeader
              index="02"
              eyebrow="Now Showing"
              title={
                <>
                  Latest <span className="text-flame-600">Advertisements</span>
                </>
              }
              text="See our food, our events and our people in action."
            />
            {videos.length === 1 ? (
              <Reveal>
                <HeroVideo src={`/assets/videos/${videos[0].video_name}`} />
              </Reveal>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {videos.map((v, i) => (
                  <Reveal key={v.id} delay={i * 100}>
                    <Card className="h-full overflow-hidden !rounded-[2rem] p-2.5 ring-1 ring-stone-900/10">
                      <VideoFrame src={`/assets/videos/${v.video_name}`} />
                    </Card>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ================= OUTSIDE CATERING ================= */}
      <Section className="relative overflow-hidden">
        <span
          className="outline-text pointer-events-none absolute -right-4 top-8 hidden select-none text-[6.5rem] font-extrabold leading-none lg:block"
          aria-hidden="true"
        >
          CATERING
        </span>
        <div className="relative grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <img src="/assets/images/outsidecater1.jpeg" alt="Catering" className="h-56 w-full rounded-3xl object-cover shadow-soft md:h-72" />
                <img src="/assets/images/outsidecater4.jpeg" alt="Catering" className="mt-8 h-56 w-full rounded-3xl object-cover shadow-soft md:h-72" />
                <img src="/assets/images/outsidecater7.jpeg" alt="Catering" className="-mt-8 h-56 w-full rounded-3xl object-cover shadow-soft md:h-72" />
              </div>
              <div className="glass absolute -bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-extrabold uppercase tracking-widest text-white shadow-lift">
                <Flame className="h-4 w-4 text-flame-400" />
                Weddings, Corporate, Funerals
              </div>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <Eyebrow>Events That Matter</Eyebrow>
            <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 md:text-[2.75rem] md:leading-[1.1]">
              Outside Catering <span className="text-flame-600">Services</span>
            </h2>
            <p className="mt-4 leading-relaxed text-stone-600">
              Weddings, funerals, birthdays and corporate events: Mayford Foods handles the food end to end, from
              menu planning and preparation to serving and cleanup, so you can enjoy every moment.
            </p>
            <ul className="mt-7 space-y-4 text-sm font-semibold text-stone-700">
              {['Custom menus for any guest count', 'Professional wait & setup team', 'Delivery anywhere in Accra'].map(
                (li) => (
                  <li key={li} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-flame-500 text-white">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    {li}
                  </li>
                )
              )}
            </ul>
            <div className="mt-9">
              <LinkBtn href="/catering">
                Explore Catering <ArrowRight className="h-4 w-4" />
              </LinkBtn>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ================= COMMUNITY IMPACT (dark chapter) ================= */}
      <section className="noise relative overflow-hidden bg-stone-950 py-16 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(178,34,34,0.4),transparent_60%)]" />
        <div className="absolute inset-0 bg-dots-dark opacity-30" />
        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
          <SectionHeader
            light
            index="03"
            eyebrow="Giving Back"
            title={
              <>
                Community <span className="text-flame-400">Impact</span>
              </>
            }
            text="Mayford Foods believes in giving back to society through food donations, outreach programs and community support."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { img: 'community1.png', title: 'Food Donations' },
              { img: 'community2.png', title: 'Outreach Programs' },
              { img: 'community5.png', title: 'Community Support' },
            ].map((c, i) => (
              <Reveal key={c.img} delay={i * 100} className={i === 1 ? 'md:mt-10' : ''}>
                <Link
                  to="/community"
                  className="group relative block overflow-hidden rounded-3xl ring-1 ring-white/10 transition duration-300 hover:-translate-y-1.5 hover:shadow-lift hover:ring-flame-500/50"
                >
                  <img
                    src={`/assets/images/${c.img}`}
                    alt={c.title}
                    className={`${i === 1 ? 'h-80' : 'h-64'} w-full object-cover transition-transform duration-700 group-hover:scale-105`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-flame-400">Mayford Cares</p>
                      <p className="mt-1 text-sm font-extrabold uppercase tracking-widest text-white">{c.title}</p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 -translate-x-2 items-center justify-center rounded-full bg-white/10 text-white opacity-0 backdrop-blur transition duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10 text-center">
            <LinkBtn href="/community" variant="ghost" className="!border-white/30">
              View Community Activities <ArrowRight className="h-4 w-4" />
            </LinkBtn>
          </Reveal>
        </div>
      </section>

      {/* ================= OUR OUTLETS ================= */}
      <Section tone="white">
        <SectionHeader
          index="04"
          eyebrow="Find Us"
          title={
            <>
              Our <span className="text-flame-600">Outlets</span>
            </>
          }
          text="Two locations across Accra, open every day."
        />
        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              name: 'Mayford Locals, Adabraka',
              img: 'adabraka.webp',
              phone: settings?.adabraka_phone || '0244143271',
              map: 'https://maps.app.goo.gl/2ppyyaRxGfyJE4CM7',
            },
            {
              name: 'Mayford Fast Food, Dzorwulu',
              img: 'dzorwulu.jpeg',
              phone: settings?.dzorwulu_phone || '0533634378',
              map: 'https://maps.app.goo.gl/gmKTiQe96npfgTDN7',
            },
          ].map((o, i) => (
            <Reveal key={o.name} delay={i * 120}>
              <Card className="overflow-hidden">
                <ZoomImg src={`/assets/images/${o.img}`} alt={o.name} className="h-56" />
                <div className="p-7">
                  <h3 className="text-lg font-extrabold tracking-tight text-stone-900">{o.name}</h3>
                  <div className="mt-4 space-y-2.5 text-sm text-stone-600">
                    <p className="flex items-center gap-3">
                      <Clock className="h-4 w-4 shrink-0 text-flame-600" />
                      {settings?.opening_hours || 'Monday - Sunday 9:00 AM - 9:30 PM'}
                    </p>
                    <p className="flex items-center gap-3">
                      <Phone className="h-4 w-4 shrink-0 text-flame-600" />
                      {o.phone}
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <LinkBtn href={o.map} external className="!px-5 !py-2.5 !text-xs">
                      <MapPin className="h-3.5 w-3.5" /> Get Directions
                    </LinkBtn>
                    <LinkBtn
                      href={waLink(o.phone, 'Hello Mayford Foods!')}
                      external
                      variant="dark"
                      className="!px-5 !py-2.5 !text-xs"
                    >
                      <Phone className="h-3.5 w-3.5" /> WhatsApp
                    </LinkBtn>
                  </div>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ================= CUSTOMER RATING (social proof) ================= */}
      {ratings && ratings.count > 0 && (
        <section className="noise relative overflow-hidden bg-mayford-800 py-16 md:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,152,0,0.3),transparent_55%)]" />
          <span className="pointer-events-none absolute -top-10 right-6 select-none text-[11rem] font-extrabold leading-none text-white/5" aria-hidden="true">
            &rdquo;
          </span>
          <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto mb-12 max-w-2xl text-center">
              <Eyebrow light>Social Proof</Eyebrow>
              <div className="flex items-center justify-center gap-4">
                <span className="text-6xl font-extrabold text-white">{ratings.average.toFixed(1)}</span>
                <div className="text-left">
                  <Stars n={ratings.average} className="text-xl text-flame-400" />
                  <p className="mt-1 text-xs font-bold uppercase tracking-widest text-flame-200">
                    from {ratings.count} customer{ratings.count > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                Loved By Our Customers
              </h2>
            </Reveal>
            {ratings.ratings.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {ratings.ratings.map((r, i) => (
                  <Reveal key={r.id} delay={i * 100}>
                    <figure className="h-full rounded-3xl bg-white/10 p-6 ring-1 ring-white/15 backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white/15">
                      <Stars n={r.rating} className="text-flame-400" />
                      <blockquote className="mt-3 text-sm leading-relaxed text-stone-200">
                        &ldquo;{r.comment || `Rated ${r.service_type} ${r.rating}/5`}&rdquo;
                      </blockquote>
                      <figcaption className="mt-4 text-xs font-bold uppercase tracking-widest text-flame-300">
                        {r.customer_name} · {r.service_type}
                      </figcaption>
                    </figure>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================= TRAINING CTA ================= */}
      <Section>
        <Reveal>
          <div className="noise relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-stone-950 via-mayford-900 to-mayford-700 px-6 py-16 text-center shadow-lift md:px-16">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,152,0,0.35),transparent_60%)]" />
            <span
              className="outline-text-light pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 select-none whitespace-nowrap text-[7rem] font-extrabold leading-none"
              aria-hidden="true"
            >
              ACADEMY
            </span>
            <div className="relative">
              <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-flame-500 text-white shadow-glow">
                <GraduationCap className="h-8 w-8" />
              </span>
              <Eyebrow light>Mayford Training Academy</Eyebrow>
              <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                Train With Chefs Who Do It Every Day
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-stone-300">
                Practical food preparation and catering training, 70% hands-on in real kitchens, restaurants and
                hospitality environments.
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-4">
                <LinkBtn href="/training" className="!px-8 !py-4 !text-base">
                  Explore Programmes <ArrowRight className="h-4 w-4" />
                </LinkBtn>
                <LinkBtn href="/contact" variant="ghost" className="!px-8 !py-4 !text-base">
                  Ask A Question
                </LinkBtn>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* ================= OWNERS ================= */}
      <Section tone="white" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-60" aria-hidden="true" />
        <div className="relative grid items-center gap-12 md:grid-cols-2">
          <Reveal>
            <div className="relative">
              <div className="absolute -inset-4 rounded-[3rem] border-2 border-mayford-600/25" aria-hidden="true" />
              <img
                src="/assets/images/ownersofmayford.jpeg"
                alt="Owners"
                className="relative h-full max-h-[28rem] w-full rounded-[2.5rem] object-cover object-top shadow-lift"
              />
              <div className="glass absolute -bottom-5 right-8 rounded-2xl px-5 py-3">
                <p className="text-sm font-extrabold text-mayford-700">The Mayford Family</p>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">
                  Founders &amp; Team
                </p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <Eyebrow>Meet The Owners</Eyebrow>
            <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 md:text-[2.75rem] md:leading-[1.1]">
              A Family Business Built On <span className="text-flame-600">Ghanaian Hospitality</span>
            </h2>
            <p className="mt-4 leading-relaxed text-stone-600">
              Dedicated to serving quality meals and supporting communities through food and training initiatives,
              the Mayford family has grown from one kitchen to two thriving Accra outlets, plus a training academy
              shaping the next generation of hospitality professionals.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <LinkBtn href="/about" variant="dark">
                Read Our Story <ArrowRight className="h-4 w-4" />
              </LinkBtn>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
