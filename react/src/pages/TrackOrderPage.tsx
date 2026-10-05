import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  MapPin,
  PackageCheck,
  Phone,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Truck,
  UtensilsCrossed,
} from 'lucide-react';
import { api } from '../api';
import { useSettings } from '../components/SiteLayout';
import { Alert, Btn, Eyebrow, Field, Input, Section } from '../components/ui';
import { ghs } from '../utils';

interface TrackedOrder {
  id: number;
  customer_name: string;
  outlet: string;
  order_type: string;
  food_item: string;
  quantity: number;
  order_details: string | null;
  address: string | null;
  delivery_zone?: string | null;
  delivery_fee?: number;
  total: number;
  payment_method: string;
  payment_status: string;
  payment_reference: string | null;
  receipt_signature?: string;
  status: string;
  order_date: string;
}

const STAGES = [
  {
    key: 'Pending',
    label: 'Order Received',
    desc: 'Sent to branch kitchen queue',
    icon: Clock,
  },
  {
    key: 'Preparing',
    label: 'Preparing in Kitchen',
    desc: 'Chefs are freshly cooking your meal',
    icon: UtensilsCrossed,
  },
  {
    key: 'Ready',
    label: 'Ready for Dispatch / Pickup',
    desc: 'Packaged & handed to courier or counter',
    icon: Truck,
  },
  {
    key: 'Completed',
    label: 'Delivered / Completed',
    desc: 'Meal received by guest',
    icon: PackageCheck,
  },
];

export default function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const { settings } = useSettings();
  const [refInput, setRefInput] = useState(searchParams.get('ref') || '');
  const [phoneInput, setPhoneInput] = useState(searchParams.get('phone') || '');
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');

  async function lookupOrder(refVal: string, phoneVal: string, silent = false) {
    if (!refVal.trim() || !phoneVal.trim()) return;
    if (!silent) setBusy(true);
    if (!silent) setError('');
    try {
      const d = await api.get<{ ok: boolean; order: TrackedOrder }>(
        `/orders/track?ref=${encodeURIComponent(refVal.trim())}&phone=${encodeURIComponent(phoneVal.trim())}`
      );
      setOrder(d.order);
      setLastRefreshedAt(new Date().toLocaleTimeString());
    } catch (err) {
      if (!silent) {
        setOrder(null);
        setError((err as Error).message);
      }
    } finally {
      if (!silent) setBusy(false);
    }
  }

  // Initial load from URL search params
  useEffect(() => {
    const r = searchParams.get('ref');
    const p = searchParams.get('phone');
    if (r && p) {
      void lookupOrder(r, p);
    }
  }, [searchParams]);

  // Real-time automatic polling every 4 seconds when an active order is being tracked
  useEffect(() => {
    if (!order || !refInput || !phoneInput) return;
    if (order.status === 'Completed') return;

    const timer = setInterval(() => {
      void lookupOrder(refInput, phoneInput, true);
    }, 4000);

    return () => clearInterval(timer);
  }, [order?.id, order?.status, refInput, phoneInput]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void lookupOrder(refInput, phoneInput);
  }

  const currentStageIdx = order
    ? Math.max(
        0,
        STAGES.findIndex((s) => s.key.toLowerCase() === String(order.status || 'Pending').toLowerCase())
      )
    : 0;

  const branchPhone =
    order?.outlet === 'Dzorwulu'
      ? settings?.dzorwulu_phone || '0533634378'
      : settings?.adabraka_phone || '0244143271';

  return (
    <Section tone="default">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <Eyebrow>Real-Time Tracking</Eyebrow>
          <h1 className="text-3xl font-bold tracking-[-0.025em] text-[#111111] sm:text-4xl">
            Live Order Status
          </h1>
          <p className="mt-2 text-sm text-[#6B6B6B]">
            Enter your Order ID (e.g. <span className="font-mono font-semibold text-[#111111]">#2</span>) or Paystack
            Reference (e.g. <span className="font-mono font-semibold text-[#111111]">PSK_MF_902889</span>) and the
            phone number used at checkout to track your meal in real-time.
          </p>
        </div>

        {/* Lookup Form */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 sm:p-8">
          {error && <Alert tone="red">{error}</Alert>}
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Order ID or Paystack Reference">
              <Input
                placeholder="e.g. 2 or PSK_MF_902889"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                required
              />
            </Field>
            <Field label="Customer Phone Number">
              <Input
                placeholder="e.g. 0244192837"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                required
              />
            </Field>
            <div className="pb-4">
              <Btn type="submit" variant="red" disabled={busy} className="w-full sm:w-auto">
                <Search className="h-4 w-4" />
                <span>{busy ? 'Checking...' : 'Track Order'}</span>
              </Btn>
            </div>
          </form>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-4 text-xs text-[#6B6B6B]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Cryptographic receipt &amp; phone verification</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setRefInput('PSK_MF_902889');
                setPhoneInput('0244192837');
                void lookupOrder('PSK_MF_902889', '0244192837');
              }}
              className="font-semibold text-[#111111] underline hover:text-mayford-600"
            >
              Try sample active order (#2)
            </button>
          </div>
        </div>

        {/* Live Order Status Card */}
        {order && (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            {/* Top Dark Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[#111111] px-6 py-5 text-white">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-sm bg-mayford-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                    Order #{order.id}
                  </span>
                  <span className="rounded-sm bg-neutral-800 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                    {order.order_type}
                  </span>
                  {order.status !== 'Completed' && (
                    <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Live Updates Active</span>
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-xl font-bold">{order.customer_name}</h2>
                <p className="text-xs text-neutral-400">
                  Placed {String(order.order_date).slice(0, 16).replace('T', ' ')} · {order.outlet} Branch
                  {lastRefreshedAt && <span className="text-neutral-500"> · Synced at {lastRefreshedAt}</span>}
                </p>
              </div>

              <button
                type="button"
                onClick={() => lookupOrder(refInput, phoneInput)}
                className="inline-flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white hover:border-white"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
                <span>Refresh Now</span>
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              {/* 4-Stage Pipeline */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-mayford-600 animate-pulse" />
                    <p className="text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
                      Kitchen &amp; Dispatch Status
                    </p>
                  </div>
                  <span className="rounded-sm bg-[#111111] px-2.5 py-0.5 text-xs font-bold text-white">
                    {order.status}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  {STAGES.map((stage, idx) => {
                    const Icon = stage.icon;
                    const done = idx <= currentStageIdx;
                    const active = idx === currentStageIdx;
                    return (
                      <div
                        key={stage.key}
                        className={`rounded-md border p-4 transition-colors ${
                          active
                            ? 'border-[#111111] bg-[#111111] text-white shadow-sm'
                            : done
                            ? 'border-emerald-600 bg-[#FAF6E8] text-[#111111]'
                            : 'border-neutral-200 bg-white text-[#6B6B6B]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon
                            className={`h-4 w-4 ${
                              active ? 'text-mayford-500' : done ? 'text-emerald-600' : 'text-neutral-400'
                            }`}
                          />
                          {done && (
                            <CheckCircle2
                              className={`h-4 w-4 ${active ? 'text-white' : 'text-emerald-600'}`}
                            />
                          )}
                        </div>
                        <p className="mt-3 text-xs font-bold">{stage.label}</p>
                        <p
                          className={`mt-1 text-[11px] leading-relaxed ${
                            active ? 'text-neutral-300' : 'text-[#6B6B6B]'
                          }`}
                        >
                          {stage.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order & Payment Details Grid */}
              <div className="grid gap-4 rounded-md border border-neutral-200 bg-[#FAF6E8] p-5 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                    Ordered Items
                  </p>
                  <p className="mt-1.5 whitespace-pre-line text-sm font-semibold text-[#111111]">
                    {order.order_details || `${order.food_item} x ${order.quantity}`}
                  </p>

                  {order.delivery_zone && (
                    <p className="mt-2 text-xs text-[#6B6B6B]">
                      Delivery Zone: <strong className="text-[#111111]">{order.delivery_zone}</strong>
                    </p>
                  )}

                  {order.address && (
                    <div className="mt-3 flex items-start gap-1.5 text-xs text-[#6B6B6B]">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#111111]" />
                      <span>{order.address}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 border-t border-neutral-200 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                      Payment Summary
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold tabular-nums text-[#111111]">
                        {ghs(order.total)}
                      </span>
                      <span
                        className={`rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          order.payment_status === 'Paid'
                            ? 'bg-[#111111] text-white'
                            : 'border border-neutral-300 bg-white text-[#111111]'
                        }`}
                      >
                        {order.payment_status}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-[#6B6B6B] space-y-1">
                    <p>
                      Method: <span className="font-semibold text-[#111111]">{order.payment_method}</span>
                    </p>
                    {order.payment_reference && (
                      <p className="font-mono text-[11px]">
                        Ref: <span className="text-[#111111]">{order.payment_reference}</span>
                      </p>
                    )}
                    {order.receipt_signature && (
                      <p className="font-mono text-[11px] text-emerald-700">
                        Verification Seal: <strong className="font-bold">{order.receipt_signature}</strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Kitchen Contact & Instructions */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#111111] text-white">
                    <Store className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#111111]">Mayford {order.outlet} Kitchen</p>
                    <p className="text-xs text-[#6B6B6B]">Need urgent assistance with your delivery or pickup?</p>
                  </div>
                </div>
                <a
                  href={`tel:${branchPhone}`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#111111] px-4 py-2 text-xs font-semibold text-white hover:bg-[#262626]"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Call {branchPhone}</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
