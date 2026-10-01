import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BellRing,
  ChefHat,
  GraduationCap,
  LayoutDashboard,
  Mail,
  Megaphone,
  Receipt,
  RefreshCcw,
  Star,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import { api } from '../../api';
import { useAdminSession, prettyRole } from '../../components/AdminLayout';
import type { DashStats, Order } from '../../types';
import { ghs } from '../../utils';
import {
  Badge,
  Button,
  DataTable,
  EmptyRow,
  IconTile,
  Panel,
  StatusPill,
  Td,
  Th,
  PageHeader,
} from '../../components/ui';

interface Toast {
  id: number;
  text: string;
}

export default function AdminDashboard() {
  const { admin } = useAdminSession();
  const [stats, setStats] = useState<DashStats | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const soundRef = useRef<HTMLAudioElement | null>(null);
  const notified = useRef({ orders: false, applications: false, messages: false });
  const toastId = useRef(0);

  useEffect(() => {
    soundRef.current = new Audio('/assets/sounds/notification.wav');
  }, []);

  const pushToast = useCallback((text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
    try {
      if (soundRef.current) {
        soundRef.current.currentTime = 0;
        void soundRef.current.play().catch(() => undefined);
      }
    } catch {
      /* audio blocked until first user interaction */
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const d = await api.get<{ role: string; stats: DashStats }>('/admin/stats');
      setStats(d.stats);
    } catch {
      /* ignore */
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const d = await api.get<{ orders: Order[] }>('/admin/orders');
      setOrders(d.orders.slice(0, 6));
    } catch {
      setOrders([]);
    }
  }, []);

  useEffect(() => {
    void loadStats();
    void loadOrders();
  }, [loadStats, loadOrders]);

  // Notification polling (original check-notifications.php loop)
  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const d = await api.get<{ orders: number; applications: number; messages: number }>('/admin/notifications');
        if (stop) return;
        if (d.orders > 0 && !notified.current.orders) {
          notified.current.orders = true;
          pushToast('New order received');
        }
        if (d.applications > 0 && !notified.current.applications) {
          notified.current.applications = true;
          pushToast('New training application received');
        }
        if (d.messages > 0 && !notified.current.messages) {
          notified.current.messages = true;
          pushToast('New contact message received');
        }
        if (d.orders === 0) notified.current.orders = false;
        if (d.applications === 0) notified.current.applications = false;
        if (d.messages === 0) notified.current.messages = false;
      } catch {
        /* ignore */
      }
    }
    void poll();
    const t = setInterval(poll, 5000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [pushToast]);

  async function resetRevenue() {
    if (!confirm('Reset all orders and revenue?')) return;
    try {
      await api.del('/admin/orders');
      await loadStats();
      await loadOrders();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  const isSuper = admin?.role === 'super_admin';

  const statCards = [
    {
      label: 'Total revenue',
      value: stats ? ghs(stats.revenue) : '—',
      icon: Wallet,
      tone: 'brand' as const,
      hint: 'All confirmed orders',
    },
    {
      label: 'Pending orders',
      value: stats ? String(stats.pending_orders) : '—',
      icon: Receipt,
      tone: 'flame' as const,
      hint: 'Waiting on the kitchen',
      to: '/admin/orders',
    },
    {
      label: 'Completed orders',
      value: stats ? String(stats.completed_orders) : '—',
      icon: TrendingUp,
      tone: 'success' as const,
      hint: 'Served and closed',
      to: '/admin/orders',
    },
    {
      label: 'Catering bookings',
      value: stats?.catering_bookings !== undefined ? String(stats.catering_bookings) : '—',
      icon: ChefHat,
      tone: 'dark' as const,
      hint: 'Event enquiries',
      to: '/admin/catering-bookings',
    },
    {
      label: 'Training applications',
      value: stats?.training_applications !== undefined ? String(stats.training_applications) : '—',
      icon: GraduationCap,
      tone: 'light' as const,
      hint: 'Academy intake',
      to: '/admin/training-applications',
    },
    {
      label: 'Website visits',
      value: stats?.total_visitors !== undefined ? stats.total_visitors.toLocaleString() : '—',
      icon: Users,
      tone: 'light' as const,
      hint: 'All time',
    },
    {
      label: 'Contact messages',
      value: stats?.contact_messages !== undefined ? String(stats.contact_messages) : '—',
      icon: Mail,
      tone: 'light' as const,
      hint: 'Super admin inbox',
      to: '/admin/contact-messages',
      superOnly: true,
    },
    {
      label: 'Ratings',
      value: 'View',
      icon: Star,
      tone: 'light' as const,
      hint: 'Customer feedback',
      to: '/admin/ratings',
    },
  ].filter((c) => !c.superOnly || isSuper);

  const quickActions = [
    { to: '/admin/menu', label: 'Add a menu item', icon: UtensilsCrossed },
    { to: '/admin/adverts', label: 'Publish an advert', icon: Megaphone },
    { to: '/admin/banners', label: 'Update banner text', icon: BellRing },
    { to: '/admin/settings', label: 'Website settings', icon: LayoutDashboard },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title={`Welcome back, ${admin?.name?.split(' ')[0] || 'admin'}`}
        subtitle={`Signed in as ${prettyRole(admin?.role || '')} · live orders and enquiries in one place`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCcw}
              onClick={() => {
                void loadStats();
                void loadOrders();
              }}
            >
              Refresh
            </Button>
            <Badge tone="success">
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-success-500" /> Live
            </Badge>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => {
          const inner = (
            <>
              <div className="flex items-start justify-between">
                <IconTile icon={s.icon} tone={s.tone} />
                {s.to && <ArrowUpRight className="h-4 w-4 text-ink-300 transition group-hover:text-ink-600" strokeWidth={2.4} />}
              </div>
              <p className="mt-4 text-[1.5rem] font-extrabold leading-none tabular-nums tracking-tight text-ink-900">
                {s.value}
              </p>
              <p className="mt-2 text-[13px] font-extrabold tracking-tight text-ink-700">{s.label}</p>
              <p className="mt-0.5 text-[12px] text-ink-400">{s.hint}</p>
            </>
          );
          const cls =
            'group rounded-card border border-ink-200 bg-white p-5 shadow-xs transition duration-300 hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-raised';
          return s.to ? (
            <Link key={s.label} to={s.to} className={cls}>
              {inner}
            </Link>
          ) : (
            <div key={s.label} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr] xl:items-start">
        {/* Recent orders */}
        <Panel
          title="Latest orders"
          subtitle="The six most recent orders across your outlets"
          icon={Receipt}
          padded={false}
          action={
            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-mayford-700 transition hover:gap-2.5"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            </Link>
          }
        >
          <DataTable
            minWidth="min-w-[640px]"
            head={
              <>
                <Th>Customer</Th>
                <Th>Outlet</Th>
                <Th>Status</Th>
                <Th className="text-right">Total</Th>
                <Th>Date</Th>
              </>
            }
          >
            {!orders ? (
              <EmptyRow colSpan={5} text="Loading orders…" />
            ) : orders.length === 0 ? (
              <EmptyRow colSpan={5} text="No orders yet — they will appear here as they come in." />
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="transition hover:bg-ink-50/70">
                  <Td>
                    <p className="font-bold text-ink-900">{o.customer_name}</p>
                    <p className="text-[12px] text-ink-400">{o.phone}</p>
                  </Td>
                  <Td>{o.outlet}</Td>
                  <Td>
                    <StatusPill status={o.status} />
                  </Td>
                  <Td className="text-right font-extrabold tabular-nums text-ink-900">{ghs(o.total)}</Td>
                  <Td className="whitespace-nowrap text-[12.5px]">
                    {String(o.order_date).slice(0, 16).replace('T', ' ')}
                  </Td>
                </tr>
              ))
            )}
          </DataTable>
        </Panel>

        <div className="space-y-6">
          {/* Quick actions */}
          <Panel title="Quick actions" subtitle="Jump straight to the task you need" icon={Megaphone}>
            <div className="grid gap-2">
              {quickActions.map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="flex items-center gap-3 rounded-tile border border-ink-200 px-3.5 py-3 transition hover:border-ink-300 hover:bg-ink-50"
                >
                  <IconTile icon={a.icon} tone="light" size="sm" />
                  <span className="text-[13.5px] font-bold text-ink-800">{a.label}</span>
                  <ArrowUpRight className="ml-auto h-4 w-4 text-ink-300" strokeWidth={2.4} />
                </Link>
              ))}
            </div>
          </Panel>

          {/* Super admin tools */}
          {isSuper && (
            <Panel title="Super admin" subtitle="Actions that affect the whole account" icon={Users}>
              <div className="rounded-tile border border-danger-100 bg-danger-50 p-4">
                <p className="text-[13px] font-extrabold text-danger-700">Reset revenue</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-danger-700/80">
                  Deletes every order from the database. This cannot be undone.
                </p>
                <Button variant="danger" size="sm" className="mt-3" onClick={resetRevenue}>
                  Reset all orders
                </Button>
              </div>
            </Panel>
          )}
        </div>
      </div>

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[80] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-pop flex items-center gap-3 rounded-card bg-ink-900 px-4 py-3 text-[13.5px] font-bold text-white shadow-pop"
          >
            <BellRing className="h-4 w-4 text-flame-400" strokeWidth={2.4} />
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
