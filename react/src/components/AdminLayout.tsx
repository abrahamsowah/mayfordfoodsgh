import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ChefHat,
  ClipboardList,
  Clapperboard,
  FolderOpen,
  GraduationCap,
  Heart,
  Images,
  LayoutDashboard,
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
  type LucideIcon,
} from 'lucide-react';
import { api } from '../api';
import type { Admin } from '../types';
import { Spinner } from './ui';

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
  if (loading) return <div className="min-h-screen bg-gray-100"><Spinner /></div>;
  if (!admin) return <NavigateToLogin />;
  return <SessionContext.Provider value={{ admin, loading, refresh }}>{children}</SessionContext.Provider>;
}

function NavigateToLogin() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <p className="mb-4 text-lg font-semibold text-gray-700">Admin login required.</p>
        <Link to="/admin/login" className="rounded bg-mayford px-6 py-3 font-bold text-white">
          Go to Admin Login
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

const NAV: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/orders', label: 'Customer Orders', icon: ClipboardList },
  { to: '/admin/menu', label: 'Menu Items', icon: UtensilsCrossed },
  { to: '/admin/categories', label: 'Categories', icon: FolderOpen },
  { to: '/admin/discounts', label: 'Discounts', icon: Tags },
  { to: '/admin/adverts', label: 'Advertisements', icon: Megaphone },
  { to: '/admin/banners', label: 'Banner Messages', icon: ScrollText },
  { to: '/admin/slides', label: 'Hero Slides', icon: Images },
  { to: '/admin/videos', label: 'Ad Videos', icon: Clapperboard },
  { to: '/admin/community', label: 'Community Media', icon: Heart },
  { to: '/admin/catering-bookings', label: 'Catering Bookings', icon: ChefHat },
  { to: '/admin/ratings', label: 'Ratings', icon: Star },
  { to: '/admin/contact-messages', label: 'Contact Messages', icon: Mail, superOnly: true },
  { to: '/admin/training-applications', label: 'Training Applications', icon: GraduationCap },
  { to: '/admin/settings', label: 'Website Settings', icon: Settings },
];

export function AdminLayout() {
  const { admin } = useAdminSession();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    navigate('/admin/login');
  }

  const items = NAV.filter((i) => !i.superOnly || admin?.role === 'super_admin');

  const sidebar = (
    <div className="flex h-full flex-col bg-mayford text-white">
      <div className="p-5">
        <Link to="/admin/dashboard" className="flex items-center gap-2">
          <img src="/assets/images/logo.png" alt="" className="h-10 w-10 rounded-full object-cover" />
          <div>
            <p className="text-sm font-bold leading-tight">Mayford Foods</p>
            <p className="text-xs opacity-70">Admin Panel</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto">
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `block border-l-4 px-5 py-3 text-sm font-bold transition ${
                isActive ? 'border-white bg-mayford-dark pl-7' : 'border-transparent hover:bg-mayford-dark hover:pl-7'
              }`
            }
          >
            <i.icon className="mr-2 h-4 w-4 shrink-0" />
            {i.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/20 p-4">
        <p className="mb-2 flex items-center truncate text-xs opacity-80">
          <User className="mr-2 h-3.5 w-3.5 shrink-0" />
          {admin?.name}
        </p>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded bg-mayford-dark px-4 py-2 text-sm font-bold hover:bg-black/40"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile top bar */}
      <div className="flex items-center gap-3 bg-mayford-dark px-4 py-3 text-white lg:hidden">
        <button type="button" aria-label="Toggle sidebar" onClick={() => setSidebarOpen((v) => !v)} className="p-1">
          <MenuIcon className="h-6 w-6" />
        </button>
        <span className="font-bold">Admin Panel</span>
      </div>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute left-0 top-0 h-full w-64" onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 lg:block">{sidebar}</aside>

      <div className="p-4 lg:ml-64 lg:p-8">{<Outlet />}</div>
    </div>
  );
}
