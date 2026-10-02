import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bike,
  Building2,
  CheckCircle2,
  ChefHat,
  Clock,
  ClipboardList,
  CreditCard,
  Eye,
  Flame,
  MapPin,
  Phone,
  Plus,
  RotateCcw,
  Star,
  Store,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react';
import { api } from '../../api';
import { useAdminSession, useAdminLive } from '../../components/AdminLayout';
import type { DashStats } from '../../types';
import { formatNum, ghs } from '../../utils';

export default function AdminDashboard() {
  const { admin } = useAdminSession();
  const { lastEvent } = useAdminLive();
  const [stats, setStats] = useState<DashStats | null>(null);
  const [selectedOutletFilter, setSelectedOutletFilter] = useState<string>('');
  const [activeQueueTab, setActiveQueueTab] = useState<'pending' | 'preparing' | 'ready' | 'completed'>('pending');
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  const isSuper = admin?.role === 'super_admin';

  async function loadStats(outletParam = selectedOutletFilter) {
    try {
      const url = outletParam ? `/admin/stats?outlet=${encodeURIComponent(outletParam)}` : '/admin/stats';
      const d = await api.get<{ role: string; stats: DashStats }>(url);
      setStats(d.stats);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void loadStats(selectedOutletFilter);
  }, [selectedOutletFilter]);

  // Instant re-fetch whenever any event is broadcast via SSE
  useEffect(() => {
    if (lastEvent) {
      void loadStats(selectedOutletFilter);
    }
  }, [lastEvent, selectedOutletFilter]);

  // Periodic safeguard poll every 5s
  useEffect(() => {
    const t = setInterval(() => void loadStats(selectedOutletFilter), 5000);
    return () => clearInterval(t);
  }, [selectedOutletFilter]);

  async function updateOrderStatus(orderId: number, nextStatus: 'Preparing' | 'Ready' | 'Completed') {
    setUpdatingOrderId(orderId);
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status: nextStatus });
      await loadStats(selectedOutletFilter);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function resetRevenue() {
    if (!confirm('Reset all orders and revenue records?')) return;
    try {
      await api.del('/admin/orders');
      await loadStats(selectedOutletFilter);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  const branchName =
    admin?.role === 'adabraka_admin'
      ? 'Adabraka Branch'
      : admin?.role === 'dzorwulu_admin'
      ? 'Dzorwulu Branch'
      : selectedOutletFilter
      ? `${selectedOutletFilter} Branch`
      : 'All Branches (Enterprise HQ)';

  const branchPhone =
    admin?.role === 'adabraka_admin' || selectedOutletFilter === 'Adabraka'
      ? '0244143271'
      : admin?.role === 'dzorwulu_admin' || selectedOutletFilter === 'Dzorwulu'
      ? '0533634378'
      : '0244143271 / 0533634378';

  const recentOrders = stats?.recent_orders || [];
  const filteredQueueOrders = recentOrders.filter((o) => {
    if (activeQueueTab === 'pending') return (o.status || 'Pending') === 'Pending';
    if (activeQueueTab === 'preparing') return o.status === 'Preparing';
    if (activeQueueTab === 'ready') return o.status === 'Ready';
    if (activeQueueTab === 'completed') return o.status === 'Completed';
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Top Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-sm bg-[#111111] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              {isSuper ? 'Enterprise Super-Admin' : 'Branch Kitchen Station'}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
              <MapPin className="h-3.5 w-3.5 text-mayford-600" />
              <span>{branchName}</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-[#6B6B6B]">
              <Phone className="h-3 w-3" />
              <span>{branchPhone}</span>
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
            {isSuper ? 'Enterprise Headquarters & Multi-Branch Control' : `${branchName} Kitchen Console`}
          </h1>
          <p className="mt-1 text-xs text-[#6B6B6B]">
            {isSuper
              ? 'Multi-outlet aggregated performance, master menu management, and company-wide order analytics.'
              : `Order fulfillment queue, live kitchen dispatch, and catering inquiries for ${branchName}.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isSuper ? (
            <>
              <Link
                to="/admin/menu"
                className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-[#111111] transition-colors hover:border-[#111111]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Manage Foods</span>
              </Link>
              <Link
                to="/admin/orders"
                className="inline-flex items-center gap-2 rounded-md bg-[#111111] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#262626]"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>Manage All Orders</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/admin/orders"
                className="inline-flex items-center gap-2 rounded-md bg-[#111111] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#262626]"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>All Branch Orders</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>
      </div>

      {/* SUPER ADMIN MULTI-BRANCH SELECTOR STRIP */}
      {isSuper && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-neutral-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
              Branch View Filter:
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: '', label: 'All Outlets Combined (HQ)' },
              { id: 'Adabraka', label: 'Adabraka Branch' },
              { id: 'Dzorwulu', label: 'Dzorwulu Branch' },
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedOutletFilter(b.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selectedOutletFilter === b.id
                    ? 'bg-[#111111] text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BRANCH KITCHEN CONSOLE VIEW (For Branch Admins or Filtered Branch) */}
      {!isSuper ? (
        <div className="space-y-6">
          {/* Kitchen Queue Vitals */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600">New Incoming</span>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <p className="mt-3 text-3xl font-bold text-[#111111]">{stats?.pending_orders || 0}</p>
              <p className="mt-1 text-xs text-[#6B6B6B]">Orders awaiting chef confirmation</p>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">In Preparation</span>
                <Flame className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-3 text-3xl font-bold text-[#111111]">{stats?.preparing_orders || 0}</p>
              <p className="mt-1 text-xs text-[#6B6B6B]">Currently cooking on stove/wok</p>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Ready at Counter</span>
                <Bike className="h-4 w-4 text-purple-600" />
              </div>
              <p className="mt-3 text-3xl font-bold text-[#111111]">{stats?.ready_orders || 0}</p>
              <p className="mt-1 text-xs text-[#6B6B6B]">Packaged for rider pickup or customer</p>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Completed Today</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-3 text-3xl font-bold text-[#111111]">{stats?.completed_orders || 0}</p>
              <p className="mt-1 text-xs text-[#6B6B6B]">Successfully fulfilled meals</p>
            </div>
          </div>

          {/* Live Kitchen Fulfillment Queue Board */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="flex flex-col justify-between gap-4 border-b border-neutral-100 pb-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-[#111111]">Live Kitchen Fulfillment Board</h2>
                <p className="text-xs text-[#6B6B6B]">
                  Real-time incoming orders. Transition statuses directly as meals are prepared and dispatched.
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'pending', label: `Incoming (${stats?.pending_orders || 0})` },
                  { id: 'preparing', label: `Cooking (${stats?.preparing_orders || 0})` },
                  { id: 'ready', label: `Ready (${stats?.ready_orders || 0})` },
                  { id: 'completed', label: `Completed (${stats?.completed_orders || 0})` },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveQueueTab(t.id as any)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      activeQueueTab === t.id
                        ? 'bg-[#111111] text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredQueueOrders.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#6B6B6B]">
                No orders currently in <strong>{activeQueueTab}</strong> status for this station.
              </div>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {filteredQueueOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="flex flex-col justify-between rounded-lg border border-neutral-200 bg-[#F7F7F7] p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
                        <div>
                          <span className="font-mono text-sm font-bold text-[#111111]">Order #{ord.id}</span>
                          <span className="ml-2 rounded bg-neutral-200 px-2 py-0.5 text-[11px] font-semibold text-neutral-800">
                            {ord.order_type}
                          </span>
                        </div>
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                            ord.payment_status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ord.payment_status} ({ord.payment_method})
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs">
                        <p className="font-bold text-[#111111]">{ord.customer_name} · {ord.phone}</p>
                        {ord.address && (
                          <p className="text-neutral-600 flex items-start gap-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-neutral-500" />
                            <span>{ord.address} {ord.delivery_zone ? `(${ord.delivery_zone})` : ''}</span>
                          </p>
                        )}
                        <div className="mt-2 rounded bg-white p-2 border border-neutral-200 font-mono text-xs text-neutral-800 whitespace-pre-wrap">
                          {ord.order_details || `${ord.food_item} x ${ord.quantity}`}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3">
                      <span className="text-sm font-bold text-[#111111]">{ghs(ord.total)}</span>

                      <div className="flex items-center gap-2">
                        {ord.status === 'Pending' && (
                          <button
                            type="button"
                            disabled={updatingOrderId === ord.id}
                            onClick={() => updateOrderStatus(ord.id, 'Preparing')}
                            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
                          >
                            <Flame className="h-3.5 w-3.5" />
                            <span>Start Cooking</span>
                          </button>
                        )}
                        {ord.status === 'Preparing' && (
                          <button
                            type="button"
                            disabled={updatingOrderId === ord.id}
                            onClick={() => updateOrderStatus(ord.id, 'Ready')}
                            className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 transition-colors"
                          >
                            <Bike className="h-3.5 w-3.5" />
                            <span>Mark Ready</span>
                          </button>
                        )}
                        {ord.status === 'Ready' && (
                          <button
                            type="button"
                            disabled={updatingOrderId === ord.id}
                            onClick={() => updateOrderStatus(ord.id, 'Completed')}
                            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Mark Fulfilled</span>
                          </button>
                        )}
                        <Link
                          to={`/admin/orders?search=${ord.id}`}
                          className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-900"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* SUPER ADMIN EXECUTIVE DASHBOARD VIEW */
        <>
          {/* Row 1: Core Financial, Order & Traffic KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* KPI 1: Total Revenue */}
            <div className="flex flex-col justify-between rounded-lg border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Total Revenue</span>
                <TrendingUp className="h-4 w-4 text-[#111111]" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold tabular-nums text-[#111111]">
                  {stats ? ghs(stats.revenue) : '...'}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs text-[#6B6B6B]">
                  <span>Avg Ticket: {stats ? ghs(stats.avg_order_value) : '...'}</span>
                  {isSuper && (
                    <button
                      type="button"
                      onClick={resetRevenue}
                      title="Reset records"
                      className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-red-600"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* KPI 2: Paid Settlements */}
            <div className="flex flex-col justify-between rounded-lg border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Paid Settlements</span>
                <CreditCard className="h-4 w-4 text-[#09A5DB]" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold tabular-nums text-emerald-700">
                  {stats ? ghs(stats.paid_revenue) : '...'}
                </p>
                <p className="mt-2 text-xs text-[#6B6B6B]">
                  {stats?.paid_orders || 0} of {stats?.total_orders || 0} orders paid
                </p>
              </div>
            </div>

            {/* KPI 3: Total Orders */}
            <div className="flex flex-col justify-between rounded-lg border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Total Orders</span>
                <ClipboardList className="h-4 w-4 text-[#111111]" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold tabular-nums text-[#111111]">
                  {stats ? formatNum(stats.total_orders) : '...'}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs font-medium">
                  <span className="text-amber-700">{stats?.pending_orders || 0} pending</span>
                  <span className="text-[#6B6B6B]">·</span>
                  <span className="text-blue-700">{stats?.preparing_orders || 0} prep</span>
                </div>
              </div>
            </div>

            {/* KPI 4: Visitor Views */}
            <div className="flex flex-col justify-between rounded-lg border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Visitor Views</span>
                <Eye className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold tabular-nums text-[#111111]">
                  {stats ? formatNum(stats.total_visitors) : '...'}
                </p>
                <p className="mt-2 text-xs text-emerald-700 font-semibold">Storefront traffic</p>
              </div>
            </div>

            {/* KPI 5: Guest Rating */}
            <div className="flex flex-col justify-between rounded-lg border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Customer Score</span>
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold tabular-nums text-[#111111]">
                  {stats ? `${stats.avg_rating.toFixed(1)} / 5.0` : '...'}
                </p>
                <p className="mt-2 text-xs text-[#6B6B6B]">
                  {stats ? `${stats.ratings_count} verified reviews` : '...'}
                </p>
              </div>
            </div>
          </div>

          {/* Row 2: Multi-Branch Breakdown & Kitchen Pipeline */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Multi-Branch Side-by-Side Performance */}
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-neutral-700" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
                    Branch Performance Breakdown
                  </h2>
                </div>
                <span className="text-xs text-[#6B6B6B]">2 Live Outlets</span>
              </div>

              <div className="space-y-4">
                {(stats?.outlet_stats || []).map((out) => {
                  const pct = stats?.revenue ? Math.round((out.revenue / stats.revenue) * 100) : 0;
                  return (
                    <div key={out.outlet} className="rounded-md border border-neutral-200 bg-[#F7F7F7] p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm text-[#111111]">{out.outlet} Branch</p>
                          <p className="text-xs text-[#6B6B6B]">{out.orders} orders fulfilled</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#111111]">{ghs(out.revenue)}</p>
                          <p className="text-xs text-emerald-700 font-semibold">{pct}% of revenue</p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                        <div
                          className="h-full bg-neutral-900 transition-all"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Kitchen Queue Status */}
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-neutral-700" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
                    Kitchen Fulfillment Stages
                  </h2>
                </div>
                <Link to="/admin/orders" className="text-xs font-semibold text-neutral-900 hover:underline">
                  View queue
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-neutral-200 bg-[#F7F7F7] p-3.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Pending</span>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#111111]">{stats?.pending_orders || 0}</p>
                </div>
                <div className="rounded-md border border-neutral-200 bg-[#F7F7F7] p-3.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Preparing</span>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#111111]">{stats?.preparing_orders || 0}</p>
                </div>
                <div className="rounded-md border border-neutral-200 bg-[#F7F7F7] p-3.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Ready</span>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#111111]">{stats?.ready_orders || 0}</p>
                </div>
                <div className="rounded-md border border-neutral-200 bg-[#F7F7F7] p-3.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Completed</span>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#111111]">{stats?.completed_orders || 0}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-[#6B6B6B]">
                <span>Fulfillment Speed: ~22 mins</span>
                <span className="text-emerald-700 font-semibold">Active Dispatch</span>
              </div>
            </div>

            {/* Top Selling Foods */}
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4 text-neutral-700" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
                    Top Kitchen Deliveries
                  </h2>
                </div>
                <Link to="/admin/menu" className="text-xs font-semibold text-neutral-900 hover:underline">
                  Menu Items
                </Link>
              </div>

              <div className="space-y-3">
                {(stats?.top_foods || []).map((food, i) => (
                  <div key={food.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-neutral-100 font-mono text-[10px] font-bold text-neutral-700">
                        {i + 1}
                      </span>
                      <span className="font-semibold text-[#111111] truncate max-w-[160px]">{food.name}</span>
                    </div>
                    <span className="font-mono font-bold text-neutral-700">{food.count} orders</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Row 3: Latest Orders Strip */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-[#111111]">Recent Order Stream</h2>
            <p className="text-xs text-[#6B6B6B]">Latest transactions across verified Paystack &amp; POS</p>
          </div>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111111] hover:underline"
          >
            <span>View All Orders</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                <th className="pb-3">Order ID</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Branch</th>
                <th className="pb-3">Items Ordered</th>
                <th className="pb-3">Total</th>
                <th className="pb-3">Payment</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#6B6B6B]">
                    No recent orders found.
                  </td>
                </tr>
              ) : (
                recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#F7F7F7] transition-colors">
                    <td className="py-3 font-mono font-bold text-[#111111]">#{o.id}</td>
                    <td className="py-3 font-medium text-[#111111]">{o.customer_name}</td>
                    <td className="py-3 text-neutral-600">{o.outlet}</td>
                    <td className="py-3 text-[#6B6B6B] truncate max-w-[200px]">
                      {o.order_details ? o.order_details.split('\n')[0] : o.food_item}
                    </td>
                    <td className="py-3 font-mono font-bold text-[#111111]">{ghs(o.total)}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold ${
                          o.payment_status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {o.payment_status}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="font-semibold text-neutral-800">{o.status}</span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/admin/orders?search=${o.id}`}
                        className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#111111] hover:border-[#111111]"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
