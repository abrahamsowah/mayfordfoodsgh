import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  BellRing,
  Check,
  Edit3,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { api } from '../../api';
import { useAdminSession, useAdminLive } from '../../components/AdminLayout';
import type { Order } from '../../types';
import { Btn, EmptyRow, Field, Input, Select, Textarea } from '../../components/ui';
import { ghs, waLink } from '../../utils';
import InStoreOrderModal from './InStoreOrderModal';

const STATUS_FILTERS = ['All', 'Pending', 'Preparing', 'Ready', 'Completed'];
const hasContactPhone = (phone?: string | null) => String(phone || '').replace(/\D/g, '').length >= 7;

interface StatusNotification {
  orderId: number;
  customerName: string;
  status: string;
  smsDispatched: boolean;
  provider: string;
  whatsappUrl: string;
  message: string;
}

export default function AdminOrders() {
  const { admin } = useAdminSession();
  const { lastEvent } = useAdminLive();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [outlet, setOutlet] = useState('');
  const [source, setSource] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [createInStoreOpen, setCreateInStoreOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [lastNotify, setLastNotify] = useState<StatusNotification | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  const load = useCallback((silent = false) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (outlet) params.set('outlet', outlet);
    if (source) params.set('source', source);
    if (paymentStatus) params.set('payment_status', paymentStatus);
    return api
      .get<{ orders: Order[] }>(`/admin/orders${params.toString() ? `?${params}` : ''}`)
      .then((d) => setOrders(d.orders))
      .catch(() => {
        if (!silent) setOrders([]);
      });
  }, [search, status, outlet, source, paymentStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  // Instant refresh when a live event arrives via SSE
  useEffect(() => {
    if (!lastEvent) return;
    if (
      lastEvent.type === 'order_created' ||
      lastEvent.type === 'order_updated' ||
      lastEvent.type === 'order_status_updated' ||
      lastEvent.type === 'order_payment_updated' ||
      lastEvent.type === 'orders_cleared'
    ) {
      if (lastEvent.data?.id) {
        setHighlightedId(Number(lastEvent.data.id));
        setTimeout(() => setHighlightedId(null), 8000);
      }
      void load(true);
    }
  }, [lastEvent, load]);

  // Secondary backup polling every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      void load(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [load]);

  function doSearch(e: FormEvent) {
    e.preventDefault();
    void load();
  }

  async function setStatusFor(order: Order, newStatus: string) {
    setBusyId(order.id);
    try {
      const res = await api.put<{
        ok: boolean;
        notification?: {
          smsDispatched: boolean;
          provider: string;
          whatsappUrl: string;
          message: string;
        };
      }>(`/admin/orders/${order.id}/status`, { status: newStatus });

      if (res.notification) {
        setLastNotify({
          orderId: order.id,
          customerName: order.customer_name,
          status: newStatus,
          ...res.notification,
        });
      }
      await load(true);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function togglePaymentStatus(order: Order) {
    const current = order.payment_status || 'Pending';
    const next = current === 'Paid' ? 'Pending' : 'Paid';
    setBusyId(order.id);
    try {
      await api.put(`/admin/orders/${order.id}/payment`, { payment_status: next });
      await load(true);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function saveOrderEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingOrder) return;
    const fd = new FormData(e.currentTarget);
    const payload = {
      status: String(fd.get('status') || editingOrder.status),
      payment_status: String(fd.get('payment_status') || editingOrder.payment_status),
      outlet: String(fd.get('outlet') || editingOrder.outlet),
      order_type: String(fd.get('order_type') || editingOrder.order_type),
      address: String(fd.get('address') || editingOrder.address || ''),
      order_details: String(fd.get('order_details') || editingOrder.order_details || ''),
    };

    setEditBusy(true);
    try {
      const res = await api.put<{
        ok: boolean;
        notification?: {
          smsDispatched: boolean;
          provider: string;
          whatsappUrl: string;
          message: string;
        };
      }>(`/admin/orders/${editingOrder.id}`, payload);

      if (res.notification) {
        setLastNotify({
          orderId: editingOrder.id,
          customerName: editingOrder.customer_name,
          status: payload.status,
          ...res.notification,
        });
      }
      setEditingOrder(null);
      await load(true);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setEditBusy(false);
    }
  }

  const summary = useMemo(() => {
    const list = orders || [];
    return {
      count: list.length,
      total: list.reduce((s, o) => s + Number(o.total || 0), 0),
      paidTotal: list
        .filter((o) => (o.payment_status || 'Pending') === 'Paid')
        .reduce((s, o) => s + Number(o.total || 0), 0),
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Header & Summary Strip */}
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-5 sm:p-6 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-mayford-600">Order Management</p>
          <div className="flex items-center gap-3">
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111111]">Customer Orders</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time Sync</span>
            </span>
          </div>
          <p className="mt-1 text-xs text-[#6B6B6B]">
            Track kitchen progress, update customer fulfillment in real-time, and trigger automatic status alerts.
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4 md:items-end md:border-t-0 md:pt-0">
          <Btn type="button" onClick={() => setCreateInStoreOpen(true)} className="self-start md:self-end">
            <Plus className="h-4 w-4" />
            <span>New In-Store Order</span>
          </Btn>
          <div className="grid grid-cols-3 gap-4 sm:flex sm:flex-wrap sm:items-center sm:gap-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B6B6B] sm:text-[11px]">
                Orders
              </p>
              <p className="text-lg font-bold tabular-nums text-[#111111] sm:text-xl">{summary.count}</p>
            </div>
            <div className="border-l border-neutral-200 pl-4 sm:pl-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B6B6B] sm:text-[11px]">
                Paid Revenue
              </p>
              <p className="text-lg font-bold tabular-nums text-[#111111] sm:text-xl">
                {ghs(summary.paidTotal)}
              </p>
            </div>
            <div className="border-l border-neutral-200 pl-4 sm:pl-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B6B6B] sm:text-[11px]">
                Total Value
              </p>
              <p className="text-lg font-bold tabular-nums text-[#111111] sm:text-xl">{ghs(summary.total)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Automated Customer Status Notification Banner */}
      {lastNotify && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 border-l-4 border-l-emerald-600 bg-white p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div className="text-xs">
              <p className="font-bold text-[#111111]">
                Order #{lastNotify.orderId} status changed to "{lastNotify.status}" for {lastNotify.customerName}
              </p>
              <p className="mt-0.5 text-[#6B6B6B]">
                {lastNotify.smsDispatched
                  ? `Automated SMS dispatched via ${lastNotify.provider.toUpperCase()}. Client tracking page updated in real time.`
                  : lastNotify.whatsappUrl
                  ? 'Customer status alert ready. Click below to send an instant WhatsApp update to guest.'
                  : 'No customer phone was provided for this in-store order.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastNotify.whatsappUrl && (
              <a
                href={lastNotify.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#111111] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#262626]"
              >
                <MessageCircle className="h-3.5 w-3.5 text-whatsapp" />
                <span>Send WhatsApp Alert</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => setLastNotify(null)}
              className="rounded-md p-1.5 text-neutral-400 hover:text-[#111111]"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((s) => {
              const val = s === 'All' ? '' : s;
              const active = val === status;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(val)}
                  className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors sm:px-3.5 ${
                    active
                      ? 'bg-[#111111] text-white'
                      : 'border border-neutral-200 bg-[#F7F7F7] text-[#6B6B6B] hover:border-neutral-300 hover:text-[#111111]'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>

          {/* Search & Dropdown Filters */}
          <form onSubmit={doSearch} className="grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
            {admin?.role === 'super_admin' && (
              <Select
                value={outlet}
                onChange={(e) => setOutlet(e.target.value)}
                className="sm:!w-40 !py-2 !text-xs"
              >
                <option value="">All Branches</option>
                <option value="Adabraka">Adabraka</option>
                <option value="Dzorwulu">Dzorwulu</option>
              </Select>
            )}

            <Select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="sm:!w-36 !py-2 !text-xs"
            >
              <option value="">All Channels</option>
              <option value="Online">Online</option>
              <option value="In-Store">In-Store</option>
            </Select>

            <Select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="sm:!w-40 !py-2 !text-xs"
            >
              <option value="">All Payments</option>
              <option value="Paid">Paid (Settled)</option>
              <option value="Pending">Pending Payment</option>
            </Select>

            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, phone, Paystack ref..."
                className="w-full rounded-md border border-neutral-300 bg-white py-2 pl-9 pr-8 text-xs text-[#111111] placeholder-neutral-400 outline-none focus:border-[#111111]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#111111]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <Btn type="submit" className="!px-4 !py-2 !text-xs">
              Filter
            </Btn>
          </form>
        </div>
      </div>

      {/* MOBILE CARD VIEW (< md) */}
      <div className="space-y-4 md:hidden">
        {!orders ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-xs text-[#6B6B6B]">
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-xs text-[#6B6B6B]">
            No orders match the current filters.
          </div>
        ) : (
          orders.map((o) => {
            const isPaid = (o.payment_status || 'Pending') === 'Paid';
            const isHighlighted = highlightedId === o.id;
            const statusWaMsg = `Mayford Foods GH (${o.outlet}): Hello ${o.customer_name}, your Order #${o.id} status is currently ${o.status}.`;
            return (
              <div
                key={o.id}
                className={`rounded-lg border bg-white p-4 space-y-3.5 shadow-xs transition-all duration-500 ${
                  isHighlighted ? 'border-emerald-500 ring-2 ring-emerald-400 bg-emerald-50/30' : 'border-neutral-200'
                }`}
              >
                <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#111111]">#{o.id}</span>
                      <span className="rounded-sm bg-[#111111] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        {o.outlet}
                      </span>
                      <span className="rounded-sm border border-neutral-300 bg-[#F7F7F7] px-2 py-0.5 text-[10px] font-semibold text-[#111111]">
                        {o.order_type}
                      </span>
                      {o.order_source === 'In-Store' && (
                        <span className="rounded-sm bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                          In-Store
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm font-bold text-[#111111]">{o.customer_name}</p>
                    <p className="text-[11px] text-[#6B6B6B]">
                      {String(o.order_date).slice(0, 16).replace('T', ' ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold tabular-nums text-[#111111]">{ghs(o.total)}</p>
                    <span
                      className={`mt-1 inline-block rounded-sm px-2 py-0.5 text-[10px] font-bold ${
                        o.status === 'Completed'
                          ? 'bg-[#111111] text-white'
                          : o.status === 'Pending'
                          ? 'bg-mayford-600 text-white'
                          : 'border border-neutral-300 bg-[#F7F7F7] text-[#111111]'
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>
                </div>

                <div className="rounded-md bg-[#F7F7F7] p-3 text-xs">
                  <p className="whitespace-pre-wrap font-semibold text-[#111111]">
                    {o.order_details || `${o.food_item} x ${o.quantity}`}
                  </p>
                  {o.address && (
                    <p className="mt-2 flex items-start gap-1.5 text-[11px] text-[#6B6B6B]">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#111111]" />
                      <span>{o.address}</span>
                    </p>
                  )}
                  {o.receipt_signature && (
                    <p className="mt-1.5 font-mono text-[10px] text-emerald-700">
                      Seal: {o.receipt_signature}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isPaid
                          ? 'bg-[#111111] text-white'
                          : 'border border-neutral-300 bg-white text-[#111111]'
                      }`}
                    >
                      {isPaid && <Check className="h-3 w-3 text-emerald-400" />}
                      <span>{o.payment_status || 'Pending'}</span>
                    </span>
                    <span className="text-[11px] text-[#6B6B6B]">{o.payment_method || 'Paystack'}</span>
                    <button
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() => togglePaymentStatus(o)}
                      className="text-[11px] font-semibold text-[#111111] underline"
                    >
                      {isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingOrder(o)}
                      className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#111111] hover:border-[#111111]"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                    {hasContactPhone(o.phone) && (
                      <a
                        href={waLink(o.phone, statusWaMsg)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#111111] hover:text-mayford-600"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-whatsapp" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Quick Status Buttons */}
                <div className="grid grid-cols-4 gap-1.5 border-t border-neutral-100 pt-3">
                  {(['Pending', 'Preparing', 'Ready', 'Completed'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={busyId === o.id || o.status === s}
                      onClick={() => setStatusFor(o, s)}
                      className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
                        o.status === s
                          ? 'bg-[#111111] text-white'
                          : 'border border-neutral-300 bg-white text-[#111111] hover:bg-neutral-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP TABLE VIEW (>= md) */}
      <div className="hidden overflow-hidden rounded-lg border border-neutral-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-[#111111] text-[11px] font-bold uppercase tracking-wider text-white">
                <th className="p-4">Order</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Branch &amp; Type</th>
                <th className="p-4">Address</th>
                <th className="p-4">Order Details</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Kitchen Status</th>
                <th className="p-4">Quick Update</th>
                <th className="p-4 text-right">Total &amp; Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {!orders ? (
                <EmptyRow colSpan={9} text="Loading orders..." />
              ) : orders.length === 0 ? (
                <EmptyRow colSpan={9} text="No orders found." />
              ) : (
                orders.map((o) => {
                  const isPaid = (o.payment_status || 'Pending') === 'Paid';
                  const isHighlighted = highlightedId === o.id;
                  const statusWaMsg = `Mayford Foods GH (${o.outlet}): Hello ${o.customer_name}, your Order #${o.id} status is now ${o.status}.`;
                  return (
                    <tr
                      key={o.id}
                      className={`transition-colors duration-500 ${
                        isHighlighted ? 'bg-emerald-50/70 font-medium' : 'hover:bg-[#F7F7F7]'
                      }`}
                    >
                      <td className="p-4">
                        <span className="font-mono font-bold text-[#111111]">#{o.id}</span>
                        <p className="mt-0.5 whitespace-nowrap text-[10px] text-[#6B6B6B]">
                          {String(o.order_date).slice(11, 16)}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-[#111111]">{o.customer_name}</p>
                        {hasContactPhone(o.phone) ? (
                          <a
                            href={waLink(o.phone, statusWaMsg)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-[#6B6B6B] hover:text-[#111111]"
                          >
                            <MessageCircle className="h-3 w-3 text-whatsapp" />
                            <span>{o.phone}</span>
                          </a>
                        ) : (
                          <p className="mt-0.5 font-mono text-[11px] text-[#6B6B6B]">No customer phone</p>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="rounded-sm bg-[#111111] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          {o.outlet}
                        </span>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-[#111111]">{o.order_type}</span>
                          {o.order_source === 'In-Store' && (
                            <span className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-900">
                              In-Store
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="max-w-[200px] p-4 text-[#6B6B6B]">
                        <p className="line-clamp-2">{o.address || 'N/A'}</p>
                        {o.delivery_zone && (
                          <p className="mt-0.5 text-[10px] text-neutral-500 font-medium">
                            Zone: {o.delivery_zone}
                          </p>
                        )}
                      </td>
                      <td className="max-w-[220px] p-4 font-medium text-[#111111]">
                        <p className="line-clamp-3 whitespace-pre-wrap">
                          {o.order_details || `${o.food_item} x ${o.quantity}`}
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isPaid
                                ? 'bg-emerald-600 text-white'
                                : 'border border-neutral-300 bg-white text-[#111111]'
                            }`}
                          >
                            {isPaid && <Check className="h-3 w-3" />}
                            <span>{o.payment_status || 'Pending'}</span>
                          </span>
                          <p className="text-[10px] text-[#6B6B6B]">{o.payment_method || 'Paystack'}</p>
                          {o.payment_reference && (
                            <p className="font-mono text-[10px] text-neutral-500 truncate max-w-[120px]">
                              {o.payment_reference}
                            </p>
                          )}
                          <button
                            type="button"
                            disabled={busyId === o.id}
                            onClick={() => togglePaymentStatus(o)}
                            className="block text-[10px] font-semibold text-[#111111] underline hover:text-mayford-600"
                          >
                            {isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block rounded-sm px-2.5 py-1 text-[11px] font-bold ${
                            o.status === 'Completed'
                              ? 'bg-[#111111] text-white'
                              : o.status === 'Ready'
                              ? 'bg-emerald-600 text-white'
                              : o.status === 'Preparing'
                              ? 'bg-amber-600 text-white'
                              : 'bg-mayford-600 text-white'
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="grid grid-cols-2 gap-1 w-36">
                          {(['Pending', 'Preparing', 'Ready', 'Completed'] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              disabled={busyId === o.id || o.status === s}
                              onClick={() => setStatusFor(o, s)}
                              className={`rounded px-2 py-1 text-[10px] font-semibold transition-colors ${
                                o.status === s
                                  ? 'bg-[#111111] text-white'
                                  : 'border border-neutral-300 bg-white text-[#111111] hover:bg-neutral-100'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <p className="font-bold tabular-nums text-[#111111] text-sm">{ghs(o.total)}</p>
                        <div className="mt-2 flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingOrder(o)}
                            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#111111] hover:border-[#111111]"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Edit Order Modal */}
      {createInStoreOpen && (
        <InStoreOrderModal
          isSuperAdmin={admin?.role === 'super_admin'}
          defaultOutlet={
            admin?.role === 'dzorwulu_admin' || (admin?.role === 'super_admin' && outlet === 'Dzorwulu')
              ? 'Dzorwulu'
              : 'Adabraka'
          }
          onClose={() => setCreateInStoreOpen(false)}
          onCreated={(order) => {
            setHighlightedId(order.id);
            window.setTimeout(() => setHighlightedId(null), 8000);
            void load(true);
          }}
        />
      )}

      {editingOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setEditingOrder(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-6 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-mayford-600">
                  Kitchen Dispatch Control
                </span>
                <h3 className="text-base font-bold text-[#111111]">
                  Edit Order #{editingOrder.id} ({editingOrder.customer_name})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="rounded-md p-1 text-neutral-400 hover:text-[#111111]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={saveOrderEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kitchen Status">
                  <Select name="status" defaultValue={editingOrder.status}>
                    <option value="Pending">Pending (Received)</option>
                    <option value="Preparing">Preparing (Cooking)</option>
                    <option value="Ready">Ready (For Dispatch/Pickup)</option>
                    <option value="Completed">Completed (Delivered)</option>
                  </Select>
                </Field>
                <Field label="Payment Status">
                  <Select name="payment_status" defaultValue={editingOrder.payment_status || 'Pending'}>
                    <option value="Paid">Paid (Settled)</option>
                    <option value="Pending">Pending Payment</option>
                    <option value="Refunded">Refunded</option>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Kitchen Branch">
                  <Select name="outlet" defaultValue={editingOrder.outlet}>
                    <option value="Adabraka">Adabraka</option>
                    <option value="Dzorwulu">Dzorwulu</option>
                  </Select>
                </Field>
                <Field label="Fulfillment Type">
                  <Select name="order_type" defaultValue={editingOrder.order_type}>
                    <option value="Delivery">Delivery</option>
                    <option value="Pickup">Pickup</option>
                  </Select>
                </Field>
              </div>

              <Field label="Delivery Address / Notes">
                <Input name="address" defaultValue={editingOrder.address || ''} placeholder="e.g. Accra Central..." />
              </Field>

              <Field label="Order Details / Item Breakdown">
                <Textarea
                  name="order_details"
                  rows={3}
                  defaultValue={editingOrder.order_details || `${editingOrder.food_item} x ${editingOrder.quantity}`}
                />
              </Field>

              {editingOrder.receipt_signature && (
                <div className="rounded-md bg-[#F7F7F7] p-3 text-xs">
                  <p className="text-[#6B6B6B]">
                    Cryptographic Receipt Seal:{' '}
                    <strong className="font-mono text-[#111111]">{editingOrder.receipt_signature}</strong>
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Verified tamper-proof order record.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Btn type="button" variant="outline" onClick={() => setEditingOrder(null)}>
                  Cancel
                </Btn>
                <Btn type="submit" variant="red" disabled={editBusy}>
                  <Check className="h-4 w-4" />
                  <span>{editBusy ? 'Updating...' : 'Save & Trigger Alert'}</span>
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
