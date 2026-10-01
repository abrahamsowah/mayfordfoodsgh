import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Bike,
  CircleDollarSign,
  CreditCard,
  Download,
  MessageCircle,
  Phone,
  Receipt,
  RefreshCw,
  Search,
  Truck,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { api } from '../../api';
import type { Order, OrderTrackingPayload } from '../../types';
import {
  Alert,
  Badge,
  Btn,
  Button,
  Chip,
  EmptyRow,
  Field,
  Input,
  PageHeader,
  Sheet,
  StatusPill,
  Textarea,
} from '../../components/ui';
import { ghs, waLink } from '../../utils';

const STATUS_FILTERS = ['All', 'Pending', 'Confirmed', 'Preparing', 'Ready', 'Out for delivery', 'Completed', 'Cancelled'];

/** The next action a kitchen/rider usually takes. */
const NEXT_STATUS: Record<string, string> = {
  Pending: 'Confirmed',
  Confirmed: 'Preparing',
  Preparing: 'Ready',
  Ready: 'Out for delivery',
  'Out for delivery': 'Completed',
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [openOrder, setOpenOrder] = useState<Order | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (paymentFilter) params.set('payment_status', paymentFilter);
    api
      .get<{ orders: Order[] }>(`/admin/orders${params.toString() ? `?${params}` : ''}`)
      .then((d) => setOrders(d.orders))
      .catch((err) => {
        setOrders([]);
        setError((err as Error).message);
      });
  }, [search, status, paymentFilter]);

  useEffect(load, [load]);

  function doSearch(e: FormEvent) {
    e.preventDefault();
    load();
  }

  async function setStatusFor(order: Order, newStatus: string, extra: Record<string, unknown> = {}) {
    setBusyId(order.id);
    setError('');
    try {
      await api.put(`/admin/orders/${order.id}/status`, { status: newStatus, ...extra });
      setNotice(`${order.order_code || `Order #${order.id}`} → ${newStatus}. The customer is notified automatically.`);
      await load();
      setOpenOrder((prev) => (prev && prev.id === order.id ? { ...prev, status: newStatus } : prev));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const unpaidOnline = (orders || []).filter((o) => o.payment_status === 'unpaid' && o.payment_method === 'paystack').length;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Receipt}
        title="Customer orders"
        subtitle="Confirm, prepare, dispatch and settle every order from both outlets."
        action={
          <div className="flex items-center gap-2">
            <Badge tone="neutral" icon={CircleDollarSign}>
              {orders ? `${orders.length} shown` : 'Loading'}
            </Badge>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={load}>
              Refresh
            </Button>
            <Button variant="outline" size="sm" icon={Download} onClick={() => window.print()}>
              Print
            </Button>
          </div>
        }
      />

      {error && <Alert tone="red">{error}</Alert>}
      {notice && <Alert tone="green">{notice}</Alert>}
      {unpaidOnline > 0 && (
        <Alert tone="orange">
          {unpaidOnline} order{unpaidOnline === 1 ? '' : 's'} awaiting online payment — open an order to re-check the Paystack status.
        </Alert>
      )}

      <div className="rounded-card border border-ink-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 p-4">
          <form onSubmit={doSearch} className="flex w-full items-center gap-2 lg:w-auto lg:flex-1">
            <div className="relative w-full min-w-[220px] max-w-sm lg:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" strokeWidth={2.3} />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone or order code" className="!h-11 pl-11" />
            </div>
            <Btn type="submit" size="md">
              Search
            </Btn>
          </form>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => (
              <Chip key={s} active={(s === 'All' ? '' : s) === status} onClick={() => setStatus(s === 'All' ? '' : s)} className="!h-9 !px-3.5 !text-[13px]">
                {s}
              </Chip>
            ))}
          </div>
          <div className="flex gap-2">
            <Chip active={paymentFilter === 'unpaid'} onClick={() => setPaymentFilter(paymentFilter === 'unpaid' ? '' : 'unpaid')} className="!h-9 !px-3.5 !text-[13px]">
              Unpaid
            </Chip>
            <Chip active={paymentFilter === 'paid'} onClick={() => setPaymentFilter(paymentFilter === 'paid' ? '' : 'paid')} className="!h-9 !px-3.5 !text-[13px]">
              Paid
            </Chip>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50/70 text-[11px] font-semibold text-ink-500">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Outlet</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Next step</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {!orders ? (
                <EmptyRow colSpan={9} text="Loading orders…" />
              ) : orders.length === 0 ? (
                <EmptyRow colSpan={9} text="No orders match these filters yet." />
              ) : (
                orders.map((o) => {
                  const next = NEXT_STATUS[o.status];
                  return (
                    <tr key={o.id} className="transition hover:bg-ink-50/70">
                      <td className="px-4 py-3">
                        <span className="block font-semibold text-ink-900">{o.order_code || `#${o.id}`}</span>
                        <span className="text-[12px] text-ink-400">{o.order_type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-ink-900">{o.customer_name}</p>
                        <p className="text-[12px] text-ink-400">{o.phone}</p>
                        {o.address && <p className="mt-0.5 max-w-[200px] truncate text-[12px] text-ink-400">{o.address}</p>}
                      </td>
                      <td className="px-4 py-3">{o.outlet}</td>
                      <td className="px-4 py-3">
                        <Badge tone={o.payment_status === 'paid' ? 'success' : 'warning'}>
                          {o.payment_status === 'paid' ? 'Paid' : o.payment_method === 'paystack' ? 'Online pending' : 'On delivery'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={o.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {next && (
                            <button
                              type="button"
                              disabled={busyId === o.id}
                              onClick={() => setStatusFor(o, next)}
                              className="rounded-tile bg-ink-900 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-mayford-600 disabled:opacity-50"
                            >
                              Mark {next}
                            </button>
                          )}
                          {o.status !== 'Completed' && !o.status.startsWith('Cancelled') && (
                            <button
                              type="button"
                              disabled={busyId === o.id}
                              onClick={() => setOpenOrder(o)}
                              className="rounded-tile border border-ink-200 px-3 py-1.5 text-[12px] font-semibold text-ink-700 transition hover:border-ink-300 disabled:opacity-50"
                            >
                              Manage
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-900">{ghs(o.total)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px]">{String(o.order_date).slice(0, 16).replace('T', ' ')}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => setOpenOrder(o)} className="text-[12px] font-bold text-mayford-700 hover:underline">
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OrderSheet
        order={openOrder}
        onClose={() => setOpenOrder(null)}
        busy={busyId === openOrder?.id}
        onStatus={(status, extra) => openOrder && setStatusFor(openOrder, status, extra)}
        onChanged={load}
        onNotice={setNotice}
        onError={setError}
      />
    </div>
  );
}

/* ------------------------------------------------------------------
   Order detail / management sheet
------------------------------------------------------------------ */
function OrderSheet({
  order,
  onClose,
  busy,
  onStatus,
  onChanged,
  onNotice,
  onError,
}: {
  order: Order | null;
  onClose: () => void;
  busy: boolean;
  onStatus: (status: string, extra?: Record<string, unknown>) => void;
  onChanged: () => void;
  onNotice: (text: string) => void;
  onError: (text: string) => void;
}) {
  const [detail, setDetail] = useState<OrderTrackingPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!order) {
      setDetail(null);
      return;
    }
    setLoading(true);
    api
      .get<OrderTrackingPayload>(`/admin/orders/${order.id}`)
      .then(setDetail)
      .catch((err) => onError((err as Error).message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  async function markPaid(method: string) {
    if (!order) return;
    try {
      await api.put(`/admin/orders/${order.id}/payment`, { payment_method: method });
      onNotice(`Payment recorded for ${order.order_code || `#${order.id}`}.`);
      onChanged();
      const fresh = await api.get<OrderTrackingPayload>(`/admin/orders/${order.id}`);
      setDetail(fresh);
    } catch (err) {
      onError((err as Error).message);
    }
  }

  async function verifyPaystack() {
    if (!order || !detail?.payment?.reference) return;
    try {
      const res = await api.post<{ status: string; marked_paid: boolean }>(`/admin/payments/${detail.payment.reference}/verify`);
      onNotice(res.marked_paid ? 'Payment confirmed and the order marked paid.' : `Paystack status: ${res.status}.`);
      onChanged();
      const fresh = await api.get<OrderTrackingPayload>(`/admin/orders/${order.id}`);
      setDetail(fresh);
    } catch (err) {
      onError((err as Error).message);
    }
  }

  return (
    <Sheet open={!!order} onClose={onClose} title={order ? `Order ${order.order_code || `#${order.id}`}` : 'Order'} subtitle="Manage status, rider and payment." maxWidth="max-w-2xl">
      {order && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={order.status} />
            <Badge tone={order.payment_status === 'paid' ? 'success' : 'warning'}>
              {order.payment_status === 'paid' ? 'Paid' : order.payment_method === 'paystack' ? 'Online payment pending' : 'Pay on delivery'}
            </Badge>
            <Badge tone="neutral">{order.outlet}</Badge>
            <Badge tone="neutral">{order.order_type}</Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-card border border-ink-200 p-4 text-[13px]">
              <p className="mb-1 flex items-center gap-2 text-[12px] font-semibold text-ink-400">
                <UserRound className="h-3.5 w-3.5" /> Customer
              </p>
              <p className="font-semibold text-ink-900">{order.customer_name}</p>
              <a href={`tel:${order.phone}`} className="mt-0.5 flex items-center gap-1.5 font-semibold text-mayford-700 hover:underline">
                <Phone className="h-3.5 w-3.5" strokeWidth={2.3} /> {order.phone}
              </a>
              {order.address && <p className="mt-1 text-ink-500">{order.address}</p>}
              {order.order_details && <p className="mt-1 italic text-ink-500">“{order.order_details}”</p>}
            </div>
            <div className="rounded-card border border-ink-200 p-4 text-[13px]">
              <p className="mb-1 flex items-center gap-2 text-[12px] font-semibold text-ink-400">
                <Wallet className="h-3.5 w-3.5" /> Money
              </p>
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Subtotal</span>
                <span className="font-bold tabular-nums text-ink-900">{ghs(Number(order.subtotal ?? order.total))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Delivery</span>
                <span className="font-bold tabular-nums text-ink-900">{ghs(Number(order.delivery_fee || 0))}</span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-dashed border-ink-200 pt-1.5">
                <span className="font-semibold text-ink-900">Total</span>
                <span className="font-semibold tabular-nums text-ink-900">{ghs(order.total)}</span>
              </div>
              {detail?.payment?.reference && (
                <p className="mt-2 break-all font-mono text-[12px] text-ink-500">Ref: {detail.payment.reference}</p>
              )}
            </div>
          </div>

          {detail && detail.items.length > 0 && (
            <div className="rounded-card border border-ink-200">
              <p className="border-b border-ink-100 px-4 py-2.5 text-[12px] font-semibold text-ink-400">Items</p>
              <ul className="divide-y divide-ink-100">
                {detail.items.map((i) => (
                  <li key={`${i.food_name}-${i.menu_item_id}`} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                    <span className="text-ink-700">
                      {i.food_name} <span className="text-ink-400">× {i.quantity}</span>
                    </span>
                    <span className="font-bold tabular-nums text-ink-900">{ghs(i.line_total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {detail && (
            <div className="rounded-card border border-ink-200 p-4">
              <p className="mb-2 text-[12px] font-semibold text-ink-400">History</p>
              <ol className="space-y-1.5 text-[13px]">
                {detail.timeline.map((t, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="w-[120px] shrink-0 text-ink-400">{t.at || '—'}</span>
                    <span className="font-bold text-ink-800">{t.status}</span>
                    {t.note && <span className="text-ink-500">· {t.note}</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Advance status */}
          <div className="rounded-card border border-ink-200 p-4">
            <p className="mb-3 text-[12px] font-semibold text-ink-400">Update status</p>
            <div className="flex flex-wrap gap-2">
              {['Confirmed', 'Preparing', 'Ready', 'Out for delivery', 'Completed'].map((s) => (
                <Button key={s} variant={order.status === s ? 'ghost' : 'outline'} size="sm" disabled={busy || order.status === s} onClick={() => onStatus(s)}>
                  {s}
                </Button>
              ))}
            </div>

            <form
              className="mt-4 grid gap-3 sm:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
                onStatus('Out for delivery', {
                  courier_name: fd.courier_name,
                  courier_phone: fd.courier_phone,
                  eta_minutes: fd.eta_minutes ? Number(fd.eta_minutes) : undefined,
                });
              }}
            >
              <Field label="Rider name">
                <Input name="courier_name" placeholder="e.g. Kofi" defaultValue={order.courier_name || ''} />
              </Field>
              <Field label="Rider phone">
                <Input name="courier_phone" placeholder="024 000 0000" inputMode="tel" defaultValue={order.courier_phone || ''} />
              </Field>
              <Field label="ETA (minutes)">
                <Input name="eta_minutes" type="number" min={5} max={240} placeholder="30" defaultValue={order.eta_minutes || ''} />
              </Field>
              <div className="sm:col-span-3">
                <Button type="submit" variant="primary" size="md" icon={Truck} loading={busy}>
                  Dispatch with this rider
                </Button>
              </div>
            </form>
          </div>

          {/* Payment + cancel */}
          <div className="rounded-card border border-ink-200 p-4">
            <p className="mb-3 text-[12px] font-semibold text-ink-400">Payment</p>
            {order.payment_status === 'paid' ? (
              <p className="flex items-center gap-2 text-[13px] font-semibold text-success-700">
                <CreditCard className="h-4 w-4" strokeWidth={2.3} /> Settled{detail?.payment?.channel ? ` via ${detail.payment.channel}` : ''}.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" icon={Wallet} onClick={() => void markPaid('cash')}>
                  Record cash payment
                </Button>
                <Button variant="outline" size="sm" icon={CreditCard} onClick={() => void markPaid('momo')}>
                  Record MoMo payment
                </Button>
                {detail?.payment?.reference && (
                  <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => void verifyPaystack()}>
                    Re-check Paystack
                  </Button>
                )}
              </div>
            )}
          </div>

          {!order.status.startsWith('Cancelled') && order.status !== 'Completed' && (
            <div className="rounded-card border border-red-200 bg-red-50/50 p-4">
              <p className="mb-2 text-[12px] font-semibold text-red-500">Cancel order</p>
              {cancelling ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
                    onStatus('Cancelled', { reason: fd.reason });
                    setCancelling(false);
                  }}
                  className="space-y-3"
                >
                  <Textarea name="reason" rows={2} placeholder="Reason (shown to the customer)" required />
                  <div className="flex gap-2">
                    <Button type="submit" variant="danger" size="sm" icon={X} loading={busy}>
                      Cancel order
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setCancelling(false)}>
                      Keep order
                    </Button>
                  </div>
                </form>
              ) : (
                <Button variant="outline" size="sm" icon={X} onClick={() => setCancelling(true)}>
                  Cancel this order
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <a
              href={waLink(order.phone, `Hello ${order.customer_name}, about your Mayford order ${order.order_code || `#${order.id}`}:`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-tile border border-ink-200 px-4 py-2 text-[13px] font-bold text-ink-700 hover:border-ink-300"
            >
              <MessageCircle className="h-4 w-4 text-whatsapp-dark" strokeWidth={2.3} />
              WhatsApp the customer
            </a>
            {detail?.order && 'tracking_token' in detail.order && (detail.order as any).tracking_token && (
              <a
                href={`/track/${(detail.order as any).tracking_token}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-tile border border-ink-200 px-4 py-2 text-[13px] font-bold text-ink-700 hover:border-ink-300"
              >
                <Bike className="h-4 w-4 text-mayford-600" strokeWidth={2.3} />
                Open customer tracker
              </a>
            )}
          </div>
        </div>
      )}
      {loading && <p className="mt-3 text-center text-[13px] text-ink-400">Loading order details…</p>}
    </Sheet>
  );
}
