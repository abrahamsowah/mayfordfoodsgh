import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api';
import type { Order } from '../../types';
import {
  Badge,
  Btn,
  Button,
  Chip,
  EmptyRow,
  Input,
  PageHeader,
  StatusPill,
} from '../../components/ui';
import { ghs } from '../../utils';
import { CircleDollarSign, Download, Receipt, Search } from 'lucide-react';

const STATUS_FILTERS = ['All', 'Pending', 'Preparing', 'Ready', 'Completed'];

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    api
      .get<{ orders: Order[] }>(`/admin/orders${params.toString() ? `?${params}` : ''}`)
      .then((d) => setOrders(d.orders))
      .catch(() => setOrders([]));
  }, [search, status]);

  useEffect(load, [load]);

  function doSearch(e: FormEvent) {
    e.preventDefault();
    load();
  }

  async function setStatusFor(order: Order, newStatus: string) {
    setBusyId(order.id);
    try {
      await api.put(`/admin/orders/${order.id}/status`, { status: newStatus });
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Receipt}
        title="Customer orders"
        subtitle="Track, update and close orders from both outlets"
        action={
          <div className="flex items-center gap-2">
            <Badge tone="neutral" icon={CircleDollarSign}>
              {orders ? `${orders.length} shown` : 'Loading'}
            </Badge>
            <Button variant="outline" size="sm" icon={Download} onClick={() => window.print()}>
              Print
            </Button>
          </div>
        }
      />

      <div className="rounded-card border border-ink-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 p-4">
          <form onSubmit={doSearch} className="flex flex-1 items-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                strokeWidth={2.3}
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer or phone"
                className="!h-11 pl-11"
              />
            </div>
            <Btn type="submit" size="md">
              Search
            </Btn>
          </form>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => (
              <Chip
                key={s}
                active={(s === 'All' ? '' : s) === status}
                onClick={() => setStatus(s === 'All' ? '' : s)}
                className="!h-9 !px-3.5 !text-[12.5px]"
              >
                {s}
              </Chip>
            ))}
          </div>
        </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-[13.5px]">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50/70 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-500">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Outlet</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Update</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {!orders ? (
              <EmptyRow colSpan={9} text="Loading orders…" />
            ) : orders.length === 0 ? (
              <EmptyRow colSpan={9} text="No orders match these filters yet." />
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="transition hover:bg-ink-50/70">
                  <td className="px-4 py-3">
                    <span className="font-extrabold tabular-nums text-ink-900">#{o.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-ink-900">{o.customer_name}</p>
                    <p className="text-[12px] text-ink-400">{o.phone}</p>
                    {o.address && <p className="mt-0.5 max-w-[200px] truncate text-[12px] text-ink-400">{o.address}</p>}
                  </td>
                  <td className="px-4 py-3">{o.outlet}</td>
                  <td className="px-4 py-3">{o.order_type}</td>
                  <td className="max-w-[240px] whitespace-pre-wrap px-4 py-3 text-[12.5px]">{o.order_details || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={o.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {['Preparing', 'Ready', 'Completed'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={busyId === o.id || o.status === st}
                          onClick={() => setStatusFor(o, st)}
                          className={`rounded-pill px-3 py-1.5 text-[11.5px] font-extrabold transition ${
                            o.status === st
                              ? 'bg-ink-100 text-ink-400'
                              : 'bg-ink-900 text-white hover:bg-mayford-600 disabled:opacity-50'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold tabular-nums text-ink-900">{ghs(o.total)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[12.5px]">
                    {String(o.order_date).slice(0, 16).replace('T', ' ')}
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
