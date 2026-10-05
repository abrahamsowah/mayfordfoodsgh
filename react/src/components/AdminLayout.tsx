import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  ChefHat,
  ClipboardList,
  Clapperboard,
  FolderOpen,
  GraduationCap,
  Heart,
  Images,
  LogOut,
  Mail,
  Megaphone,
  Menu as MenuIcon,
  ScrollText,
  Settings,
  Star,
  Tags,
  User,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  X,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../api';
import type { Admin } from '../types';
import { Spinner } from './ui';
import { ghs } from '../utils';

/* ============================= SYNTHESIZED KITCHEN AUDIO BELL ============================= */
export function playKitchenOrderChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    };

    // Warm 3-tone arpeggio bell: E5 (659Hz) -> G#5 (830Hz) -> B5 (988Hz)
    playTone(659.25, now, 0.16);
    playTone(830.61, now + 0.13, 0.20);
    playTone(987.77, now + 0.28, 0.42);
  } catch {
    /* audio blocked until user gesture */
  }
}

/* ============================= REAL-TIME STREAM CONTEXT ============================= */
export interface LiveEventPayload {
  type: string;
  data: Record<string, any>;
  timestamp: string;
}

export interface LiveToastAlert {
  id: string;
  title: string;
  subtitle: string;
  linkTo?: string;
  type: 'order' | 'application' | 'message' | 'general';
}

interface LiveContextType {
  connected: boolean;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  lastEvent: LiveEventPayload | null;
  notifications: { orders: number; applications: number; messages: number };
  refreshNotifications: () => void;
}

const LiveContext = createContext<LiveContextType>({
  connected: false,
  soundEnabled: true,
  setSoundEnabled: () => undefined,
  lastEvent: null,
  notifications: { orders: 0, applications: 0, messages: 0 },
  refreshNotifications: () => undefined,
});

export function useAdminLive() {
  return useContext(LiveContext);
}

/* ============================= SESSION CONTEXT ============================= */
interface SessionState {
  admin: Admin | null;
  loading: boolean;
  refresh: () => void;
}

const SessionContext = createContext<SessionState>({ admin: null, loading: true, refresh: () => undefined });

export function useAdminSession(): SessionState {
  return useContext(SessionContext);
}

function useSession() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = () => {
    api
      .get<{ admin: Admin | null }>('/auth/session')
      .then((d) => setAdmin(d.admin))
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false));
  };
  useEffect(refresh, []);
  return { admin, loading, refresh };
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { admin, loading, refresh } = useSession();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F7]">
        <Spinner />
      </div>
    );
  }
  if (!admin) return <NavigateToLogin />;
  return <SessionContext.Provider value={{ admin, loading, refresh }}>{children}</SessionContext.Provider>;
}

function NavigateToLogin() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7] p-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <p className="mb-4 text-base font-bold text-[#111111]">Admin authentication required</p>
        <Link
          to="/admin/login"
          className="inline-flex items-center justify-center rounded-md bg-[#111111] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#262626]"
        >
          Go to Admin Login
        </Link>
      </div>
    </div>
  );
}

export function prettyRole(role: string): string {
  return role
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  section: string;
  superOnly?: boolean;
  badgeKey?: 'orders' | 'applications' | 'messages';
}

const NAV: NavItem[] = [
  { to: '/admin/dashboard', label: 'Analytics & Overview', icon: BarChart3, section: 'Overview' },
  { to: '/admin/orders', label: 'Customer Orders', icon: ClipboardList, section: 'Overview', badgeKey: 'orders' },
  { to: '/admin/menu', label: 'Food Menu Items', icon: UtensilsCrossed, section: 'Menu & Pricing' },
  { to: '/admin/categories', label: 'Menu Categories', icon: FolderOpen, section: 'Menu & Pricing' },
  { to: '/admin/discounts', label: 'Promotional Discounts', icon: Tags, section: 'Menu & Pricing' },
  { to: '/admin/catering-bookings', label: 'Catering Bookings', icon: ChefHat, section: 'Inquiries' },
  { to: '/admin/training-applications', label: 'Academy Applications', icon: GraduationCap, section: 'Inquiries', badgeKey: 'applications' },
  { to: '/admin/ratings', label: 'Guest Ratings', icon: Star, section: 'Inquiries' },
  { to: '/admin/contact-messages', label: 'Contact Messages', icon: Mail, section: 'Inquiries', superOnly: true, badgeKey: 'messages' },
  { to: '/admin/adverts', label: 'Promotional Banners', icon: Megaphone, section: 'Site Content' },
  { to: '/admin/banners', label: 'Announcement Ticker', icon: ScrollText, section: 'Site Content' },
  { to: '/admin/slides', label: 'Hero Gallery Slides', icon: Images, section: 'Site Content' },
  { to: '/admin/videos', label: 'Kitchen Videos', icon: Clapperboard, section: 'Site Content' },
  { to: '/admin/community', label: 'Community Media', icon: Heart, section: 'Site Content' },
  { to: '/admin/settings', label: 'Settings & Paystack', icon: Settings, section: 'Configuration', superOnly: true },
];

export function AdminLayout() {
  const { admin } = useAdminSession();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [connected, setConnected] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('mayford_admin_sound') !== '0';
  });
  const [lastEvent, setLastEvent] = useState<LiveEventPayload | null>(null);
  const [toasts, setToasts] = useState<LiveToastAlert[]>([]);
  const [notifications, setNotifications] = useState({ orders: 0, applications: 0, messages: 0 });
  const eventSourceRef = useRef<EventSource | null>(null);

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('mayford_admin_sound', next ? '1' : '0');
    if (next) playKitchenOrderChime();
  }

  const refreshNotifications = () => {
    api
      .get<{ orders: number; applications: number; messages: number }>('/admin/notifications')
      .then((d) => setNotifications(d))
      .catch(() => undefined);
  };

  function pushToast(toast: LiveToastAlert) {
    setToasts((prev) => [toast, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 8000);
  }

  // Real-time Server-Sent Events (SSE) connection with automatic reconnect
  useEffect(() => {
    if (!admin) return;

    let stopped = false;
    function connectSse() {
      if (stopped) return;
      try {
        const es = new EventSource('/api/admin/live-stream');
        eventSourceRef.current = es;

        es.onopen = () => {
          setConnected(true);
          refreshNotifications();
        };

        es.onmessage = (e) => {
          try {
            const parsed = JSON.parse(e.data) as LiveEventPayload;
            setLastEvent(parsed);

            if (parsed.type === 'order_created') {
              const ord = parsed.data;
              if (soundEnabled) playKitchenOrderChime();
              pushToast({
                id: `ord-${ord.id}-${Date.now()}`,
                title: `New Order #${ord.id} (${ord.outlet})`,
                subtitle: `${ord.customer_name} · ${ghs(ord.total)} · ${ord.order_type}`,
                linkTo: `/admin/orders?search=${ord.id}`,
                type: 'order',
              });
              refreshNotifications();
            } else if (parsed.type === 'application_created') {
              const app = parsed.data;
              if (soundEnabled) playKitchenOrderChime();
              pushToast({
                id: `app-${app.id}-${Date.now()}`,
                title: `New Academy Applicant`,
                subtitle: `${app.full_name} (${app.application_ref || 'MFA'}) · ${app.program}`,
                linkTo: '/admin/training-applications',
                type: 'application',
              });
              refreshNotifications();
            } else if (parsed.type === 'message_created') {
              pushToast({
                id: `msg-${Date.now()}`,
                title: `New Contact Message`,
                subtitle: `${parsed.data.full_name}: ${parsed.data.subject}`,
                linkTo: '/admin/contact-messages',
                type: 'message',
              });
              refreshNotifications();
            } else if (parsed.type === 'order_status_updated' || parsed.type === 'order_payment_updated') {
              refreshNotifications();
            }
          } catch {
            /* ignore non-JSON messages / heartbeats */
          }
        };

        es.onerror = () => {
          setConnected(false);
          es.close();
          // Reconnect attempt after 4 seconds
          setTimeout(connectSse, 4000);
        };
      } catch {
        setConnected(false);
        setTimeout(connectSse, 5000);
      }
    }

    connectSse();
    refreshNotifications();

    // Secondary background poll every 6s as a failsafe
    const pollTimer = setInterval(refreshNotifications, 6000);

    return () => {
      stopped = true;
      clearInterval(pollTimer);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [admin, soundEnabled]);

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    navigate('/admin/login');
  }

  const items = NAV.filter((i) => !i.superOnly || admin?.role === 'super_admin');
  const sections = Array.from(new Set(items.map((i) => i.section)));

  const sidebar = (
    <div className="flex h-full flex-col border-r border-neutral-800 bg-[#111111] text-white">
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
        <Link to="/admin/dashboard" className="flex items-center gap-3">
          <img src="/assets/images/logo.png" alt="Mayford Foods" className="h-9 w-9 rounded-md object-cover" />
          <div className="leading-none">
            <p className="text-sm font-bold tracking-tight text-white">Mayford Admin</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Operations &amp; POS
            </p>
          </div>
        </Link>
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="rounded-md p-1 text-neutral-400 hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {sections.map((sec) => (
          <div key={sec}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              {sec}
            </p>
            <div className="space-y-0.5">
              {items
                .filter((i) => i.section === sec)
                .map((i) => {
                  const badgeCount = i.badgeKey ? notifications[i.badgeKey] : 0;
                  return (
                    <NavLink
                      key={i.to}
                      to={i.to}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                          isActive
                            ? 'bg-white text-[#111111]'
                            : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <i.icon className="h-4 w-4 shrink-0" />
                        <span>{i.label}</span>
                      </div>
                      {badgeCount > 0 && (
                        <span className="rounded-full bg-mayford-600 px-1.5 py-0.5 text-[10px] font-bold text-white animate-pulse">
                          {badgeCount}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      {/* Admin Footer */}
      <div className="border-t border-neutral-800 p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-800 text-neutral-300">
            <User className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{admin?.name}</p>
            <p className="truncate text-[11px] text-neutral-400">{prettyRole(admin?.role || '')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-mayford-600 hover:border-mayford-600"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <LiveContext.Provider
      value={{
        connected,
        soundEnabled,
        setSoundEnabled,
        lastEvent,
        notifications,
        refreshNotifications,
      }}
    >
      <div className="min-h-screen bg-[#F7F7F7] text-[#111111]">
        {/* Global Live Toast Notifications Container */}
        <div className="fixed right-4 top-16 z-[100] flex w-full max-w-sm flex-col gap-2.5 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start justify-between gap-3 rounded-lg border border-neutral-800 bg-[#111111] p-4 text-white shadow-2xl transition-all"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-mayford-600 text-white">
                  <Bell className="h-4 w-4 animate-bounce" />
                </span>
                <div>
                  <p className="text-xs font-bold text-white">{t.title}</p>
                  <p className="mt-0.5 text-[11px] text-neutral-300">{t.subtitle}</p>
                  {t.linkTo && (
                    <Link
                      to={t.linkTo}
                      onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                      className="mt-2 inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[10px] font-bold text-[#111111] hover:bg-neutral-200"
                    >
                      <span>View Record</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="rounded p-1 text-neutral-400 hover:text-white"
                aria-label="Dismiss alert"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Mobile Drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative h-full w-64" onClick={(e) => e.stopPropagation()}>
              {sidebar}
            </div>
          </div>
        )}

        {/* Desktop Fixed Sidebar */}
        <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 lg:block">{sidebar}</aside>

        {/* Main Content Area */}
        <div className="lg:pl-64">
          {/* Top Real-Time Status Header */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 text-[#111111] lg:hidden"
              >
                <MenuIcon className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                  {prettyRole(admin?.role || '')} Workspace
                </span>
                <span
                  title={connected ? 'Connected to live order stream' : 'Reconnecting to stream...'}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    connected
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <span>{connected ? 'LIVE STREAM' : 'SYNCING'}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Sound Alert Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                title={soundEnabled ? 'Order Bell Sound: ON (Click to mute)' : 'Order Bell Sound: OFF (Click to unmute)'}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  soundEnabled
                    ? 'border-neutral-300 bg-white text-[#111111] hover:border-[#111111]'
                    : 'border-neutral-200 bg-neutral-100 text-neutral-400'
                }`}
              >
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-emerald-600" /> : <VolumeX className="h-3.5 w-3.5 text-neutral-400" />}
                <span className="hidden sm:inline">{soundEnabled ? 'Chime ON' : 'Muted'}</span>
              </button>

              <Link
                to="/admin/menu"
                className="hidden items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#111111] sm:inline-flex"
              >
                <UtensilsCrossed className="h-3.5 w-3.5" />
                <span>Manage Foods</span>
              </Link>

              <Link
                to="/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#111111] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#262626]"
              >
                <span>View Live Site</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </header>

          <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </LiveContext.Provider>
  );
}
