import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api';
import type { Order } from '../../types';
import { Btn, EmptyRow, Input } from '../../components/ui';
import { ghs } from '../../utils';

const STATUS_FILTERS = ['All', 'Pending', 'Preparing', 'Ready', 'Completed'];
const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-orange-100 text-orange-800',
  Preparing: 'bg-blue-100 text-blue-800',
  Ready: 'bg-indigo-100 text-indigo-800',
  Completed: 'bg-green-100 text-green-800',
};

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
    <div className="rounded-2xl bg-white p-6 shadow-md">
      <h1 className="mb-5 text-2xl font-bold text-mayford">Customer Orders</h1>

      <form onSubmit={doSearch} className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer or phone"
          className="max-w-xs"
        />
        <Btn type="submit">Search</Btn>
      </form>

      <div className="mb-5 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s === 'All' ? '' : s)}
            className={`rounded-md px-4 py-2 text-sm font-bold text-white ${
              (s === 'All' ? '' : s) === status ? 'bg-mayford-dark ring-2 ring-mayford' : 'bg-mayford hover:bg-mayford-dark'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="bg-mayford text-left text-white">
              <th className="p-3">ID</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Outlet</th>
              <th className="p-3">Order Type</th>
              <th className="p-3">Address</th>
              <th className="p-3">Order Details</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
              <th className="p-3">Total</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {!orders ? (
              <EmptyRow colSpan={11} text="Loading orders…" />
            ) : orders.length === 0 ? (
              <EmptyRow colSpan={11} />
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-3">{o.id}</td>
                  <td className="p-3 font-semibold">{o.customer_name}</td>
                  <td className="p-3">{o.phone}</td>
                  <td className="p-3">{o.outlet}</td>
                  <td className="p-3">{o.order_type}</td>
                  <td className="p-3">{o.address || '—'}</td>
                  <td className="max-w-[220px] p-3 whitespace-pre-wrap">{o.order_details || '—'}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[o.status] || 'bg-gray-100 text-gray-800'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {['Preparing', 'Ready', 'Completed'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={busyId === o.id || o.status === s}
                          onClick={() => setStatusFor(o, s)}
                          className={`rounded px-2 py-1 text-xs font-bold ${
                            o.status === s
                              ? 'bg-gray-200 text-gray-400'
                              : 'bg-mayford text-white hover:bg-mayford-dark disabled:opacity-50'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 font-bold">{ghs(o.total)}</td>
                  <td className="p-3 whitespace-nowrap">{String(o.order_date).slice(0, 16).replace('T', ' ')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
