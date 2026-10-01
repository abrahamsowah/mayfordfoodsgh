import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bike,
  CreditCard,
  Globe,
  LineChart,
  Monitor,
  Percent,
  Receipt,
  ShoppingBag,
  Smartphone,
  TrendingUp,
  Users,
  Utensils,
  Wallet,
} from 'lucide-react';
import { api } from '../../api';
import { useAdminSession } from '../../components/AdminLayout';
import type { AnalyticsSummary, PaymentGatewayStatus, PaymentRecord } from '../../types';
import { ghs } from '../../utils';
import { Alert, Badge, EmptyRow, IconTile, PageHeader, Panel, Spinner, Td, Th, DataTable } from '../../components/ui';

const RANGES: { key: string; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: 'ytd', label: 'This year' },
  { key: 'all', label: 'All time' },
];

export default function AdminAnalytics() {
  const { admin } = useAdminSession();
  const [range, setRange] = useState('30d');
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [gateway, setGateway] = useState<PaymentGatewayStatus | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.get<{ analytics: AnalyticsSummary }>(`/admin/analytics?range=${range}`);
      setData(res.analytics);
      if (admin?.role === 'super_admin') {
        const pay = await api.get<{ payments: PaymentRecord[] }>('/admin/payments?limit=25').catch(() => null);
        if (pay) setPayments(pay.payments);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [range, admin?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api
      .get<PaymentGatewayStatus>('/payments/status')
      .then(setGateway)
      .catch(() => undefined);
  }, []);

  const views = useMemo(() => (data?.traffic.daily || []).map((d) => Number(d.views || 0)), [data]);
  const visitors = useMemo(() => (data?.traffic.daily || []).map((d) => Number(d.visitors || 0)), [data]);
  const revenue = useMemo(() => (data?.daily_sales || []).map((d) => Number(d.revenue || 0)), [data]);
  const orders = useMemo(() => (data?.daily_sales || []).map((d) => Number(d.orders || 0)), [data]);

  const isSuper = admin?.role === 'super_admin';

  return (
    <>
      <PageHeader
        icon={BarChart3}
        title="Analytics"
        subtitle="Traffic, sales and revenue — measured straight from the database."
        action={
          <div className="flex flex-wrap gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={`rounded-tile border px-3 py-1.5 text-[13px] font-bold transition ${
                  range === r.key ? 'border-mayford-600 bg-mayford-600 text-white' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {error && <Alert tone="red">{error}</Alert>}
      {busy && !data && <Spinner />}

      {data && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi icon={Wallet} label="Revenue (paid)" value={ghs(data.sales.revenue)} hint={`${ghs(data.sales.unpaid_value)} awaiting payment`} tone="brand" />
            <Kpi icon={Receipt} label="Orders" value={String(data.sales.orders)} hint={`${data.sales.completed} completed · ${data.sales.in_progress} in progress`} tone="flame" />
            <Kpi icon={TrendingUp} label="Average order" value={ghs(data.sales.average_order_value)} hint={`${data.sales.items_sold} items sold`} tone="success" />
            <Kpi icon={Percent} label="Conversion" value={`${data.conversion.rate}%`} hint="Orders ÷ unique visitors" tone="light" />
            <Kpi icon={Users} label="Unique visitors" value={String(data.traffic.unique_visitors)} hint={`${data.traffic.page_views} page views`} tone="light" />
            <Kpi icon={Activity} label="Views today" value={String(data.traffic.today_views)} hint="Page views since midnight" tone="light" />
            <Kpi icon={Bike} label="In progress" value={String(data.sales.in_progress)} hint={`${data.sales.pending} pending · ${data.sales.cancelled} cancelled`} tone="light" />
            <Kpi icon={CreditCard} label="Paid online" value={ghs(data.sales.channel_split.paystack)} hint={`${ghs(data.sales.channel_split.cash)} settled offline`} tone="light" />
          </div>

          {/* Charts */}
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IconTile icon={LineChart} tone="light" size="sm" />
                  <div>
                    <h2 className="text-[15px] font-semibold text-ink-900">Traffic</h2>
                    <p className="text-[12px] text-ink-500">Page views and unique visitors per day</p>
                  </div>
                </div>
                <Badge tone="neutral">{data.traffic.page_views} views</Badge>
              </div>
              <AreaChart series={[{ values: views, color: '#b22222' }, { values: visitors, color: '#ff9800' }]} />
              <div className="mt-3 flex flex-wrap gap-4 text-[12px] font-semibold text-ink-500">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-mayford-600" /> Page views</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-mayford-600" /> Visitors</span>
              </div>
            </Panel>

            <Panel className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IconTile icon={BarChart3} tone="light" size="sm" />
                  <div>
                    <h2 className="text-[15px] font-semibold text-ink-900">Sales</h2>
                    <p className="text-[12px] text-ink-500">Paid revenue and order count per day</p>
                  </div>
                </div>
                <Badge tone="brand">{ghs(data.sales.revenue)}</Badge>
              </div>
              <BarChart values={revenue} secondary={orders} />
              <div className="mt-3 flex flex-wrap gap-4 text-[12px] font-semibold text-ink-500">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-mayford-600" /> Revenue (GH₵)</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-mayford-600" /> Orders</span>
              </div>
            </Panel>
          </div>

          {!isSuper && <Alert tone="orange">You are signed in as an outlet manager — traffic, customers and menu performance are visible to super admins only.</Alert>}

          {/* Tables */}
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-ink-900">
                <Globe className="h-4 w-4 text-ink-400" strokeWidth={2.3} /> Where visitors come from
              </h2>
              {data.traffic.sources.length === 0 ? (
                <p className="text-[13px] text-ink-500">No traffic recorded in this period yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {data.traffic.sources.map((s) => {
                    const max = Math.max(...data.traffic.sources.map((x) => x.visits), 1);
                    return (
                      <li key={s.source}>
                        <div className="mb-1 flex items-center justify-between text-[13px]">
                          <span className="truncate font-bold text-ink-700">{s.source}</span>
                          <span className="font-semibold tabular-nums text-ink-900">{s.visits}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-tile bg-ink-100">
                          <div className="h-full rounded-full bg-mayford-500" style={{ width: `${(s.visits / max) * 100}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-ink-900">
                <Monitor className="h-4 w-4 text-ink-400" strokeWidth={2.3} /> Devices
              </h2>
              {data.traffic.devices.length === 0 ? (
                <p className="text-[13px] text-ink-500">No visits recorded yet.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-3">
                  {data.traffic.devices.map((d) => (
                    <li key={d.device} className="rounded-tile border border-ink-200 p-4 text-center">
                      <IconTile icon={d.device === 'mobile' ? Smartphone : d.device === 'tablet' ? Smartphone : Monitor} tone="light" size="sm" className="mx-auto" />
                      <p className="mt-2 text-[18px] font-semibold tabular-nums text-ink-900">{d.visits}</p>
                      <p className="text-[12px] font-semibold capitalize text-ink-500">{d.device}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel className="overflow-hidden">
              <div className="border-b border-ink-100 px-5 py-4">
                <h2 className="text-[15px] font-semibold text-ink-900">Most viewed pages</h2>
              </div>
              <DataTable
                head={
                  <>
                    <Th>Page</Th>
                    <Th className="!text-right">Views</Th>
                  </>
                }
              >
                <tbody>
                  {data.traffic.top_pages.length === 0 && <EmptyRow colSpan={2} text="No page views in this period." />}
                  {data.traffic.top_pages.map((p) => (
                    <tr key={p.path}>
                      <Td className="font-semibold text-ink-800">{p.path}</Td>
                      <Td className="!text-right tabular-nums font-bold">{p.views}</Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </Panel>

            <Panel className="overflow-hidden">
              <div className="border-b border-ink-100 px-5 py-4">
                <h2 className="text-[15px] font-semibold text-ink-900">Best-selling dishes</h2>
              </div>
              <DataTable
                head={
                  <>
                    <Th>Dish</Th>
                    <Th className="!text-right">Sold</Th>
                    <Th className="!text-right">Revenue</Th>
                  </>
                }
              >
                <tbody>
                  {data.menu.length === 0 && <EmptyRow colSpan={3} text="No dish sales in this period." />}
                  {data.menu.map((m) => (
                    <tr key={m.name}>
                      <Td className="font-semibold text-ink-800">{m.name}</Td>
                      <Td className="!text-right tabular-nums">{m.quantity}</Td>
                      <Td className="!text-right tabular-nums font-bold">{ghs(m.revenue)}</Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel className="overflow-hidden">
              <div className="border-b border-ink-100 px-5 py-4">
                <h2 className="text-[15px] font-semibold text-ink-900">Top customers</h2>
              </div>
              <DataTable
                head={
                  <>
                    <Th>Customer</Th>
                    <Th className="!text-right">Orders</Th>
                    <Th className="!text-right">Spent</Th>
                  </>
                }
              >
                <tbody>
                  {data.customers.top.length === 0 && <EmptyRow colSpan={3} text="No orders in this period." />}
                  {data.customers.top.map((c) => (
                    <tr key={`${c.phone}-${c.name}`}>
                      <Td>
                        <span className="block font-semibold text-ink-800">{c.name}</span>
                        <span className="text-[12px] text-ink-500">{c.phone}</span>
                      </Td>
                      <Td className="!text-right tabular-nums">{c.orders}</Td>
                      <Td className="!text-right tabular-nums font-bold">{ghs(c.spent)}</Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </Panel>

            <Panel className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-ink-900">
                <ShoppingBag className="h-4 w-4 text-ink-400" strokeWidth={2.3} /> Payment health
              </h2>
              <div className="mb-5 rounded-tile border border-ink-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[13px] font-bold text-ink-700">
                    <CreditCard className="h-4 w-4 text-mayford-600" strokeWidth={2.3} /> Paystack
                  </span>
                  <Badge tone={gateway?.enabled ? 'success' : 'warning'}>{gateway?.enabled ? `Connected · ${gateway.mode}` : 'Not configured'}</Badge>
                </div>
                <p className="mt-2 text-[13px] text-ink-500">
                  {gateway?.enabled
                    ? 'Mobile Money, card and bank transfer are live. Webhooks confirm payments automatically.'
                    : 'Add PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY on the server to accept online payments.'}
                </p>
              </div>
              {data.payments.length === 0 ? (
                <p className="text-[13px] text-ink-500">No payment attempts in this period.</p>
              ) : (
                <ul className="space-y-2.5">
                  {data.payments.map((p) => (
                    <li key={p.status} className="flex items-center justify-between text-[13px]">
                      <span className="font-bold capitalize text-ink-700">{p.status}</span>
                      <span className="tabular-nums text-ink-500">
                        {p.count} · <strong className="text-ink-900">{ghs(p.amount)}</strong>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {isSuper && (
            <Panel className="overflow-hidden">
              <div className="border-b border-ink-100 px-5 py-4">
                <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
                  <Utensils className="h-4 w-4 text-ink-400" strokeWidth={2.3} /> Recent Paystack payments
                </h2>
              </div>
              <DataTable
                head={
                  <>
                    <Th>Reference</Th>
                    <Th>Order</Th>
                    <Th>Channel</Th>
                    <Th>Status</Th>
                    <Th className="!text-right">Amount</Th>
                    <Th>When</Th>
                  </>
                }
              >
                <tbody>
                  {payments.length === 0 && <EmptyRow colSpan={6} text="No payments yet — they appear here as soon as a customer pays online." />}
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <Td className="font-mono text-[12px] text-ink-700">{p.reference}</Td>
                      <Td className="text-ink-700">{p.order_code || '—'}</Td>
                      <Td className="capitalize text-ink-600">{p.channel || '—'}</Td>
                      <Td>
                        <Badge tone={p.status === 'success' ? 'success' : p.status === 'failed' ? 'danger' : 'warning'}>{p.status}</Badge>
                      </Td>
                      <Td className="!text-right tabular-nums font-bold">{ghs(p.amount)}</Td>
                      <Td className="text-[12px] text-ink-500">{p.paid_at || p.created_at}</Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </Panel>
          )}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------
   Bits
------------------------------------------------------------------ */
function Kpi({ icon, label, value, hint, tone }: { icon: typeof Wallet; label: string; value: string; hint: string; tone: 'brand' | 'flame' | 'success' | 'light' }) {
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-ink-400">{label}</p>
          <p className="mt-1 truncate text-[24px] font-semibold tabular-nums tracking-tight text-ink-900">{value}</p>
          <p className="mt-0.5 truncate text-[12px] text-ink-500">{hint}</p>
        </div>
        <IconTile icon={icon} tone={tone === 'light' ? 'light' : tone} size="sm" />
      </div>
    </Panel>
  );
}

/** Simple area/line chart (no external dependency). */
function AreaChart({ series }: { series: { values: number[]; color: string }[] }) {
  const width = 640;
  const chartHeight = 150;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const points = (values: number[]) =>
    values
      .map((v, i) => {
        const x = values.length === 1 ? width : (i / (values.length - 1)) * width;
        const y = chartHeight - (v / max) * (chartHeight - 12) - 6;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${chartHeight}`} className="h-[150px] w-full" preserveAspectRatio="none" role="img" aria-label="Traffic chart">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={width} y1={chartHeight * f} y2={chartHeight * f} stroke="#f5f5f4" strokeWidth="1" />
        ))}
        {series.map((s, idx) => (
          <g key={idx}>
            <polyline points={points(s.values)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <polygon points={`0,${chartHeight} ${points(s.values)} ${width},${chartHeight}`} fill={s.color} opacity="0.08" />
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Paired bar chart: revenue bars with an order-count overlay line. */
function BarChart({ values, secondary }: { values: number[]; secondary: number[] }) {
  const max = Math.max(1, ...values);
  const maxOrders = Math.max(1, ...secondary);
  return (
    <div className="w-full">
      <div className="flex h-[150px] items-end gap-[3px]">
        {values.map((v, i) => {
          const h = (v / max) * 100;
          const o = (Number(secondary[i] || 0) / maxOrders) * 100;
          return (
            <div key={i} className="group relative flex h-full flex-1 flex-col justify-end gap-[2px]">
              <div className="relative w-full rounded-t-[3px] bg-mayford-600/70" style={{ height: `${Math.max(o, secondary[i] ? 3 : 0)}%` }} />
              <div className="w-full rounded-t-[3px] bg-mayford-600 transition group-hover:bg-mayford-700" style={{ height: `${Math.max(h, v ? 3 : 0)}%` }} />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-tile border border-ink-200 bg-white px-2.5 py-1.5 text-[12px] font-bold text-ink-800 group-hover:block">
                {ghs(v)} · {secondary[i] || 0} orders
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-semibold text-ink-400">
        <span>{values.length > 1 ? 'Start of range' : 'Today'}</span>
        <span>Today</span>
      </div>
    </div>
  );
}
