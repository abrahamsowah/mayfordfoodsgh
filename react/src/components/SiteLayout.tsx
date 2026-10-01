import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  Heart,
  Home,
  Info,
  Lock,
  Mail,
  MapPin,
  Menu as MenuIcon,
  MessageCircle,
  MoreHorizontal,
  Music,
  Navigation,
  Phone,
  QrCode,
  Send,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Truck,
  User,
  UtensilsCrossed,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import type { Banner, Settings } from '../types';
import { formatNum, ghs, waLink } from '../utils';
import {
  Alert,
  Badge,
  Button,
  Card,
  FacebookIcon,
  Field,
  IconTile,
  Input,
  LinkBtn,
  Select,
  Sheet,
  Textarea,
} from './ui';

/* ------------------------------------------------------------------
   Navigation model — one source of truth for header, tab bar, footer
------------------------------------------------------------------ */
const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/outlets', label: 'Outlets' },
  { to: '/menu-access', label: 'Menu' },
  { to: '/catering', label: 'Catering' },
  { to: '/community', label: 'Community' },
  { to: '/training', label: 'Training' },
  { to: '/about', label: 'About Us' },
];

const MORE_LINKS: { to: string; label: string; hint: string; icon: LucideIcon }[] = [
  { to: '/catering', label: 'Outside Catering', hint: 'Weddings, corporate, funerals', icon: Sparkles },
  { to: '/training', label: 'Training Academy', hint: 'Culinary & hospitality courses', icon: Building2 },
  { to: '/community', label: 'Community Impact', hint: 'Outreach & food donations', icon: Heart },
  { to: '/menu-access', label: 'Scan Menu QR', hint: 'Share the digital menu', icon: QrCode },
  { to: '/outlets', label: 'Our Outlets', hint: 'Adabraka & Dzorwulu', icon: Store },
  { to: '/about', label: 'About Mayford', hint: 'Our story and owners', icon: Info },
  { to: '/contact', label: 'Contact Us', hint: 'Phone, email, Bolt Food', icon: Phone },
  { to: '/track', label: 'Track an Order', hint: 'Live status of your delivery', icon: Truck },
  { to: '/account', label: 'My Account', hint: 'Orders, addresses, loyalty', icon: User },
];

export function useSettings(): { settings: Settings | null; loading: boolean } {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get<{ settings: Settings | null }>('/settings')
      .then((d) => setSettings(d.settings))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);
  return { settings, loading };
}

function Wordmark({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <img
        src="/assets/images/logo.png"
        alt=""
        className={`rounded-full object-cover ring-1 ring-ink-900/5 ${compact ? 'h-9 w-9' : 'h-10 w-10'}`}
      />
      <span className="hidden leading-none min-[380px]:block">
        <span className={`block text-[15px] font-extrabold tracking-[-0.02em] ${light ? 'text-white' : 'text-ink-900'}`}>
          Mayford Foods
        </span>
        <span className={`mt-1 block text-[9.5px] font-extrabold uppercase tracking-[0.28em] ${light ? 'text-flame-400' : 'text-mayford-600'}`}>
          Ghana
        </span>
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------
   Delivery-strip marquee (DB banners)
------------------------------------------------------------------ */
function Marquee() {
  const [banners, setBanners] = useState<Banner[]>([]);
  useEffect(() => {
    api
      .get<{ banners: Banner[] }>('/banners')
      .then((d) => setBanners(d.banners))
      .catch(() => undefined);
  }, []);
  if (banners.length === 0) return null;
  const items = banners.map((b) => b.banner_text.trim()).filter(Boolean);
  const strip = (key: string, hidden = false) => (
    <span key={key} className="inline-flex items-center" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <span key={`${key}-${i}`} className="inline-flex items-center">
          <span className="px-4 text-[12px] font-semibold tracking-wide text-white/90 md:text-[12.5px]">{t}</span>
          <span className="h-1 w-1 shrink-0 rounded-full bg-flame-500" />
        </span>
      ))}
    </span>
  );
  return (
    <div className="relative overflow-hidden border-b border-white/5 bg-ink-950 py-2">
      <div className="animate-marquee">
        {strip('a')}
        {strip('b', true)}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Header
------------------------------------------------------------------ */
function AccountButton() {
  const { customer } = useCustomer();
  return (
    <Link
      to={customer ? '/account' : '/account/login'}
      aria-label={customer ? 'My account' : 'Sign in'}
      title={customer ? `${customer.full_name} — my account` : 'Sign in to your account'}
      className="relative hidden h-11 w-11 items-center justify-center rounded-pill border border-ink-200 text-ink-600 transition hover:border-ink-300 hover:bg-ink-50 hover:text-ink-900 md:flex"
    >
      <User className="h-[19px] w-[19px]" strokeWidth={2.2} />
      {customer && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-success-500" />}
    </Link>
  );
}

function CartButton({ className = '' }: { className?: string }) {
  const { count, total } = useCart();
  if (count === 0) {
    return (
      <LinkBtn href="/menu" variant="outline" size="md" icon={ShoppingBag} className={className}>
        Cart
      </LinkBtn>
    );
  }
  return (
    <LinkBtn href="/menu" variant="dark" size="md" className={`!px-2 ${className}`}>
      <span className="flex items-center gap-2 py-1 pl-1">
        <span className="flex items-center gap-2">
          <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2.2} />
          <span className="tabular-nums">{ghs(total)}</span>
        </span>
        <span className="mx-1 h-5 w-px bg-white/20" />
        <span className="flex h-6 min-w-6 items-center justify-center rounded-pill bg-flame-500 px-1.5 text-[12px] font-extrabold tabular-nums text-white">
          {count}
        </span>
      </span>
    </LinkBtn>
  );
}

function Header({ settings }: { settings: Settings | null }) {
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();
  const { count } = useCart();
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-ink-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8 md:h-[72px]">
          {/* Mobile menu */}
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-tile text-ink-700 transition hover:bg-ink-100 md:hidden"
          >
            <MenuIcon className="h-[22px] w-[22px]" strokeWidth={2.2} />
          </button>

          <Link to="/" className="shrink-0" aria-label="Mayford Foods home">
            <Wordmark compact />
          </Link>

          {/* Outlet / delivery context pill (like the address chip in delivery apps) */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="ml-1 hidden shrink-0 items-center gap-2.5 whitespace-nowrap rounded-pill border border-ink-200 bg-white py-1.5 pl-2 pr-3.5 text-left transition hover:border-ink-300 hover:bg-ink-50 2xl:flex"
          >
            <IconTile icon={Store} tone="light" size="sm" strokeWidth={2.3} />
            <span className="leading-tight">
              <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Pick up from</span>
              <span className="block text-[12.5px] font-extrabold text-ink-900">Adabraka · Dzorwulu</span>
            </span>
            <ChevronRight className="h-4 w-4 text-ink-400" strokeWidth={2.4} />
          </button>

          {/* Desktop nav */}
          <nav className="ml-2 hidden flex-1 items-center gap-0.5 md:flex">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-pill px-2.5 py-2 text-[13px] font-bold transition xl:px-3.5 xl:text-[13.5px] ${
                    isActive ? 'bg-mayford-50 text-mayford-700' : 'text-ink-500 hover:bg-ink-100 hover:text-ink-900'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <a
              href={waLink(settings?.adabraka_phone || '0244143271', 'Hello Mayford Foods!')}
              target="_blank"
              rel="noreferrer"
              aria-label="Chat on WhatsApp"
              className="hidden h-11 w-11 items-center justify-center rounded-pill border border-ink-200 text-ink-600 transition hover:border-whatsapp/40 hover:bg-whatsapp/10 hover:text-whatsapp-dark sm:flex"
            >
              <MessageCircle className="h-[19px] w-[19px]" strokeWidth={2.2} />
            </a>
            <AccountButton />
            {/* Wrappers (not `hidden` on the button itself) so the responsive
                display utility always wins over the button's own inline-flex. */}
            <div className="hidden md:block">
              <CartButton />
            </div>
            <div className="hidden xl:block">
              <LinkBtn href="/menu" variant="primary" size="md" icon={UtensilsCrossed}>
                Order
              </LinkBtn>
            </div>
            {/* Mobile cart shortcut */}
            <Link
              to="/menu"
              aria-label="Cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-tile text-ink-800 transition hover:bg-ink-100 md:hidden"
            >
              <ShoppingBag className="h-[22px] w-[22px]" strokeWidth={2.2} />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-pill bg-mayford-600 px-1 text-[11px] font-extrabold text-white shadow-brand">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile navigation drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" />
          <div
            className="animate-pop absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col overflow-y-auto rounded-r-[1.75rem] bg-white p-5 shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <Wordmark />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-ink-500 transition hover:bg-ink-200"
              >
                <X className="h-5 w-5" strokeWidth={2.4} />
              </button>
            </div>

            <div className="space-y-2">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`flex items-center justify-between rounded-tile px-4 py-3.5 text-[15px] font-bold transition ${
                    location.pathname === l.to ? 'bg-mayford-50 text-mayford-700' : 'text-ink-700 hover:bg-ink-100'
                  }`}
                >
                  {l.label}
                  <ChevronRight className="h-4 w-4 text-ink-300" strokeWidth={2.4} />
                </Link>
              ))}
            </div>

            <div className="mt-6 rounded-card bg-ink-950 p-5 text-white">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-flame-400">Order in seconds</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                Build your cart and confirm on WhatsApp with the branch of your choice.
              </p>
              <LinkBtn href="/menu" variant="accent" size="md" iconRight={ArrowRight} full className="mt-4">
                Browse the menu
              </LinkBtn>
            </div>

            <div className="mt-6 space-y-1 border-t border-ink-100 pt-4 text-sm">
              <a
                href={waLink(settings?.adabraka_phone || '0244143271')}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-tile px-3 py-3 font-semibold text-ink-600 transition hover:bg-ink-100"
              >
                <MessageCircle className="h-4 w-4 text-whatsapp-dark" strokeWidth={2.2} /> Adabraka ·{' '}
                {settings?.adabraka_phone || '0244143271'}
              </a>
              <a
                href={waLink(settings?.dzorwulu_phone || '0533634378')}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-tile px-3 py-3 font-semibold text-ink-600 transition hover:bg-ink-100"
              >
                <MessageCircle className="h-4 w-4 text-whatsapp-dark" strokeWidth={2.2} /> Dzorwulu ·{' '}
                {settings?.dzorwulu_phone || '0533634378'}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Outlet sheet */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Choose a branch"
        subtitle="Both kitchens are open every day, 9:00 AM – 9:30 PM."
      >
        <div className="space-y-3">
          {[
            {
              name: 'Mayford Locals',
              area: 'Adabraka',
              address: 'Adabraka Market, Building A, Shop 5, Accra',
              phone: settings?.adabraka_phone || '0244143271',
              map: 'https://www.google.com/maps/search/?api=1&query=Adabraka+Market+Building+A+Shop+5+Accra+Ghana',
            },
            {
              name: 'Mayford Fast Food',
              area: 'Dzorwulu',
              address: 'Dzorwulu Market, Shop 12 & 14, Accra',
              phone: settings?.dzorwulu_phone || '0533634378',
              map: 'https://www.google.com/maps/search/?api=1&query=Dzorwulu+Market+Shop+12+14+Accra+Ghana',
            },
          ].map((o) => (
            <Card key={o.area} className="p-4">
              <div className="flex items-start gap-3.5">
                <IconTile icon={MapPin} tone="light" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-extrabold tracking-tight text-ink-900">{o.name}</h3>
                    <Badge tone="brand" size="sm">
                      {o.area}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">{o.address}</p>
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    <LinkBtn
                      href={waLink(o.phone, `Hello Mayford Foods ${o.area}!`)}
                      external
                      variant="whatsapp"
                      size="sm"
                      icon={MessageCircle}
                    >
                      WhatsApp
                    </LinkBtn>
                    <LinkBtn href={`tel:${o.phone}`} variant="outline" size="sm" icon={Phone}>
                      {o.phone}
                    </LinkBtn>
                    <LinkBtn href={o.map} external variant="ghost" size="sm" icon={Navigation}>
                      Directions
                    </LinkBtn>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-tile bg-warning-50 px-4 py-3 text-[13px] font-semibold text-warning-700">
          <Bike className="h-4 w-4 shrink-0" strokeWidth={2.3} />
          Also available on Bolt Food for delivery across Accra.
        </div>
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------------------
   Mobile tab bar (app-style bottom navigation)
------------------------------------------------------------------ */
function MobileTabBar() {
  const { count } = useCart();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (to: string) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));

  const item = (to: string, label: string, Icon: LucideIcon) => (
    <NavLink
      key={to}
      to={to}
      className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10.5px] font-bold transition ${
        isActive(to) ? 'text-mayford-700' : 'text-ink-400'
      }`}
    >
      <Icon className="h-[21px] w-[21px]" strokeWidth={isActive(to) ? 2.5 : 2.1} />
      {label}
    </NavLink>
  );

  return (
    <>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-ink-200 bg-white/95 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-md items-stretch px-2">
          {item('/', 'Home', Home)}
          {item('/menu', 'Menu', UtensilsCrossed)}
          {item('/cart', 'Cart', ShoppingBag)}
          {item('/track', 'Track', Truck)}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10.5px] font-bold text-ink-400"
          >
            <MoreHorizontal className="h-[21px] w-[21px]" strokeWidth={2.1} />
            More
          </button>
        </div>
        {count > 0 && (
          <span className="pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom,0px)+2.6rem)] left-1/2 -translate-x-1/2 rounded-pill bg-ink-900 px-3 py-1 text-[11px] font-extrabold text-white shadow-raised">
            {count} item{count > 1 ? 's' : ''} in cart
          </span>
        )}
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Explore Mayford" subtitle="Everything else we do">
        <div className="divide-y divide-ink-100 overflow-hidden rounded-card border border-ink-200">
          {MORE_LINKS.map((l) => (
            <Link
              key={l.to + l.label}
              to={l.to}
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3.5 bg-white px-4 py-3.5 transition active:bg-ink-50"
            >
              <IconTile icon={l.icon} tone="light" size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-ink-900">{l.label}</span>
                <span className="block text-[12px] text-ink-400">{l.hint}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-ink-300" strokeWidth={2.4} />
            </Link>
          ))}
        </div>
        <Link
          to="/outlets"
          onClick={() => setMoreOpen(false)}
          className="mt-4 flex w-full items-center gap-3.5 rounded-card border border-ink-200 bg-white px-4 py-4 text-left transition active:bg-ink-50"
        >
          <IconTile icon={Store} tone="brand" size="sm" />
          <span className="flex-1">
            <span className="block text-[14px] font-bold text-ink-900">Branch details</span>
            <span className="block text-[12px] text-ink-400">Adabraka &amp; Dzorwulu</span>
          </span>
          <ChevronRight className="h-4 w-4 text-ink-300" strokeWidth={2.4} />
        </Link>
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------------------
   Footer
------------------------------------------------------------------ */
function Footer({ settings }: { settings: Settings | null }) {
  const [visitors, setVisitors] = useState<number | null>(null);
  const [params] = useSearchParams();
  const ratingSuccess = params.get('rating') === 'success';
  const adabraka = settings?.adabraka_phone || '0244143271';
  const dzorwulu = settings?.dzorwulu_phone || '0533634378';

  useEffect(() => {
    api
      .get<{ total_visitors: number }>('/visitor-count')
      .then((d) => setVisitors(d.total_visitors))
      .catch(() => undefined);
  }, []);

  const social =
    'flex h-10 w-10 items-center justify-center rounded-pill border border-white/10 text-ink-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white';

  return (
    <>
      {ratingSuccess && (
        <div className="mx-auto w-full max-w-3xl px-4 pt-6">
          <div className="flex items-center justify-center gap-3 rounded-card bg-success-600 px-4 py-4 text-sm font-bold text-white shadow-raised">
            <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2.4} />
            Thank you for your rating! Your review has been submitted successfully.
          </div>
        </div>
      )}
      <footer className="relative overflow-hidden bg-ink-950 text-ink-300">
        <div className="kente-stripe h-1 w-full opacity-90" />
        <div className="mx-auto w-full max-w-7xl px-4 pb-8 pt-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
            {/* Brand */}
            <div>
              <Wordmark light />
              <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-ink-400">
                Fresh Ghanaian &amp; continental cooking, outside catering, community outreach and hospitality
                training — from two kitchens in the heart of Accra.
              </p>
              <div className="mt-6 flex gap-2.5">
                <a
                  href={settings?.facebook_link || 'https://www.facebook.com/'}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className={social}
                >
                  <FacebookIcon className="h-[18px] w-[18px]" />
                </a>
                <a
                  href={settings?.tiktok_link || 'https://www.tiktok.com/'}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="TikTok"
                  className={social}
                >
                  <Music className="h-[18px] w-[18px]" strokeWidth={2.1} />
                </a>
                <a href={waLink(adabraka)} target="_blank" rel="noreferrer" aria-label="WhatsApp" className={social}>
                  <MessageCircle className="h-[18px] w-[18px]" strokeWidth={2.1} />
                </a>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 rounded-pill border border-white/10 px-3.5 py-2 text-[12px] font-bold text-ink-300">
                <BadgeCheck className="h-4 w-4 text-flame-500" strokeWidth={2.3} />
                Family owned since day one
              </div>
            </div>

            {/* Explore */}
            <div>
              <h3 className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-white">Explore</h3>
              <ul className="mt-5 space-y-3 text-[14px]">
                {[
                  { to: '/menu', label: 'Digital Menu' },
                  { to: '/track', label: 'Track an Order' },
                  { to: '/account', label: 'My Account' },
                  { to: '/menu-access', label: 'Menu QR Code' },
                  { to: '/catering', label: 'Outside Catering' },
                  { to: '/community', label: 'Community Impact' },
                  { to: '/training', label: 'Training Academy' },
                  { to: '/about', label: 'About Us' },
                ].map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-ink-400 transition hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Outlets */}
            <div>
              <h3 className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-white">Outlets</h3>
              <ul className="mt-5 space-y-4 text-[14px]">
                <li>
                  <p className="font-bold text-white">Mayford Locals</p>
                  <p className="text-ink-400">Adabraka Market, Shop 5</p>
                  <a
                    href={waLink(adabraka)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 text-flame-400 transition hover:text-flame-300"
                  >
                    <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.3} /> {adabraka}
                  </a>
                </li>
                <li>
                  <p className="font-bold text-white">Mayford Fast Food</p>
                  <p className="text-ink-400">Dzorwulu Market, Shop 12 &amp; 14</p>
                  <a
                    href={waLink(dzorwulu)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 text-flame-400 transition hover:text-flame-300"
                  >
                    <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.3} /> {dzorwulu}
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-white">Get in touch</h3>
              <ul className="mt-5 space-y-3.5 text-[14px]">
                <li className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-flame-500" strokeWidth={2.2} />
                  <span className="text-ink-400">{settings?.opening_hours || 'Monday – Sunday, 9:00 AM – 9:30 PM'}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-flame-500" strokeWidth={2.2} />
                  <a href={`mailto:${settings?.email || 'mayfordfoods@gmail.com'}`} className="break-all text-ink-400 transition hover:text-white">
                    {settings?.email || 'mayfordfoods@gmail.com'}
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <Bike className="mt-0.5 h-4 w-4 shrink-0 text-flame-500" strokeWidth={2.2} />
                  <span className="text-ink-400">Delivery available on Bolt Food</span>
                </li>
              </ul>
              <LinkBtn href="/contact" variant="outline" size="sm" iconRight={Send} className="mt-5 !border-white/15 !bg-white/5 !text-white hover:!border-white/30 hover:!bg-white/10">
                Send a message
              </LinkBtn>
            </div>
          </div>

          {/* Oversized brand watermark */}
          <div className="pointer-events-none relative mt-14 h-14 select-none md:h-20" aria-hidden="true">
            <span className="outline-text-light absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[4.5rem] font-extrabold leading-none tracking-tight md:text-[7rem]">
              MAYFORD
            </span>
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-[12.5px] text-ink-500 md:flex-row">
            <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <span>© {new Date().getFullYear()} Mayford Foods GH. All rights reserved.</span>
              <Link to="/admin-pin" title="Admin access" className="inline-flex items-center gap-1 text-ink-600 transition hover:text-ink-300">
                <Lock className="h-3.5 w-3.5" strokeWidth={2.2} /> Staff
              </Link>
            </p>
            {visitors !== null && (
              <p className="inline-flex items-center gap-2">
                <Eye className="h-4 w-4" strokeWidth={2.1} />
                <span className="text-ink-400">
                  <span className="font-bold text-ink-200">{formatNum(visitors)}</span> visits
                </span>
              </p>
            )}
          </div>
        </div>
      </footer>
    </>
  );
}

/* ------------------------------------------------------------------
   Support: floating WhatsApp button + feedback / rating sheets
------------------------------------------------------------------ */
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className={`flex h-11 w-11 items-center justify-center rounded-tile border transition ${
            n <= value
              ? 'border-flame-300 bg-flame-50 text-flame-500'
              : 'border-ink-200 bg-white text-ink-300 hover:border-ink-300'
          }`}
        >
          <Star className={`h-5 w-5 ${n <= value ? 'fill-flame-500' : ''}`} strokeWidth={2} />
        </button>
      ))}
      <span className="ml-1 text-sm font-bold text-ink-500">
        {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][value]}
      </span>
    </div>
  );
}

function SupportWidget({ settings }: { settings: Settings | null }) {
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ratingMsg, setRatingMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [stars, setStars] = useState(5);
  const adabraka = settings?.adabraka_phone || '0244143271';
  const dzorwulu = settings?.dzorwulu_phone || '0533634378';

  async function submitFeedback(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    try {
      await api.post('/feedback', Object.fromEntries(new FormData(form).entries()));
      setFeedbackOpen(false);
      setFeedbackMsg({ ok: true, text: 'Feedback submitted. Thank you!' });
      form.reset();
    } catch (err) {
      setFeedbackMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function submitRating(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    try {
      const fd = Object.fromEntries(new FormData(form).entries());
      await api.post('/ratings', { ...fd, rating: stars });
      setRatingOpen(false);
      form.reset();
      window.location.href = '/?rating=success';
    } catch (err) {
      setRatingMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="fixed bottom-[5.25rem] right-4 z-40 md:bottom-6 md:right-6">
        <button
          type="button"
          aria-label="Chat with Mayford Foods"
          onClick={() => setOpen(true)}
          className="wa-pulse flex h-14 w-14 items-center justify-center rounded-pill bg-whatsapp text-white shadow-pop transition hover:scale-[1.04] hover:bg-whatsapp-dark active:scale-95"
        >
          <MessageCircle className="h-7 w-7" strokeWidth={2.2} />
        </button>
      </div>

      {/* Support hub */}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Chat with Mayford"
        subtitle="We usually reply within a few minutes."
      >
        <div className="space-y-3">
          {[
            { area: 'Adabraka', label: 'Mayford Locals', phone: adabraka },
            { area: 'Dzorwulu', label: 'Mayford Fast Food', phone: dzorwulu },
          ].map((o) => (
            <a
              key={o.area}
              href={waLink(o.phone, `Hello Mayford Foods ${o.area}, I have a question.`)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3.5 rounded-card border border-ink-200 p-4 transition hover:border-whatsapp/40 hover:bg-whatsapp/5"
            >
              <IconTile icon={MessageCircle} tone="success" />
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-extrabold text-ink-900">{o.label}</span>
                <span className="block text-[12.5px] text-ink-500">
                  {o.area} · {o.phone}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-ink-300" strokeWidth={2.4} />
            </a>
          ))}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setFeedbackOpen(true);
              }}
              className="flex items-center gap-3 rounded-card border border-ink-200 p-4 text-left transition hover:border-ink-300 hover:bg-ink-50"
            >
              <IconTile icon={Send} tone="light" />
              <span>
                <span className="block text-[14px] font-bold text-ink-900">Feedback &amp; support</span>
                <span className="block text-[12px] text-ink-500">Suggestions or complaints</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setRatingOpen(true);
              }}
              className="flex items-center gap-3 rounded-card border border-ink-200 p-4 text-left transition hover:border-ink-300 hover:bg-ink-50"
            >
              <IconTile icon={Star} tone="flame" />
              <span>
                <span className="block text-[14px] font-bold text-ink-900">Rate Mayford</span>
                <span className="block text-[12px] text-ink-500">Takes 20 seconds</span>
              </span>
            </button>
          </div>
        </div>
      </Sheet>

      {/* Feedback */}
      <Sheet
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        title="Feedback & support"
        subtitle="Tell us how we can serve you better."
      >
        {feedbackMsg && (
          <Alert tone={feedbackMsg.ok ? 'green' : 'red'} icon={feedbackMsg.ok ? CheckCircle2 : XCircle}>
            {feedbackMsg.text}
          </Alert>
        )}
        <form onSubmit={submitFeedback}>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input name="fullname" placeholder="e.g. Akosua Mensah" required />
            </Field>
            <Field label="Phone number">
              <Input name="phone" inputMode="tel" placeholder="024 000 0000" required />
            </Field>
          </div>
          <Field label="Type">
            <Select name="type" required defaultValue="">
              <option value="" disabled>
                Select a type
              </option>
              <option value="Suggestion">Suggestion</option>
              <option value="Complaint">Complaint</option>
              <option value="Compliment">Compliment</option>
            </Select>
          </Field>
          <Field label="Message">
            <Textarea name="message" rows={4} placeholder="Write your message…" required />
          </Field>
          <Button type="submit" size="lg" full loading={busy}>
            {busy ? 'Sending…' : 'Send feedback'}
          </Button>
        </form>
      </Sheet>

      {/* Rating */}
      <Sheet
        open={ratingOpen}
        onClose={() => setRatingOpen(false)}
        title="Rate Mayford"
        subtitle="Your review helps other customers choose."
      >
        {ratingMsg && (
          <Alert tone={ratingMsg.ok ? 'green' : 'red'} icon={ratingMsg.ok ? CheckCircle2 : XCircle}>
            {ratingMsg.text}
          </Alert>
        )}
        <form onSubmit={submitRating}>
          <Field label="Your rating">
            <StarPicker value={stars} onChange={setStars} />
          </Field>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input name="customer_name" placeholder="e.g. Kwame Boateng" required />
            </Field>
            <Field label="Phone number">
              <Input name="phone" inputMode="tel" placeholder="Optional" />
            </Field>
          </div>
          <Field label="Service used">
            <Select name="service_type" required defaultValue="">
              <option value="" disabled>
                Select a service
              </option>
              <option value="Food Order">Food Order</option>
              <option value="Training Academy">Training Academy</option>
              <option value="Outside Catering">Outside Catering</option>
              <option value="Customer Service">Customer Service</option>
            </Select>
          </Field>
          <Field label="Your review">
            <Textarea name="comment" rows={3} placeholder="Tell us about your experience…" />
          </Field>
          <Button type="submit" size="lg" full loading={busy}>
            {busy ? 'Submitting…' : 'Submit rating'}
          </Button>
        </form>
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------------------
   Layout
------------------------------------------------------------------ */
export function SiteLayout({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const location = useLocation();
  const lastPath = useRef('');

  // Traffic analytics: one page view per route change (the server counts a
  // visitor once per browser per day and keeps the run-of-site counter).
  useEffect(() => {
    const path = location.pathname + location.search;
    if (path.startsWith('/admin') || path === lastPath.current) return;
    lastPath.current = path;
    api
      .post('/visits', {
        path: location.pathname,
        referrer: document.referrer || '',
      })
      .then((d) => sessionStorage.setItem('mayford_visited', String(d.total_visitors)))
      .catch(() => undefined);
  }, [location.pathname, location.search]);

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <Header settings={settings} />
      <Marquee />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer settings={settings} />
      <SiteFooterSpacer />
      <SupportWidget settings={settings} />
      <MobileTabBar />
    </div>
  );
}

/** Keeps the mobile tab bar from covering footer content. */
function SiteFooterSpacer() {
  return <div className="h-[4.5rem] bg-ink-950 md:hidden" aria-hidden="true" />;
}
