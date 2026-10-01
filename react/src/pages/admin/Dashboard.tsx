import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ChevronRight,
  BellRing,
  ChefHat,
  GraduationCap,
  LayoutDashboard,
  Mail,
  Megaphone,
  Receipt,
  RefreshCcw,
  ShieldCheck,
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

interface WeekAnalytics {
  daily_sales: { date: string; orders: number; revenue: number }[];
  traffic?: { daily: { date: string; views: number; visitors: number }[] };
}

export default function AdminDashboard() {
  const { admin } = useAdminSession();
  const [stats, setStats] = useState<DashStats | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [week, setWeek] = useState<WeekAnalytics | null>(null);
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

  const loadWeek = useCallback(async () => {
    try {
      const d = await api.get<{ analytics: WeekAnalytics }>('/admin/analytics?range=7d');
      setWeek({ daily_sales: d.analytics.daily_sales || [], traffic: d.analytics.traffic });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadStats();
    void loadOrders();
    void loadWeek();
  }, [loadStats, loadOrders, loadWeek]);

  // Notification polling (original check-notifications.php loop)
  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const d = await api.get<{ orders: number; applications: number; messages: number; pending_payments?: number }>('/admin/notifications');
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
    const typed = window.prompt('This permanently deletes ALL orders and order history.\nFinancial payment records are kept.\n\nType RESET to confirm:');
    if (typed !== 'RESET') return;
    try {
      const res = await api.del<{ deleted: number }>('/admin/orders?confirm=RESET');
      pushToast(`${res.deleted} order(s) cleared`);
      await loadStats();
      await loadOrders();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  const isSuper = admin?.role === 'super_admin';

  const statCards = [
    {
      label: 'Revenue (paid)',
      value: stats ? ghs(stats.paid_revenue ?? stats.revenue) : '—',
      icon: Wallet,
      tone: 'brand' as const,
      hint: `${ghs(stats?.today_paid_revenue || 0)} settled today`,
      to: '/admin/analytics',
    },
    {
      label: "Today's orders",
      value: stats?.today_orders !== undefined ? String(stats.today_orders) : '—',
      icon: Receipt,
      tone: 'flame' as const,
      hint: `${stats?.in_progress_orders ?? 0} in progress now`,
      to: '/admin/orders',
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
      hint: `${stats?.today_visitors ?? 0} visitors today`,
      to: '/admin/analytics',
    },
    {
      label: 'Customer accounts',
      value: stats?.customers !== undefined ? String(stats.customers) : '—',
      icon: Users,
      tone: 'light' as const,
      hint: 'Registered customers',
      to: '/admin/customers',
      superOnly: true,
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
      label: 'Customer ratings',
      value: stats?.ratings_count !== undefined ? String(stats.ratings_count) : '—',
      icon: Star,
      tone: 'light' as const,
      hint: stats?.ratings_average
        ? `${stats.ratings_average.toFixed(1)} average score`
        : 'No feedback yet',
      to: '/admin/ratings',
    },
  ].filter((c) => !c.superOnly || isSuper);

  const weekRows = week?.daily_sales || [];
  const weekMax = Math.max(1, ...weekRows.map((d) => Number(d.revenue) || 0));
  const weekRevenue = weekRows.reduce((sum, d) => sum + (Number(d.revenue) || 0), 0);
  const weekOrders = weekRows.reduce((sum, d) => sum + (Number(d.orders) || 0), 0);
  const weekVisits = (week?.traffic?.daily || []).reduce((sum, d) => sum + (Number(d.views) || 0), 0);

  const quickActions = [
    { to: '/admin/analytics', label: 'View analytics', icon: TrendingUp },
    { to: '/admin/audit-logs', label: 'Audit log', icon: ShieldCheck },
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
                void loadWeek();
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

      {/* Stats — one hairline grid, no card chrome */}
      <div className="grid divide-y divide-ink-100 overflow-hidden rounded-card border border-ink-100 bg-white sm:grid-cols-2 sm:divide-x xl:grid-cols-5">
        {statCards.map((s, i) => {
          const inner = (
            <>
              <p className="text-[11px] font-medium text-ink-400">{s.label}</p>
              <p className="mt-3 text-2xl font-semibold leading-none tabular-nums tracking-[-0.02em] text-ink-900">
                {s.value}
              </p>
              <p className="mt-2 text-[13px] text-ink-500">{s.hint}</p>
            </>
          );
          // Hairline grid: every row after the first gets its own top rule.
          const cls = `group block px-5 py-5 transition-colors hover:bg-ink-50 ${
            i >= 5 ? 'border-t border-ink-100' : ''
          }`;
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
        <div className="space-y-6">
        <Panel
          title="Latest orders"
          subtitle="The six most recent orders across your outlets"
          icon={Receipt}
          padded={false}
          action={
            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-mayford-700 transition hover:gap-2.5"
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
                <tr key={o.id} className="transition hover:bg-ink-50">
                  <Td>
                    <p className="font-semibold text-ink-900">{o.customer_name}</p>
                    <p className="text-[12px] text-ink-400">{o.phone}</p>
                  </Td>
                  <Td>{o.outlet}</Td>
                  <Td>
                    <StatusPill status={o.status} />
                  </Td>
                  <Td className="text-right font-semibold tabular-nums text-ink-900">{ghs(o.total)}</Td>
                  <Td className="whitespace-nowrap text-[13px]">
                    {String(o.order_date).slice(0, 16).replace('T', ' ')}
                  </Td>
                </tr>
              ))
            )}
          </DataTable>
        </Panel>

          {/* Last 7 days — revenue and traffic at a glance */}
          <Panel title="Last 7 days" subtitle="Revenue and site traffic" icon={TrendingUp} padded={false}>
            <div className="border-b border-ink-100 px-5 py-4">
              <div className="flex flex-wrap gap-x-10 gap-y-3">
                <div>
                  <p className="text-[11px] font-medium text-ink-400">Revenue</p>
                  <p className="mt-1 text-[18px] font-semibold tabular-nums text-ink-900">{ghs(weekRevenue)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-ink-400">Orders</p>
                  <p className="mt-1 text-[18px] font-semibold tabular-nums text-ink-900">{weekOrders}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-ink-400">Page views</p>
                  <p className="mt-1 text-[18px] font-semibold tabular-nums text-ink-900">{weekVisits.toLocaleString()}</p>
                </div>
              </div>
            </div>
            {weekRows.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-ink-400">No sales recorded in the last seven days.</p>
            ) : (
              <>
                <div className="flex items-end gap-2 px-5 pt-5">
                  {weekRows.map((d) => {
                    const revenue = Number(d.revenue) || 0;
                    const height = revenue > 0 ? Math.max(4, Math.round((revenue / weekMax) * 100)) : 0;
                    return (
                      <div
                        key={d.date}
                        className="flex h-24 flex-1 items-end"
                        title={`${d.date} · ${ghs(revenue)} · ${d.orders} order${d.orders === 1 ? '' : 's'}`}
                      >
                        <div className="w-full bg-mayford-600" style={{ height: `${height}%` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="mx-5 mt-2 border-t border-ink-100" />
                <div className="flex gap-2 px-5 pb-4 pt-2">
                  {weekRows.map((d) => (
                    <p key={d.date} className="flex-1 text-center text-[11px] font-medium text-ink-400">
                      {d.date.slice(8)}
                    </p>
                  ))}
                </div>
              </>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          {/* Quick actions */}
          <Panel title="Quick actions" subtitle="Jump straight to the task you need" icon={Megaphone} padded={false}>
            <div className="divide-y divide-ink-100">
              {quickActions.map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-ink-50"
                >
                  <a.icon className="h-[18px] w-[18px] shrink-0 text-ink-500" strokeWidth={1.9} />
                  <span className="text-[14px] font-medium text-ink-900">{a.label}</span>
                  <ChevronRight className="ml-auto h-4 w-4 text-ink-300 transition-colors group-hover:text-ink-500" strokeWidth={2} />
                </Link>
              ))}
            </div>
          </Panel>

          {/* Super admin tools */}
          {isSuper && (
            <Panel title="Super admin" subtitle="Actions that affect the whole account" icon={Users} padded={false}>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-ink-900">Reset all orders</p>
                  <p className="mt-0.5 text-[13px] text-ink-500">
                    Deletes every order from the database. This cannot be undone.
                  </p>
                </div>
                <Button variant="danger" size="sm" onClick={resetRevenue}>
                  Reset
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
            className="animate-pop flex items-center gap-3 rounded-card bg-ink-900 px-4 py-3 text-[14px] font-semibold text-white"
          >
            <BellRing className="h-4 w-4 text-mayford-600" strokeWidth={2.4} />
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
