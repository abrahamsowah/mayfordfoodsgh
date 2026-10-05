import { useEffect, useMemo, useState } from 'react';
import { Check, LoaderCircle, PackageCheck, RefreshCw, Search, X } from 'lucide-react';
import { api } from '../../api';
import { useAdminLive, useAdminSession } from '../../components/AdminLayout';

const OUTLETS = ['Adabraka', 'Dzorwulu'] as const;
type OutletName = (typeof OUTLETS)[number];
type AvailabilityStatus = 'available' | 'unavailable';

interface AvailabilityItem {
  id: number;
  food_name: string;
  category: string;
  catalog_status: string;
  adabraka_status: AvailabilityStatus;
  dzorwulu_status: AvailabilityStatus;
}

interface AvailabilityResponse {
  items: AvailabilityItem[];
  active_outlet: OutletName | null;
}

function statusFor(item: AvailabilityItem, outlet: OutletName): AvailabilityStatus {
  return outlet === 'Adabraka' ? item.adabraka_status : item.dzorwulu_status;
}

export default function AdminMenuAvailability() {
  const { admin } = useAdminSession();
  const { lastEvent } = useAdminLive();
  const [items, setItems] = useState<AvailabilityItem[]>([]);
  const [activeOutlet, setActiveOutlet] = useState<OutletName | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function loadAvailability(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await api.get<AvailabilityResponse>('/admin/menu-availability');
      setItems(response.items || []);
      setActiveOutlet(response.active_outlet || null);
      setError('');
    } catch (err) {
      setError((err as Error).message || 'Could not load menu availability.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadAvailability();
  }, []);

  useEffect(() => {
    if (lastEvent?.type === 'menu_availability_updated') void loadAvailability(true);
  }, [lastEvent]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => `${item.food_name} ${item.category}`.toLowerCase().includes(term));
  }, [items, search]);

  async function updateAvailability(item: AvailabilityItem, outlet: OutletName) {
    const nextStatus = statusFor(item, outlet) === 'available' ? 'unavailable' : 'available';
    const key = `${item.id}:${outlet}`;
    setSavingKey(key);
    setError('');
    try {
      await api.put(`/admin/menu-availability/${item.id}`, { outlet, status: nextStatus });
      setItems((current) => current.map((row) => {
        if (row.id !== item.id) return row;
        return outlet === 'Adabraka'
          ? { ...row, adabraka_status: nextStatus }
          : { ...row, dzorwulu_status: nextStatus };
      }));
    } catch (err) {
      setError((err as Error).message || 'Could not update this branch.');
    } finally {
      setSavingKey(null);
    }
  }

  const canManage = (outlet: OutletName) => admin?.role === 'super_admin' || (activeOutlet || outletForRole(admin?.role)) === outlet;
  const managedOutlet = activeOutlet || outletForRole(admin?.role);
  const availableCount = items.filter((item) =>
    item.catalog_status === 'available' &&
    (statusFor(item, 'Adabraka') === 'available' || statusFor(item, 'Dzorwulu') === 'available')
  ).length;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
              <PackageCheck className="h-4 w-4 text-neutral-700" />
              <span>Kitchen operations</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#111111]">Menu availability</h1>
            <p className="mt-1 max-w-2xl text-sm text-[#6B6B6B]">
              See stock at both branches. Branch admins update their own outlet; super admins can manage both.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAvailability(true)}
            disabled={refreshing || loading}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 text-xs font-semibold text-[#111111] transition-colors hover:border-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B]">Catalog dishes</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-[#111111]">{loading ? '—' : items.length}</p>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B]">Available at a branch</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-[#111111]">{loading ? '—' : availableCount}</p>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B]">Your access</p>
            <p className="mt-1 text-sm font-bold text-[#111111]">
              {admin?.role === 'super_admin' ? 'Manage both branches' : `${managedOutlet || 'Branch'} availability`}
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-neutral-300 bg-neutral-100 px-4 py-3 text-sm text-neutral-800">
          <X className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-sm font-bold text-[#111111]">Branch stock status</h2>
            <p className="mt-0.5 text-xs text-[#6B6B6B]">Availability is private to the admin workspace and checked by the order API.</p>
          </div>
          <label className="relative block w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              type="search"
              aria-label="Search menu items"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search menu items"
              className="h-10 w-full rounded-md border border-neutral-300 bg-white pl-9 pr-3 text-sm text-[#111111] outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
            />
          </label>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-[#6B6B6B]">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading branch availability…
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-sm font-semibold text-[#111111]">{search ? 'No matching menu items' : 'No menu items yet'}</p>
            <p className="mt-1 text-xs text-[#6B6B6B]">{search ? 'Try another search term.' : 'New catalog dishes will appear here.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-neutral-50 text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B]">
                <tr>
                  <th className="px-5 py-3">Menu item</th>
                  {OUTLETS.map((outlet) => (
                    <th key={outlet} className="px-5 py-3">{outlet}</th>
                  ))}
                  <th className="px-5 py-3">Catalog</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="align-middle">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#111111]">{item.food_name}</p>
                      <p className="mt-0.5 text-xs text-[#6B6B6B]">{item.category}</p>
                    </td>
                    {OUTLETS.map((outlet) => {
                      const available = statusFor(item, outlet) === 'available';
                      const saving = savingKey === `${item.id}:${outlet}`;
                      const editable = canManage(outlet);
                      return (
                        <td key={outlet} className="px-5 py-4">
                          <div className="flex min-w-[175px] flex-col items-start gap-2">
                            <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 text-[11px] font-semibold text-neutral-700">
                              {available ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                              {available ? 'In stock' : 'Out of stock'}
                            </span>
                            {editable ? (
                              <button
                                type="button"
                                disabled={saving || item.catalog_status !== 'available'}
                                onClick={() => void updateAvailability(item, outlet)}
                                className="inline-flex h-8 min-w-32 items-center justify-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 text-[11px] font-semibold text-[#111111] transition-colors hover:border-neutral-900 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                {saving ? <LoaderCircle className="h-3 w-3 animate-spin" /> : null}
                                {saving ? 'Saving' : available ? 'Mark out of stock' : 'Mark in stock'}
                              </button>
                            ) : (
                              <span className="h-8 py-2 text-[11px] text-[#6B6B6B]">View only</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-5 py-4">
                      <span className="inline-flex h-6 items-center rounded-full border border-neutral-200 px-2.5 text-[11px] font-semibold text-neutral-700">
                        {item.catalog_status === 'available' ? 'Listed' : 'Hidden'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function outletForRole(role?: string): OutletName | null {
  if (role === 'adabraka_admin') return 'Adabraka';
  if (role === 'dzorwulu_admin') return 'Dzorwulu';
  return null;
}
