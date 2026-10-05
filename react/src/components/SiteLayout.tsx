import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  Bike,
  CheckCircle2,
  Clock,
  Lock,
  Mail,
  MapPin,
  Menu as MenuIcon,
  MessageCircle,
  Music2,
  Phone,
  QrCode,
  ShoppingBag,
  Star,
  Utensils,
  X,
  XCircle,
} from 'lucide-react';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import type { Banner, Settings } from '../types';
import { ghs, waLink } from '../utils';
import { Btn, FacebookIcon, Field, Input, Select, Textarea } from './ui';
import { SmartImage } from './SmartImage';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/menu', label: 'Menu' },
  { to: '/outlets', label: 'Outlets' },
  { to: '/catering', label: 'Catering' },
  { to: '/training', label: 'Academy' },
  { to: '/community', label: 'Community' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
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

function AnnouncementBar() {
  const [banners, setBanners] = useState<Banner[]>([]);
  useEffect(() => {
    api
      .get<{ banners: Banner[] }>('/banners')
      .then((d) => setBanners(d.banners))
      .catch(() => undefined);
  }, []);
  if (banners.length === 0) return null;

  return (
    <div className="overflow-hidden whitespace-nowrap border-b border-neutral-800 bg-[#111111] py-2 text-xs font-medium tracking-wide text-neutral-300">
      <div className="animate-marquee">
        {[0, 1].map((copyIdx) => (
          <span key={copyIdx} className="inline-flex items-center" aria-hidden={copyIdx === 1 ? 'true' : undefined}>
            {banners.map((b) => (
              <span key={`${copyIdx}-${b.id}`} className="inline-flex items-center gap-3 px-8">
                <span className="h-1.5 w-1.5 bg-mayford-500" />
                <span>{b.banner_text}</span>
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { count, total } = useCart();

  useEffect(() => setOpen(false), [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-[72px] lg:px-8">
        {/* Brand Identity */}
        <Link to="/" className="flex items-center gap-3">
          <SmartImage
            src="/assets/images/logo.png"
            alt="Mayford Foods GH"
            sizes="40px"
            eager
            className="h-10 w-10 rounded-md border border-neutral-200 object-cover"
          />
          <div className="leading-none">
            <span className="block text-base font-bold tracking-[-0.02em] text-[#111111]">
              Mayford Foods
            </span>
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6B6B6B]">
              Accra, Ghana
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:block" aria-label="Main navigation">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((l) => {
              const active = isActive(l.to);
              return (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className={`relative px-3.5 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'font-semibold text-[#111111]'
                        : 'text-[#6B6B6B] hover:text-[#111111]'
                    }`}
                  >
                    {l.label}
                    {active && (
                      <span className="absolute inset-x-3.5 -bottom-[19px] h-[2px] bg-[#111111]" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Right Utility Actions */}
        <div className="hidden items-center gap-2.5 lg:flex">
          <Link
            to="/track-order"
            title="Track Your Order"
            className="inline-flex h-10 items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 text-xs font-semibold text-[#111111] transition-colors hover:border-[#111111] hover:bg-neutral-50"
          >
            <Clock className="h-4 w-4 text-[#111111]" />
            <span>Track Order</span>
          </Link>

          <Link
            to="/menu-access"
            title="QR Menu"
            className="inline-flex h-10 items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 text-xs font-semibold text-[#111111] transition-colors hover:border-[#111111] hover:bg-neutral-50"
          >
            <QrCode className="h-4 w-4 text-[#111111]" />
            <span>QR</span>
          </Link>

          <Link
            to="/cart"
            className="inline-flex h-10 items-center gap-2.5 rounded-md bg-[#111111] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#262626]"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Cart</span>
            <span className="rounded-sm bg-neutral-800 px-1.5 py-0.5 tabular-nums text-[11px] font-semibold text-white">
              {count}
            </span>
            {count > 0 && (
              <span className="border-l border-neutral-700 pl-2.5 tabular-nums text-xs font-semibold">
                {ghs(total)}
              </span>
            )}
          </Link>
        </div>

        {/* Mobile Cart + Menu Toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link
            to="/cart"
            aria-label="Shopping cart"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#111111] px-3 text-xs font-semibold text-white"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span className="tabular-nums">{count}</span>
          </Link>
          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 bg-white text-[#111111] hover:bg-neutral-50"
          >
            {open ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {open && (
        <div className="border-t border-neutral-200 bg-white px-4 pb-6 pt-3 lg:hidden">
          <ul className="divide-y divide-neutral-100">
            {NAV_LINKS.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className={`flex items-center justify-between py-3 text-sm font-semibold ${
                    isActive(l.to) ? 'text-mayford-600' : 'text-[#111111]'
                  }`}
                >
                  <span>{l.label}</span>
                  <ArrowUpRight className="h-4 w-4 text-neutral-400" />
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/track-order"
                className="flex items-center justify-between py-3 text-sm font-semibold text-[#111111]"
              >
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#6B6B6B]" />
                  Track Your Order
                </span>
                <ArrowUpRight className="h-4 w-4 text-neutral-400" />
              </Link>
            </li>
            <li>
              <Link
                to="/menu-access"
                className="flex items-center justify-between py-3 text-sm font-semibold text-[#111111]"
              >
                <span className="inline-flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-[#6B6B6B]" />
                  QR Digital Menu
                </span>
                <ArrowUpRight className="h-4 w-4 text-neutral-400" />
              </Link>
            </li>
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Link
              to="/menu"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-mayford-600 py-2.5 text-xs font-semibold text-white"
            >
              <Utensils className="h-3.5 w-3.5" />
              Browse Menu
            </Link>
            <Link
              to="/cart"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#111111] py-2.5 text-xs font-semibold text-white"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Cart ({count})
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function Footer({ settings }: { settings: Settings | null }) {
  const [params] = useSearchParams();
  const ratingSuccess = params.get('rating') === 'success';
  const adabraka = settings?.adabraka_phone || '0244143271';
  const dzorwulu = settings?.dzorwulu_phone || '0533634378';

  return (
    <>
      {ratingSuccess && (
        <div className="mx-auto my-6 w-full max-w-3xl px-4">
          <div className="flex items-center justify-center gap-3 rounded-md border border-neutral-300 bg-white px-4 py-3.5 text-sm font-semibold text-[#111111]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            Thank you for your rating. Your review has been submitted.
          </div>
        </div>
      )}

      <footer className="border-t border-neutral-200 bg-[#111111] text-neutral-400">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {/* Column 1: Brand */}
          <div>
            <div className="flex items-center gap-3">
              <SmartImage
                src="/assets/images/logo.png"
                alt="Mayford Foods GH"
                sizes="40px"
                className="h-10 w-10 rounded-md object-cover"
              />
              <div className="leading-none">
                <span className="block text-base font-bold tracking-tight text-white">Mayford Foods</span>
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                  Ghana
                </span>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-neutral-400">
              Fresh Ghanaian and continental cuisine, full-service event catering, community outreach, and practical culinary training in Accra.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <a
                href={settings?.facebook_link || 'https://www.facebook.com/'}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-800 bg-neutral-900 text-neutral-300 transition-colors hover:border-neutral-700 hover:bg-white hover:text-[#111111]"
                aria-label="Facebook"
              >
                <FacebookIcon className="h-4 w-4" />
              </a>
              <a
                href={settings?.tiktok_link || 'https://www.tiktok.com/'}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-800 bg-neutral-900 text-neutral-300 transition-colors hover:border-neutral-700 hover:bg-white hover:text-[#111111]"
                aria-label="TikTok"
              >
                <Music2 className="h-4 w-4" />
              </a>
              <a
                href={waLink(adabraka)}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-800 bg-neutral-900 text-neutral-300 transition-colors hover:border-neutral-700 hover:bg-white hover:text-[#111111]"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-white">Navigation</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { to: '/menu', label: 'Order Online' },
                { to: '/menu-access', label: 'QR Digital Menu' },
                { to: '/outlets', label: 'Accra Outlets' },
                { to: '/catering', label: 'Outside Catering' },
                { to: '/training', label: 'Training Academy' },
                { to: '/community', label: 'Community Impact' },
                { to: '/about', label: 'About Us' },
                { to: '/contact', label: 'Contact' },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-neutral-400 transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Branches */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-white">Accra Branches</h3>
            <div className="space-y-4 text-sm">
              <div className="border-l-2 border-neutral-800 pl-3.5">
                <p className="font-semibold text-white">Mayford Locals, Adabraka</p>
                <a
                  href={waLink(adabraka)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {adabraka}
                </a>
              </div>
              <div className="border-l-2 border-neutral-800 pl-3.5">
                <p className="font-semibold text-white">Mayford Fast Food, Dzorwulu</p>
                <a
                  href={waLink(dzorwulu)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {dzorwulu}
                </a>
              </div>
              <p className="flex items-center gap-2 pt-1 text-xs text-neutral-400">
                <Clock className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                {settings?.opening_hours || 'Monday - Sunday, 9:00 AM - 9:30 PM'}
              </p>
            </div>
          </div>

          {/* Column 4: Direct Contact & Delivery */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-white">Contact &amp; Delivery</h3>
            <ul className="space-y-3 text-sm text-neutral-400">
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-neutral-500" />
                <a
                  href={`mailto:${settings?.email || 'mayfordfoods@gmail.com'}`}
                  className="transition-colors hover:text-white"
                >
                  {settings?.email || 'mayfordfoods@gmail.com'}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-neutral-500" />
                <span>Adabraka &amp; Dzorwulu, Accra</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Bike className="h-4 w-4 shrink-0 text-neutral-500" />
                <a
                  href="https://food.bolt.eu/en/137-accra/p/13427-mayford-restaurant-adabraka/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-white underline underline-offset-4 hover:text-neutral-300"
                >
                  Order on Bolt Food
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-800">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-neutral-500 sm:px-6 md:flex-row lg:px-8">
            <div className="flex flex-wrap items-center gap-4">
              <p>&copy; {new Date().getFullYear()} Mayford Foods GH. All rights reserved.</p>
              <Link to="/track-order" className="text-neutral-400 transition-colors hover:text-white">
                Track Order
              </Link>
              <Link to="/legal" className="text-neutral-400 transition-colors hover:text-white">
                Privacy, Allergens &amp; Refund Policy
              </Link>
            </div>
            <Link
              to="/admin-pin"
              title="Admin Portal"
              className="inline-flex items-center gap-1.5 text-neutral-500 transition-colors hover:text-white"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Staff &amp; Admin Portal</span>
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}

const RATING_LABELS: Record<number, string> = {
  5: 'Excellent',
  4: 'Very Good',
  3: 'Good',
  2: 'Fair',
  1: 'Poor',
};

function WhatsAppFloat({ settings }: { settings: Settings | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [feedbackMsg, setFeedbackMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ratingMsg, setRatingMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const adabraka = settings?.adabraka_phone || '0244143271';
  const dzorwulu = settings?.dzorwulu_phone || '0533634378';

  async function submitFeedback(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api.post('/feedback', Object.fromEntries(fd.entries()));
      setFeedbackOpen(false);
      setFeedbackMsg({ ok: true, text: 'Feedback submitted. Thank you.' });
      e.currentTarget.reset();
    } catch (err) {
      setFeedbackMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function submitRating(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true);
    try {
      await api.post('/ratings', { ...fd, rating: Number(fd.rating || selectedRating) });
      setRatingOpen(false);
      e.currentTarget.reset();
      window.location.href = '/?rating=success';
    } catch (err) {
      setRatingMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50">
        {menuOpen && (
          <div className="absolute bottom-14 right-0 w-64 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lift">
            <div className="border-b border-neutral-200 bg-[#FAF6E8] px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#111111]">
                Mayford Support &amp; Direct Line
              </p>
            </div>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-[#111111] transition-colors hover:bg-neutral-50"
              onClick={() => {
                setMenuOpen(false);
                setFeedbackOpen(true);
              }}
            >
              <MessageCircle className="h-4 w-4 text-[#111111]" />
              <span>Feedback &amp; Support</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 border-t border-neutral-100 px-4 py-3 text-left text-sm font-medium text-[#111111] transition-colors hover:bg-neutral-50"
              onClick={() => {
                setMenuOpen(false);
                setRatingOpen(true);
              }}
            >
              <Star className="h-4 w-4 text-mayford-600" />
              <span>Rate Mayford</span>
            </button>
            <a
              className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 text-sm font-medium text-[#111111] transition-colors hover:bg-neutral-50"
              target="_blank"
              rel="noreferrer"
              href={waLink(adabraka)}
            >
              <span className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-whatsapp" />
                <span>Adabraka WhatsApp</span>
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-neutral-400" />
            </a>
            <a
              className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 text-sm font-medium text-[#111111] transition-colors hover:bg-neutral-50"
              target="_blank"
              rel="noreferrer"
              href={waLink(dzorwulu)}
            >
              <span className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-whatsapp" />
                <span>Dzorwulu WhatsApp</span>
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-neutral-400" />
            </a>
          </div>
        )}

        <button
          type="button"
          aria-label="Support and WhatsApp chat"
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex h-11 items-center gap-2 rounded-md border border-neutral-800 bg-[#111111] px-4 text-xs font-semibold text-white shadow-lift transition-colors hover:bg-[#262626]"
        >
          {menuOpen ? (
            <>
              <X className="h-4 w-4" />
              <span>Close</span>
            </>
          ) : (
            <>
              <MessageCircle className="h-4 w-4 text-whatsapp" />
              <span>Help &amp; WhatsApp</span>
            </>
          )}
        </button>
      </div>

      {feedbackOpen && (
        <Popup title="Feedback & Support" onClose={() => setFeedbackOpen(false)}>
          {feedbackMsg && (
            <p
              className={`mb-4 flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium ${
                feedbackMsg.ok
                  ? 'border-neutral-300 bg-[#FAF6E8] text-[#111111]'
                  : 'border-red-300 bg-white text-red-700'
              }`}
            >
              {feedbackMsg.ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-red-600" />
              )}
              {feedbackMsg.text}
            </p>
          )}
          <form onSubmit={submitFeedback}>
            <Field label="Full Name">
              <Input name="fullname" placeholder="Enter your full name" required />
            </Field>
            <Field label="Phone Number">
              <Input name="phone" placeholder="Enter your phone number" required />
            </Field>
            <Field label="Inquiry Type">
              <Select name="type" required defaultValue="">
                <option value="" disabled>
                  Select type
                </option>
                <option value="Suggestion">Suggestion</option>
                <option value="Complaint">Complaint</option>
                <option value="Compliment">Compliment</option>
              </Select>
            </Field>
            <Field label="Message">
              <Textarea name="message" rows={4} placeholder="How can we help?" required />
            </Field>
            <Btn type="submit" disabled={busy} className="w-full">
              Submit Feedback
            </Btn>
          </form>
        </Popup>
      )}

      {ratingOpen && (
        <Popup title="Rate Mayford" onClose={() => setRatingOpen(false)}>
          {ratingMsg && (
            <p
              className={`mb-4 flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium ${
                ratingMsg.ok
                  ? 'border-neutral-300 bg-[#FAF6E8] text-[#111111]'
                  : 'border-red-300 bg-white text-red-700'
              }`}
            >
              {ratingMsg.ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-red-600" />
              )}
              {ratingMsg.text}
            </p>
          )}
          <form onSubmit={submitRating}>
            <Field label="Full Name">
              <Input name="customer_name" placeholder="Enter your full name" required />
            </Field>
            <Field label="Phone Number (Optional)">
              <Input name="phone" placeholder="Enter your phone number" />
            </Field>
            <Field label="Service">
              <Select name="service_type" required defaultValue="">
                <option value="" disabled>
                  Select service
                </option>
                <option value="Food Order">Food Order</option>
                <option value="Training Academy">Training Academy</option>
                <option value="Outside Catering">Outside Catering</option>
                <option value="Customer Service">Customer Service</option>
              </Select>
            </Field>
            <Field label="Your Rating">
              <input type="hidden" name="rating" value={selectedRating} />
              <div className="flex items-center justify-between rounded-md border border-neutral-300 bg-[#FAF6E8] px-3.5 py-2.5">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSelectedRating(n)}
                      aria-label={`Rate ${n} out of 5`}
                      className="rounded-sm p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          n <= selectedRating
                            ? 'fill-[#111111] text-[#111111]'
                            : 'fill-neutral-200 text-neutral-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-semibold text-[#111111]">
                  {selectedRating}/5 · {RATING_LABELS[selectedRating]}
                </span>
              </div>
            </Field>
            <Field label="Review">
              <Textarea name="comment" rows={3} placeholder="Share details of your experience..." />
            </Field>
            <Btn type="submit" disabled={busy} className="w-full">
              Submit Rating
            </Btn>
          </form>
        </Popup>
      )}
    </>
  );
}

function Popup({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-lg border border-neutral-200 bg-white p-6 shadow-lift sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between border-b border-neutral-100 pb-4">
          <h2 className="text-lg font-bold tracking-tight text-[#111111]">{title}</h2>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-[#111111]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const countedRef = useRef(false);

  // Silently tracks visitor count for Admin Analytics
  useEffect(() => {
    if (countedRef.current) return;
    countedRef.current = true;
    if (!sessionStorage.getItem('mayford_visited')) {
      sessionStorage.setItem('mayford_visited', '1');
      api
        .post('/visit')
        .then((d) => sessionStorage.setItem('mayford_visited', String(d.total_visitors)))
        .catch(() => undefined);
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#111111]">
      <AnnouncementBar />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
      <WhatsAppFloat settings={settings} />
    </div>
  );
}
