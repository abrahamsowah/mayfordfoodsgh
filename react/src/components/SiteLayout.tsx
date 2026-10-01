import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Bike,
  CheckCircle2,
  Clock,
  Eye,
  Lock,
  Mail,
  MapPin,
  Menu as MenuIcon,
  MessageCircle,
  Music,
  Phone,
  ShoppingBag,
  Star,
  X,
  XCircle,
} from 'lucide-react';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import type { Banner, Settings } from '../types';
import { formatNum, waLink } from '../utils';
import { Btn, FacebookIcon, Input, Select, Textarea } from './ui';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/outlets', label: 'Outlets' },
  { to: '/menu-access', label: 'Menu' },
  { to: '/catering', label: 'Catering' },
  { to: '/community', label: 'Community' },
  { to: '/training', label: 'Training' },
  { to: '/about', label: 'About Us' },
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

function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { count } = useCart();
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled ? 'bg-white/85 shadow-lg shadow-mayford-900/5 backdrop-blur-xl' : 'bg-white/60 backdrop-blur-md'
      } border-b border-stone-900/5`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 md:h-[72px]">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="relative">
            <img src="/assets/images/logo.png" alt="Mayford Foods Logo" className="h-10 w-10 rounded-full object-cover ring-2 ring-flame-500/60 md:h-11 md:w-11" />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-flame-500 px-1 text-[11px] font-extrabold text-white shadow">
                {count}
              </span>
            )}
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-extrabold tracking-tight text-stone-900 md:text-base">Mayford Foods</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.3em] text-mayford-600">Ghana</span>
          </span>
        </Link>

        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full p-2 text-mayford-700 md:hidden"
        >
          {open ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>

        <nav className={open ? 'block' : 'hidden'}>
          <ul
            className={`flex-col gap-1 md:flex md:flex-row ${
              open ? 'absolute inset-x-0 top-full z-50 flex rounded-b-3xl border-b border-stone-900/5 bg-white/95 px-4 pb-5 pt-2 shadow-xl backdrop-blur-xl' : ''
            }`}
          >
            {NAV_LINKS.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    location.pathname === l.to
                      ? 'bg-mayford-600 text-white'
                      : 'text-stone-700 hover:bg-mayford-50 hover:text-mayford-700'
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          to="/menu"
          className="hidden items-center gap-2 rounded-full bg-mayford-600 px-5 py-2.5 text-sm font-bold text-white shadow-glow transition hover:bg-mayford-700 md:inline-flex"
        >
          <ShoppingBag className="h-4 w-4" />
          Cart{count > 0 && <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{count}</span>}
        </Link>
      </div>
    </header>
  );
}

/** Orange scrolling banner with messages from the `banners` table (old <marquee>) */
function Marquee() {
  const [banners, setBanners] = useState<Banner[]>([]);
  useEffect(() => {
    api
      .get<{ banners: Banner[] }>('/banners')
      .then((d) => setBanners(d.banners))
      .catch(() => undefined);
  }, []);
  if (banners.length === 0) return null;
  const text = banners.map((b) => `•  ${b.banner_text}`).join('          ');
  return (
    <div className="overflow-hidden whitespace-nowrap bg-gradient-to-r from-mayford-600 via-flame-500 to-mayford-600 py-2.5 text-[13px] font-bold uppercase tracking-wider text-white">
      <div className="animate-marquee">
        <span className="px-6">{text}</span>
        <span className="px-6" aria-hidden="true">
          {text}
        </span>
      </div>
    </div>
  );
}

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

  return (
    <>
      {ratingSuccess && (
        <div className="mx-auto mb-6 w-full max-w-3xl px-4">
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-green-600 px-4 py-4 font-bold text-white shadow-lift">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Thank you for your rating! Your review has been submitted successfully.
          </div>
        </div>
      )}
      <footer className="bg-stone-950 text-stone-300">
        <div className="kente-stripe h-1.5 w-full" />
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <img src="/assets/images/logo.png" alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-flame-500/60" />
              <span className="leading-tight">
                <span className="block text-base font-extrabold text-white">Mayford Foods</span>
                <span className="block text-[10px] font-bold uppercase tracking-[0.3em] text-flame-400">Ghana</span>
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-stone-400">
              Delicious Ghanaian &amp; continental meals, outside catering, community outreach and professional
              training in the heart of Accra.
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href={settings?.facebook_link || 'https://www.facebook.com/'}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-stone-300 transition hover:bg-mayford-600 hover:text-white"
                aria-label="Facebook"
              >
                <FacebookIcon className="h-4.5 w-4.5" />
              </a>
              <a
                href={settings?.tiktok_link || 'https://www.tiktok.com/'}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-stone-300 transition hover:bg-mayford-600 hover:text-white"
                aria-label="TikTok"
              >
                <Music className="h-4.5 w-4.5" />
              </a>
              <a
                href={waLink(adabraka)}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-stone-300 transition hover:bg-whatsapp hover:text-white"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-4.5 w-4.5" />
              </a>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h3 className="mb-4 text-sm font-extrabold uppercase tracking-widest text-white">Explore</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { to: '/menu-access', label: 'Digital Menu' },
                { to: '/outlets', label: 'Our Outlets' },
                { to: '/catering', label: 'Outside Catering' },
                { to: '/community', label: 'Community Impact' },
                { to: '/training', label: 'Training Academy' },
                { to: '/contact', label: 'Contact Us' },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-stone-400 transition hover:text-flame-400">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Outlets */}
          <div>
            <h3 className="mb-4 text-sm font-extrabold uppercase tracking-widest text-white">Our Outlets</h3>
            <ul className="space-y-4 text-sm">
              <li>
                <p className="font-bold text-white">Mayford Locals, Adabraka</p>
                <p className="text-stone-400">
                  WhatsApp:{' '}
                  <a href={waLink(adabraka)} target="_blank" rel="noreferrer" className="text-flame-400 hover:underline">
                    {adabraka}
                  </a>
                </p>
              </li>
              <li>
                <p className="font-bold text-white">Mayford Fast Food, Dzorwulu</p>
                <p className="text-stone-400">
                  WhatsApp:{' '}
                  <a href={waLink(dzorwulu)} target="_blank" rel="noreferrer" className="text-flame-400 hover:underline">
                    {dzorwulu}
                  </a>
                </p>
              </li>
            </ul>
            <p className="mt-4 flex items-center gap-2 text-sm text-stone-400">
              <Clock className="h-4 w-4 shrink-0 text-flame-400" />
              {settings?.opening_hours || 'Monday - Sunday 9:00 AM - 9:30 PM'}
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-sm font-extrabold uppercase tracking-widest text-white">Get In Touch</h3>
            <ul className="space-y-3 text-sm text-stone-400">
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-flame-400" />
                <a href={`mailto:${settings?.email || 'mayfordfoods@gmail.com'}`} className="hover:text-flame-400">
                  {settings?.email || 'mayfordfoods@gmail.com'}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-flame-400" />
                Adabraka &amp; Dzorwulu, Accra
              </li>
              <li className="flex items-center gap-2.5">
                <Bike className="h-4 w-4 shrink-0 text-flame-400" />
                <span>
                  Available on{' '}
                  <a
                    href="https://food.bolt.eu/en/137-accra/p/13427-mayford-restaurant-adabraka/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-flame-400 hover:underline"
                  >
                    Bolt Food
                  </a>
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pointer-events-none relative h-20 select-none overflow-hidden md:h-28" aria-hidden="true">
          <span className="outline-text-light absolute inset-x-0 -bottom-6 text-center text-[7rem] font-extrabold leading-none tracking-tight md:-bottom-8 md:text-[9rem]">
            MAYFORD
          </span>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-stone-500 sm:px-6 md:flex-row">
            <p>
              © {new Date().getFullYear()} Mayford Foods GH. All Rights Reserved.
              <Link to="/admin-pin" title="Admin Access" className="ml-3 opacity-20 transition hover:opacity-70">
                <Lock className="h-3.5 w-3.5" />
              </Link>
            </p>
            {visitors !== null && (
              <p className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Visitors:{' '}
                <span className="font-bold text-stone-300">{formatNum(visitors)}</span>
              </p>
            )}
          </div>
        </div>
      </footer>
    </>
  );
}

/** Floating WhatsApp button with the feedback / rating popups (original footer.php) */
function WhatsAppFloat({ settings }: { settings: Settings | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
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
      setFeedbackMsg({ ok: true, text: 'Feedback submitted. Thank you!' });
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
      await api.post('/ratings', { ...fd, rating: Number(fd.rating) });
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
          <div className="absolute bottom-20 right-0 w-60 overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-stone-900/10">
            <button
              type="button"
              className="block w-full px-4 py-3.5 text-left text-sm font-bold text-stone-800 transition hover:bg-flame-50"
              onClick={() => {
                setMenuOpen(false);
                setFeedbackOpen(true);
              }}
            >
              <span className="flex items-center gap-3">
                <MessageCircle className="h-4 w-4 text-mayford-600" /> Feedback &amp; Support
              </span>
            </button>
            <button
              type="button"
              className="block w-full px-4 py-3.5 text-left text-sm font-bold text-stone-800 transition hover:bg-flame-50"
              onClick={() => {
                setMenuOpen(false);
                setRatingOpen(true);
              }}
            >
              <span className="flex items-center gap-3">
                <Star className="h-4 w-4 fill-flame-500 text-flame-500" /> Rate Mayford
              </span>
            </button>
            <a
              className="block border-t border-stone-100 px-4 py-3.5 text-sm font-bold text-stone-800 transition hover:bg-flame-50"
              target="_blank"
              rel="noreferrer"
              href={waLink(adabraka)}
            >
              <span className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-mayford-600" /> Adabraka Branch
              </span>
            </a>
            <a
              className="block border-t border-stone-100 px-4 py-3.5 text-sm font-bold text-stone-800 transition hover:bg-flame-50"
              target="_blank"
              rel="noreferrer"
              href={waLink(dzorwulu)}
            >
              <span className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-mayford-600" /> Dzorwulu Branch
              </span>
            </a>
          </div>
        )}
        <button
          type="button"
          aria-label="Chat with us"
          onClick={() => setMenuOpen((v) => !v)}
          className="wa-pulse flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-lift transition hover:scale-105 hover:bg-whatsapp-dark"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-7 w-7" />}
        </button>
      </div>

      {feedbackOpen && (
        <Popup title="Feedback & Support" onClose={() => setFeedbackOpen(false)}>
          {feedbackMsg && (
            <p className={`mb-3 flex items-center gap-2 text-sm font-semibold ${feedbackMsg.ok ? 'text-green-700' : 'text-red-700'}`}>
              {feedbackMsg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
              {feedbackMsg.text}
            </p>
          )}
          <form onSubmit={submitFeedback}>
            <Input name="fullname" placeholder="Full Name" required className="mb-3" />
            <Input name="phone" placeholder="Phone Number" required className="mb-3" />
            <Select name="type" required className="mb-3">
              <option value="">Select Type</option>
              <option value="Suggestion">Suggestion</option>
              <option value="Complaint">Complaint</option>
              <option value="Compliment">Compliment</option>
            </Select>
            <Textarea name="message" rows={4} placeholder="Write your message..." required className="mb-3" />
            <Btn type="submit" disabled={busy} className="w-full">
              Submit Feedback
            </Btn>
          </form>
        </Popup>
      )}

      {ratingOpen && (
        <Popup title="Rate Mayford" onClose={() => setRatingOpen(false)}>
          {ratingMsg && (
            <p className={`mb-3 flex items-center gap-2 text-sm font-semibold ${ratingMsg.ok ? 'text-green-700' : 'text-red-700'}`}>
              {ratingMsg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
              {ratingMsg.text}
            </p>
          )}
          <form onSubmit={submitRating}>
            <Input name="customer_name" placeholder="Full Name" required className="mb-3" />
            <Input name="phone" placeholder="Phone Number" className="mb-3" />
            <Select name="service_type" required className="mb-3">
              <option value="">Select Service</option>
              <option value="Food Order">Food Order</option>
              <option value="Training Academy">Training Academy</option>
              <option value="Outside Catering">Outside Catering</option>
              <option value="Customer Service">Customer Service</option>
            </Select>
            <Select name="rating" required className="mb-3">
              <option value="">Select Rating</option>
              <option value="5">★★★★★ Excellent</option>
              <option value="4">★★★★ Very Good</option>
              <option value="3">★★★ Good</option>
              <option value="2">★★ Fair</option>
              <option value="1">★ Poor</option>
            </Select>
            <Textarea name="comment" rows={3} placeholder="Write your review..." className="mb-3" />
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-lift sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition hover:bg-mayford-600 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="mb-5 text-2xl font-extrabold tracking-tight text-mayford-700">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const countedRef = useRef(false);

  // Visitor counter (original visitor_counter.php — once per browser session)
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
    <div className="flex min-h-screen flex-col">
      <Header />
      <Marquee />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
      <WhatsAppFloat settings={settings} />
    </div>
  );
}
