import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
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
  Laptop,
  Mail,
  Megaphone,
  Menu as MenuIcon,
  PackageCheck,
  ScrollText,
  Settings,
  Star,
  Tags,
  Tablet,
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
import { SmartImage } from './SmartImage';

/* ============================= SYNTHESIZED KITCHEN AUDIO BELL ============================= */
let kitchenAudioContext: AudioContext | null = null;
const activeKitchenOscillators = new Set<OscillatorNode>();

function getKitchenAudioContext(): AudioContext | null {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!kitchenAudioContext || kitchenAudioContext.state === 'closed') {
      kitchenAudioContext = new AudioContextClass();
    }
    return kitchenAudioContext;
  } catch {
    return null;
  }
}

// Call from a real user gesture so browsers unlock audio for later SSE order alerts.
export function unlockKitchenOrderAudio() {
  const ctx = getKitchenAudioContext();
  if (ctx?.state === 'suspended') void ctx.resume().catch(() => undefined);
}

export function playKitchenOrderChime() {
  try {
    const ctx = getKitchenAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.onended = () => activeKitchenOscillators.delete(osc);
      activeKitchenOscillators.add(osc);
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
    /* audio may be unavailable or blocked by browser policy */
  }
}

function stopKitchenOrderChime() {
  for (const oscillator of activeKitchenOscillators) {
    try {
      oscillator.stop();
    } catch {
      /* an oscillator may have finished between the Set snapshot and this call */
    }
  }
  activeKitchenOscillators.clear();
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
  orderId?: number;
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

export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const { admin } = useAdminSession();
  if (admin?.role !== 'super_admin') return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
}

export function AdminDeviceGate({ children }: { children: ReactNode }) {
  const [phoneViewport, setPhoneViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)');
    const updateViewport = (event: MediaQueryListEvent) => setPhoneViewport(event.matches);
    setPhoneViewport(media.matches);
    media.addEventListener('change', updateViewport);
    return () => media.removeEventListener('change', updateViewport);
  }, []);

  if (!phoneViewport) return <>{children}</>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F7] p-5 sm:hidden">
      <section role="alert" className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-7 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center gap-1 rounded-full bg-neutral-100 text-[#111111]">
          <Tablet className="h-6 w-6" />
          <Laptop className="h-6 w-6" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-mayford-600">Mayford Admin</p>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-[#111111]">Use a tablet or computer</h1>
        <p className="mt-3 text-sm leading-6 text-[#6B6B6B]">
          Order management and live branch updates are available on tablets, laptops, and desktops. Please open the admin workspace on one of those screens. The customer website remains available on your phone.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#262626]"
        >
          Return to the website
        </Link>
      </section>
    </main>
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
  { to: '/admin/menu-availability', label: 'Menu Availability', icon: PackageCheck, section: 'Overview' },
  { to: '/admin/menu', label: 'Food Menu Items', icon: UtensilsCrossed, section: 'Menu & Pricing', superOnly: true },
  { to: '/admin/categories', label: 'Menu Categories', icon: FolderOpen, section: 'Menu & Pricing', superOnly: true },
  { to: '/admin/discounts', label: 'Promotional Discounts', icon: Tags, section: 'Menu & Pricing', superOnly: true },
  { to: '/admin/catering-bookings', label: 'Catering Bookings', icon: ChefHat, section: 'Inquiries', superOnly: true },
  { to: '/admin/training-applications', label: 'Academy Applications', icon: GraduationCap, section: 'Inquiries', superOnly: true, badgeKey: 'applications' },
  { to: '/admin/ratings', label: 'Guest Ratings', icon: Star, section: 'Inquiries', superOnly: true },
  { to: '/admin/contact-messages', label: 'Contact Messages', icon: Mail, section: 'Inquiries', superOnly: true, badgeKey: 'messages' },
  { to: '/admin/adverts', label: 'Promotional Banners', icon: Megaphone, section: 'Site Content', superOnly: true },
  { to: '/admin/banners', label: 'Announcement Ticker', icon: ScrollText, section: 'Site Content', superOnly: true },
  { to: '/admin/slides', label: 'Hero Gallery Slides', icon: Images, section: 'Site Content', superOnly: true },
  { to: '/admin/videos', label: 'Kitchen Videos', icon: Clapperboard, section: 'Site Content', superOnly: true },
  { to: '/admin/community', label: 'Community Media', icon: Heart, section: 'Site Content', superOnly: true },
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
  const soundEnabledRef = useRef(soundEnabled);
  const [lastEvent, setLastEvent] = useState<LiveEventPayload | null>(null);
  const [toasts, setToasts] = useState<LiveToastAlert[]>([]);
  const [notifications, setNotifications] = useState({ orders: 0, applications: 0, messages: 0 });
  const [unacknowledgedOrderIds, setUnacknowledgedOrderIds] = useState<number[]>([]);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const pendingOrderIdsRef = useRef(new Set<number>());
  const orderEventVersionRef = useRef(0);
  const orderStatusByIdRef = useRef(new Map<number, { status: string; acknowledged: boolean; version: number }>());
  const eventSourceRef = useRef<EventSource | null>(null);
  const alarmActive = soundEnabled && unacknowledgedOrderIds.length > 0;

  useEffect(() => {
    if (!admin || !soundEnabled) return;
    const unlockFromGesture = () => {
      unlockKitchenOrderAudio();
      window.removeEventListener('pointerdown', unlockFromGesture);
      window.removeEventListener('keydown', unlockFromGesture);
    };
    window.addEventListener('pointerdown', unlockFromGesture);
    window.addEventListener('keydown', unlockFromGesture);
    return () => {
      window.removeEventListener('pointerdown', unlockFromGesture);
      window.removeEventListener('keydown', unlockFromGesture);
    };
  }, [admin, soundEnabled]);

  useEffect(() => {
    if (!alarmActive) return;
    playKitchenOrderChime();

    let repeat: number | undefined;
    const firstReminder = window.setTimeout(() => {
      if (!soundEnabledRef.current || pendingOrderIdsRef.current.size === 0) return;
      playKitchenOrderChime();
      repeat = window.setInterval(() => {
        if (soundEnabledRef.current && pendingOrderIdsRef.current.size > 0) playKitchenOrderChime();
      }, 60_000);
    }, 30_000);

    return () => {
      window.clearTimeout(firstReminder);
      if (repeat !== undefined) window.clearInterval(repeat);
    };
  }, [alarmActive]);

  function toggleSound() {
    if (soundEnabledRef.current && pendingOrderIdsRef.current.size > 0) return;
    const next = !soundEnabledRef.current;
    soundEnabledRef.current = next;
    setSoundEnabled(next);
    localStorage.setItem('mayford_admin_sound', next ? '1' : '0');
    if (next) unlockKitchenOrderAudio();
  }

  function syncPendingOrderIds(nextIds: Set<number>) {
    const next = Array.from(nextIds).sort((a, b) => a - b);
    const current = Array.from(pendingOrderIdsRef.current).sort((a, b) => a - b);
    if (next.length === current.length && next.every((id, index) => id === current[index])) return;
    pendingOrderIdsRef.current = new Set(next);
    setUnacknowledgedOrderIds(next);
    if (next.length === 0) stopKitchenOrderChime();
  }

  function recordOrderStatus(orderIdInput: unknown, statusInput: unknown, notificationStatusInput?: unknown) {
    const orderId = Number(orderIdInput);
    const status = String(statusInput || '').trim();
    if (!Number.isSafeInteger(orderId) || orderId <= 0 || !status) return;

    const wasAlreadyPending = pendingOrderIdsRef.current.has(orderId);
    const alarmWasAlreadyActive = soundEnabledRef.current && pendingOrderIdsRef.current.size > 0;
    const isPending = status.toLowerCase() === 'pending';
    const acknowledged = !isPending || String(notificationStatusInput || '').toLowerCase() === 'seen';
    const version = ++orderEventVersionRef.current;
    orderStatusByIdRef.current.set(orderId, { status, acknowledged, version });
    const pending = new Set(pendingOrderIdsRef.current);
    if (isPending && !acknowledged) pending.add(orderId);
    else {
      pending.delete(orderId);
      setToasts((current) => current.filter((toast) => toast.orderId !== orderId));
    }
    syncPendingOrderIds(pending);
    if (isPending && !acknowledged && !wasAlreadyPending && alarmWasAlreadyActive) playKitchenOrderChime();
  }

  function recordOrderAcknowledgement(orderIdInput: unknown) {
    const orderId = Number(orderIdInput);
    if (!Number.isSafeInteger(orderId) || orderId <= 0) return;

    const version = ++orderEventVersionRef.current;
    orderStatusByIdRef.current.set(orderId, { status: 'Pending', acknowledged: true, version });
    const pending = new Set(pendingOrderIdsRef.current);
    pending.delete(orderId);
    setToasts((current) => current.filter((toast) => toast.orderId !== orderId));
    syncPendingOrderIds(pending);
  }

  const refreshPendingOrders = async () => {
    const requestVersion = orderEventVersionRef.current;
    try {
      const response = await api.get<{ orders: Array<Record<string, any>> }>('/admin/orders/unacknowledged');
      const serverPending = new Set(
        (response.orders || [])
          .map((order) => Number(order.id))
          .filter((id) => Number.isSafeInteger(id) && id > 0)
      );
      const candidates = new Set([...serverPending, ...pendingOrderIdsRef.current]);
      const next = new Set<number>();
      for (const id of candidates) {
        const latestEvent = orderStatusByIdRef.current.get(id);
        if (latestEvent && latestEvent.version > requestVersion) {
          if (latestEvent.status.toLowerCase() === 'pending' && !latestEvent.acknowledged) next.add(id);
        } else if (serverPending.has(id)) {
          next.add(id);
        }
      }
      syncPendingOrderIds(next);

      // Once a snapshot includes an event's database update, its temporary race-protection entry is no longer needed.
      for (const [id, event] of orderStatusByIdRef.current) {
        if (event.version <= requestVersion) orderStatusByIdRef.current.delete(id);
      }

      for (const order of response.orders || []) {
        const id = Number(order.id);
        if (!next.has(id)) continue;
        pushToast({
          id: `ord-${id}-pending`,
          orderId: id,
          title: `New Order #${id} (${order.outlet})`,
          subtitle: `${order.customer_name || 'Guest'} · ${ghs(order.total)} · ${order.order_type || 'Order'}`,
          linkTo: `/admin/orders?search=${id}`,
          type: 'order',
        });
      }
    } catch {
      /* live order events still work if the initial pending-order snapshot is unavailable */
    }
  };

  async function acknowledgeOrder(orderId: number) {
    setBusyOrderId(orderId);
    try {
      await api.post(`/admin/orders/${orderId}/acknowledge`);
      recordOrderAcknowledgement(orderId);
      refreshNotifications();
    } catch (err) {
      pushToast({
        id: `acknowledge-error-${orderId}-${Date.now()}`,
        title: `Could not acknowledge Order #${orderId}`,
        subtitle: (err as Error).message || 'Please open Customer Orders and try again.',
        linkTo: `/admin/orders?search=${orderId}`,
        type: 'general',
      });
    } finally {
      setBusyOrderId(null);
    }
  }

  async function acceptOrder(orderId: number) {
    setBusyOrderId(orderId);
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status: 'Preparing' });
      recordOrderStatus(orderId, 'Preparing');
      refreshNotifications();
    } catch (err) {
      pushToast({
        id: `accept-error-${orderId}-${Date.now()}`,
        title: `Could not accept Order #${orderId}`,
        subtitle: (err as Error).message || 'Please open Customer Orders and try again.',
        linkTo: `/admin/orders?search=${orderId}`,
        type: 'general',
      });
    } finally {
      setBusyOrderId(null);
    }
  }

  const refreshNotifications = () => {
    api
      .get<{ orders: number; applications: number; messages: number }>('/admin/notifications')
      .then((d) => setNotifications(d))
      .catch(() => undefined);
  };

  function pushToast(toast: LiveToastAlert) {
    setToasts((prev) => [
      toast,
      ...prev.filter((current) => current.id !== toast.id && (!toast.orderId || current.orderId !== toast.orderId)).slice(0, 4),
    ]);
    if (toast.type !== 'order') {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 8000);
    }
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
          void refreshPendingOrders();
        };

        es.onmessage = (e) => {
          try {
            const parsed = JSON.parse(e.data) as LiveEventPayload;
            setLastEvent(parsed);

            if (parsed.type === 'order_created') {
              const ord = parsed.data;
              const orderId = Number(ord.id);
              recordOrderStatus(orderId, ord.status || 'Pending', ord.notification_status || 'new');
              if (String(ord.status || 'Pending').toLowerCase() === 'pending' && String(ord.notification_status || 'new').toLowerCase() !== 'seen') {
                pushToast({
                  id: `ord-${orderId}-pending`,
                  orderId,
                  title: `New Order #${orderId} (${ord.outlet})`,
                  subtitle: `${ord.customer_name || 'Guest'} · ${ghs(ord.total)} · ${ord.order_type}`,
                  linkTo: `/admin/orders?search=${orderId}`,
                  type: 'order',
                });
              }
              refreshNotifications();
            } else if (parsed.type === 'application_created') {
              const app = parsed.data;
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
            } else if (parsed.type === 'order_acknowledged') {
              recordOrderAcknowledgement(parsed.data?.id);
              refreshNotifications();
            } else if (parsed.type === 'order_status_updated' || parsed.type === 'order_updated') {
              const orderId = Number(parsed.data?.id);
              const orderStatus = String(parsed.data?.status || '').trim();
              if (orderStatus) {
                recordOrderStatus(orderId, orderStatus, parsed.data?.notification_status);
                if (orderStatus.toLowerCase() === 'pending' && String(parsed.data?.notification_status || 'new').toLowerCase() !== 'seen') {
                  pushToast({
                    id: `ord-${orderId}-pending`,
                    orderId,
                    title: `Order #${orderId} needs acceptance`,
                    subtitle: `${parsed.data?.customer_name || 'Guest'} · ${parsed.data?.order_type || 'Order'}`,
                    linkTo: `/admin/orders?search=${orderId}`,
                    type: 'order',
                  });
                }
              }
              refreshNotifications();
            } else if (parsed.type === 'order_payment_updated') {
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
  }, [admin]);

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
          <SmartImage
            src="/assets/images/logo.png"
            alt="Mayford Foods"
            sizes="36px"
            eager
            className="h-9 w-9 rounded-md object-cover"
          />
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
                        <span>{i.to === '/admin/orders' && admin?.role !== 'super_admin' ? 'Branch Orders' : i.label}</span>
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
        <div className="fixed left-4 right-4 top-16 z-[100] mx-auto flex w-auto max-w-sm flex-col gap-2.5 pointer-events-none sm:left-auto sm:mx-0 sm:w-full">
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
                      className="mt-2 inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[10px] font-bold text-[#111111] hover:bg-neutral-200"
                    >
                      <span>View Record</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  )}
                  {t.type === 'order' && t.orderId && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={busyOrderId !== null}
                        onClick={() => void acknowledgeOrder(t.orderId!)}
                        className="inline-flex items-center gap-1 rounded bg-neutral-200 px-2 py-1 text-[10px] font-bold text-[#111111] hover:bg-white disabled:cursor-wait disabled:opacity-70"
                      >
                        {busyOrderId === t.orderId ? 'Saving…' : 'Acknowledge'}
                      </button>
                      <button
                        type="button"
                        disabled={busyOrderId !== null}
                        onClick={() => void acceptOrder(t.orderId!)}
                        className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[10px] font-bold text-[#111111] hover:bg-neutral-200 disabled:cursor-wait disabled:opacity-70"
                      >
                        {busyOrderId === t.orderId ? 'Saving…' : 'Accept · Start Preparing'}
                      </button>
                    </div>
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
        <div className="min-w-0 lg:pl-64">
          {/* Top Real-Time Status Header */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 text-[#111111] lg:hidden"
              >
                <MenuIcon className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] sm:inline">
                  {prettyRole(admin?.role || '')} Workspace
                </span>
                <span
                  role="img"
                  aria-label={connected ? 'Live updates connected' : 'Reconnecting to live updates'}
                  className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`}
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {/* Sound Alert Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                disabled={alarmActive}
                aria-pressed={soundEnabled}
                aria-label={
                  alarmActive
                    ? `${unacknowledgedOrderIds.length} pending order alerts. Accept or acknowledge the orders to stop the chime.`
                    : soundEnabled ? 'Mute order chime' : 'Enable order chime'
                }
                title={
                  alarmActive
                    ? 'Accept or acknowledge every pending order to stop the chime.'
                    : soundEnabled ? 'Order Bell Sound: ON (Click to mute)' : 'Order Bell Sound: OFF (Click to unmute)'
                }
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                  soundEnabled
                    ? 'border-neutral-300 bg-white text-[#111111] hover:border-[#111111] disabled:hover:border-neutral-300'
                    : 'border-neutral-200 bg-neutral-100 text-neutral-400'
                }`}
              >
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-emerald-600" /> : <VolumeX className="h-3.5 w-3.5 text-neutral-400" />}
                <span className="hidden sm:inline">
                  {alarmActive ? `Alerting ${unacknowledgedOrderIds.length}` : soundEnabled ? 'Chime ON' : 'Muted'}
                </span>
              </button>

              {admin?.role === 'super_admin' && (
                <Link
                  to="/admin/menu"
                  className="hidden items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#111111] sm:inline-flex"
                >
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  <span>Manage Foods</span>
                </Link>
              )}

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

          <main className="mx-auto w-full min-w-0 max-w-7xl p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </LiveContext.Provider>
  );
}
