import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ChefHat,
  Clapperboard,
  ExternalLink,
  FolderOpen,
  GraduationCap,
  Heart,
  Images,
  History,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Menu as MenuIcon,
  Receipt,
  ScrollText,
  Settings as SettingsIcon,
  Users,
  ShieldCheck,
  Star,
  Tags,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../api';
import type { Admin } from '../types';
import { Button, IconTile, Spinner } from './ui';

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

/** Guards all /admin/* pages (original session check in dashboard.php & co.) */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { admin, loading, refresh } = useSession();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <Spinner className="py-0" />
      </div>
    );
  }
  if (!admin) return <NavigateToLogin />;
  return <SessionContext.Provider value={{ admin, loading, refresh }}>{children}</SessionContext.Provider>;
}

function NavigateToLogin() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 p-4">
      <div className="w-full max-w-sm rounded-card border border-ink-200 bg-white p-8 text-center">
        <IconTile icon={ShieldCheck} tone="brand" size="lg" className="mx-auto" />
        <h1 className="mt-5 text-lg font-extrabold tracking-tight text-ink-900">Admin login required</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">
          Your session has ended. Sign in again to manage the website.
        </p>
        <Link
          to="/admin/login"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-tile bg-mayford-600 px-6 text-sm font-bold text-white transition hover:bg-mayford-700"
        >
          Go to admin login
        </Link>
      </div>
    </div>
  );
}

export function prettyRole(role: string): string {
  return role.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  superOnly?: boolean;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admin/orders', label: 'Orders', icon: Receipt },
      { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/admin/customers', label: 'Customers', icon: Users, superOnly: true },
      { to: '/admin/audit-logs', label: 'Audit log', icon: History },
    ],
  },
  {
    title: 'Shop',
    items: [
      { to: '/admin/menu', label: 'Menu items', icon: UtensilsCrossed },
      { to: '/admin/categories', label: 'Categories', icon: FolderOpen },
      { to: '/admin/discounts', label: 'Discounts', icon: Tags },
    ],
  },
  {
    title: 'Website content',
    items: [
      { to: '/admin/adverts', label: 'Advertisements', icon: Megaphone },
      { to: '/admin/banners', label: 'Banner messages', icon: ScrollText },
      { to: '/admin/slides', label: 'Hero slides', icon: Images },
      { to: '/admin/videos', label: 'Ad videos', icon: Clapperboard },
      { to: '/admin/community', label: 'Community media', icon: Heart },
    ],
  },
  {
    title: 'Customers',
    items: [
      { to: '/admin/catering-bookings', label: 'Catering bookings', icon: ChefHat },
      { to: '/admin/training-applications', label: 'Training applications', icon: GraduationCap },
      { to: '/admin/ratings', label: 'Ratings', icon: Star },
      { to: '/admin/contact-messages', label: 'Contact messages', icon: Mail, superOnly: true },
    ],
  },
  {
    title: 'System',
    items: [{ to: '/admin/settings', label: 'Website settings', icon: SettingsIcon }],
  },
];

export function AdminLayout() {
  const { admin } = useAdminSession();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // Notifications badge (same endpoint the dashboard polls)
  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const d = await api.get<{ orders: number; applications: number; messages: number }>('/admin/notifications');
        if (!stop) setUnread(d.orders + d.applications + d.messages);
      } catch {
        /* ignore */
      }
    };
    void poll();
    const t = setInterval(poll, 15000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    navigate('/admin/login');
  }

  const isSuper = admin?.role === 'super_admin';

  const sidebar = (
    <div className="flex h-full flex-col bg-ink-950 text-ink-300">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <img src="/assets/images/logo.png" alt="" className="h-9 w-9 rounded-tile object-cover ring-1 ring-white/15" />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-extrabold text-white">Mayford Foods</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mayford-600">Admin console</p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((g) => {
          const items = g.items.filter((i) => !i.superOnly || isSuper);
          if (items.length === 0) return null;
          return (
            <div key={g.title} className="mb-5">
              <p className="mb-1.5 px-3 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-ink-600">
                {g.title}
              </p>
              <ul className="space-y-0.5">
                {items.map((i) => (
                  <li key={i.to}>
                    <NavLink
                      to={i.to}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-tile px-3 py-2.5 text-[13.5px] font-bold transition ${
                          isActive ? 'bg-ink-800 text-white' : 'text-ink-400 hover:bg-ink-800 hover:text-white'
                        }`
                      }
                    >
                      <i.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2.1} />
                      <span className="truncate">{i.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-tile bg-ink-800 text-[13px] font-extrabold text-white">
            {(admin?.name || '?').charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-white">{admin?.name}</p>
            <p className="truncate text-[11px] font-semibold text-mayford-600">{prettyRole(admin?.role || '')}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Link
            to="/"
            className="flex h-9 flex-1 items-center justify-center gap-2 rounded-tile border border-white/10 text-[12.5px] font-bold text-ink-300 transition hover:bg-ink-800 hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.3} /> Website
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex h-9 flex-1 items-center justify-center gap-2 rounded-tile bg-mayford-600 text-[12.5px] font-bold text-white transition hover:bg-mayford-700"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={2.3} /> Logout
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/10 bg-ink-950 px-4 py-3 text-white lg:hidden">
        <button type="button" aria-label="Toggle sidebar" onClick={() => setSidebarOpen((v) => !v)} className="p-1">
          <MenuIcon className="h-5 w-5" strokeWidth={2.2} />
        </button>
        <span className="text-[13.5px] font-extrabold">Mayford admin</span>
        <div className="ml-auto flex items-center gap-2">
          {unread > 0 && <span className="h-2 w-2 rounded-full bg-mayford-600" />}
          <span className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-mayford-600">
            {prettyRole(admin?.role || '')}
          </span>
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-ink-950/60" />
          <div className="absolute inset-y-0 left-0 w-[80%] max-w-xs" onClick={(e) => e.stopPropagation()}>
            {sidebar}
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
              className="absolute -right-12 top-4 flex h-10 w-10 items-center justify-center rounded-tile bg-ink-800 text-white"
            >
              <X className="h-5 w-5" strokeWidth={2.3} />
            </button>
          </div>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>

      {/* Desktop top bar */}
      <div className="sticky top-0 z-30 hidden items-center gap-4 border-b border-ink-200 bg-white/90 px-8 py-3 lg:flex lg:pl-72">
        <p className="text-[13px] font-semibold text-ink-500">
          Signed in as <span className="font-extrabold text-ink-900">{admin?.name}</span>
        </p>
        <div className="ml-auto flex items-center gap-3">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-tile border border-ink-200 text-ink-500">
            <Bell className="h-[18px] w-[18px]" strokeWidth={2.1} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-tile bg-mayford-600 px-1 text-[10.5px] font-extrabold text-white">
                {unread}
              </span>
            )}
          </span>
          <Button variant="outline" size="sm" icon={ExternalLink} onClick={() => navigate('/')}>
            View website
          </Button>
        </div>
      </div>

      <div className="px-4 py-6 lg:pl-72 lg:pr-8">
        <div className="mx-auto max-w-[95rem]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
