import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Home,
  Link as LinkIcon,
  LayoutDashboard,
  LogOut,
  MapPin,
  PackageSearch,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Trash2,
  Truck,
  User,
  Utensils,
  Wallet,
} from 'lucide-react';
import { api } from '../../api';
import { useCart } from '../../context/CartContext';
import { useCustomer } from '../../context/CustomerContext';
import type { AccountOrder, OrderStep } from '../../types';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  IconTile,
  Input,
  LinkBtn,
  PageHeader,
  Section,
  Spinner,
} from '../../components/ui';
import { ghs } from '../../utils';

type Tab = 'overview' | 'orders' | 'addresses' | 'profile';

const TABS: { key: Tab; label: string; icon: typeof User }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'orders', label: 'My orders', icon: ShoppingBag },
  { key: 'addresses', label: 'Addresses', icon: MapPin },
  { key: 'profile', label: 'Profile', icon: User },
];

const STATUS_TONE: Record<string, 'neutral' | 'brand' | 'flame' | 'success' | 'warning' | 'info' | 'danger'> = {
  Pending: 'warning',
  Confirmed: 'info',
  Preparing: 'flame',
  Ready: 'info',
  'Out for delivery': 'flame',
  Completed: 'success',
  Cancelled: 'danger',
};

export default function AccountPage() {
  const { customer, loading, ordersCount, refresh } = useCustomer();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'overview';

  useEffect(() => {
    if (!loading && !customer) navigate('/account/login?next=/account', { replace: true });
  }, [loading, customer, navigate]);

  if (loading) return <Spinner className="py-24" />;
  if (!customer) return null;

  return (
    <Section className="!py-10 md:!py-12">
      <PageHeader
        icon={User}
        title={`Hello, ${customer.full_name.split(' ')[0]}`}
        subtitle={`${ordersCount} order${ordersCount === 1 ? '' : 's'} with Mayford Foods · ${customer.email}`}
        action={
          <LinkBtn href="/menu" variant="primary" size="md" icon={Utensils}>
            Order again
          </LinkBtn>
        }
      />

      <div className="mb-6 flex gap-2 overflow-x-auto rail pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setParams(t.key === 'overview' ? {} : { tab: t.key })}
            className={`inline-flex shrink-0 items-center gap-2 rounded-tile border px-3.5 py-2 text-[13px] font-bold transition ${
              tab === t.key ? 'border-mayford-600 bg-mayford-600 text-white' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
            }`}
          >
            <t.icon className="h-4 w-4" strokeWidth={2.3} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'orders' && <OrdersTab onOrderChange={() => void refresh()} />}
      {tab === 'addresses' && <AddressesTab />}
      {tab === 'profile' && <ProfileTab />}
    </Section>
  );
}

/* ------------------------------------------------------------------
   Overview
------------------------------------------------------------------ */
function Overview() {
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    api
      .get<{ orders: AccountOrder[] }>('/customer/orders?limit=5')
      .then((d) => setOrders(d.orders))
      .catch(() => undefined)
      .finally(() => setBusy(false));
  }, []);

  const active = orders.filter((o) => !o.cancelled && o.status !== 'Completed');
  const spent = orders.reduce((sum, o) => sum + (o.payment_status === 'paid' ? o.total : 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={ShoppingBag} label="Orders placed" value={String(orders.length)} hint="Recent orders" />
        <StatCard icon={Bike} label="Active now" value={String(active.length)} hint={active.length ? 'Being prepared or on the way' : 'Nothing in flight'} />
        <StatCard icon={Wallet} label="Paid online" value={ghs(spent)} hint="Through Paystack" />
      </div>

      {active.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <h2 className="text-[15px] font-extrabold tracking-tight text-ink-900">Live orders</h2>
            <Badge tone="flame">{active.length} in progress</Badge>
          </div>
          <ul className="divide-y divide-ink-100">
            {active.map((order) => (
              <li key={order.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-extrabold text-ink-900">
                      {order.order_code} · {ghs(order.total)}
                    </p>
                    <p className="text-[12.5px] text-ink-500">
                      {order.outlet} · {order.order_type} · placed {order.created_at}
                    </p>
                  </div>
                  <StatusPill status={order.status} />
                </div>
                <Steps steps={order.steps} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <LinkBtn href={`/track/${order.tracking_token || ''}`} variant="primary" size="sm" icon={Bike}>
                    Track live
                  </LinkBtn>
                  <LinkBtn href={`/account?tab=orders`} variant="outline" size="sm" icon={ChevronRight}>
                    Order details
                  </LinkBtn>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h2 className="text-[15px] font-extrabold tracking-tight text-ink-900">Recent orders</h2>
          <Link to="/account?tab=orders" className="text-[12.5px] font-bold text-mayford-700 hover:underline">
            See all
          </Link>
        </div>
        {busy ? (
          <Spinner className="py-12" />
        ) : orders.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={ShoppingBag}
              title="No orders yet"
              text="Your first order will show up here, with live tracking."
              action={
                <LinkBtn href="/menu" variant="primary" size="md" icon={Utensils}>
                  Browse the menu
                </LinkBtn>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {orders.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-bold text-ink-900">
                    {order.items.map((i) => `${i.food_name} ×${i.quantity}`).join(', ') || order.order_code}
                  </p>
                  <p className="text-[12px] text-ink-500">
                    {order.created_at} · {order.outlet}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusPill status={order.status} />
                  <span className="text-[13.5px] font-extrabold tabular-nums text-ink-900">{ghs(order.total)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconTile icon={Truck} tone="brand" size="sm" />
            <div>
              <h2 className="text-[14.5px] font-extrabold text-ink-900">Mayford loyalty</h2>
              <p className="text-[12.5px] text-ink-500">
                Every 5th direct order earns you a free delivery — order here instead of through delivery apps.
              </p>
            </div>
          </div>
          <LinkBtn href="/menu" variant="outline" size="sm" icon={ArrowRight}>
            Order direct
          </LinkBtn>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------
   Orders
------------------------------------------------------------------ */
function OrdersTab({ onOrderChange }: { onOrderChange?: () => void }) {
  const { addLines } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const d = await api.get<{ orders: AccountOrder[] }>('/customer/orders');
      setOrders(d.orders);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function reorder(order: AccountOrder) {
    setMessage('');
    setError('');
    try {
      const res = await api.post<{ lines: { id: number | null; name: string; quantity: number; available: boolean; price: number | null; image: string | null }[] }>(
        `/customer/orders/${order.id}/reorder`
      );
      const available = res.lines.filter((l) => l.id && l.available && l.price != null);
      if (available.length === 0) {
        setError('None of those items are available right now. Please pick something from the menu.');
        return;
      }
      addLines(
        available.map((l) => ({
          id: Number(l.id),
          food_name: l.name,
          price: Number(l.price),
          image: l.image || '',
          quantity: Number(l.quantity),
        }))
      );
      const skipped = res.lines.length - available.length;
      setMessage(`${available.length} item${available.length === 1 ? '' : 's'} added to your cart${skipped ? ` (${skipped} unavailable and skipped)` : ''}.`);
      navigate('/cart');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (busy) return <Spinner className="py-20" />;

  return (
    <div className="space-y-5">
      {message && <Alert tone="green">{message}</Alert>}
      {error && <Alert tone="red">{error}</Alert>}
      <ClaimOrderCard
        onClaimed={() => {
          void load();
          onOrderChange?.();
        }}
      />
      {orders.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={ShoppingBag}
            title="No orders yet"
            text="Once you order, everything you have ever ordered shows up here."
            action={
              <LinkBtn href="/menu" variant="primary" size="md" icon={Utensils}>
                Browse the menu
              </LinkBtn>
            }
          />
        </Card>
      ) : (
        orders.map((order) => (
          <Card key={order.id} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/50 px-5 py-4">
              <div>
                <p className="text-[14px] font-extrabold text-ink-900">
                  {order.order_code} <span className="font-semibold text-ink-400">·</span> {ghs(order.total)}
                </p>
                <p className="text-[12.5px] text-ink-500">
                  {order.created_at} · {order.outlet} · {order.order_type}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={order.status} />
                <Badge tone={order.payment_status === 'paid' ? 'success' : 'neutral'}>
                  {order.payment_status === 'paid' ? 'Paid' : order.payment_method === 'paystack' ? 'Payment pending' : 'Pay on delivery'}
                </Badge>
              </div>
            </div>
            <div className="px-5 py-4">
              <ul className="space-y-1.5">
                {order.items.map((line) => (
                  <li key={`${line.food_name}-${line.menu_item_id}`} className="flex items-center justify-between text-[13px]">
                    <span className="text-ink-700">
                      {line.food_name} <span className="text-ink-400">× {line.quantity}</span>
                    </span>
                    <span className="font-bold tabular-nums text-ink-900">{ghs(line.line_total)}</span>
                  </li>
                ))}
              </ul>
              <Steps steps={order.steps} />
              <div className="mt-4 flex flex-wrap gap-2">
                {order.tracking_token && (
                  <LinkBtn href={`/track/${order.tracking_token}`} variant="primary" size="sm" icon={Bike}>
                    Track order
                  </LinkBtn>
                )}
                <Button variant="outline" size="sm" icon={RotateCcw} onClick={() => void reorder(order)}>
                  Order again
                </Button>
                {order.payment_status !== 'paid' && order.payment_method === 'paystack' && order.tracking_token && (
                  <LinkBtn href={`/track/${order.tracking_token}`} variant="outline" size="sm" icon={Wallet}>
                    Complete payment
                  </LinkBtn>
                )}
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Add a past order (guest checkout → account)
------------------------------------------------------------------ */
function ClaimOrderCard({ onClaimed }: { onClaimed: () => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await api.post('/customer/orders/claim', { order_code: code.trim(), phone: phone.trim() });
      setMessage('Order added to your account.');
      setCode('');
      setPhone('');
      onClaimed();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-ink-50"
        aria-expanded={open}
      >
        <span className="flex items-center gap-3">
          <IconTile icon={PackageSearch} tone="flame" size="sm" />
          <span>
            <span className="block text-[14px] font-extrabold text-ink-900">Add a past order</span>
            <span className="block text-[12.5px] text-ink-500">Ordered on WhatsApp or as a guest? Bring it into your account.</span>
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <form onSubmit={submit} className="border-t border-ink-100 px-5 py-5">
          {message && (
            <div className="mb-4">
              <Alert tone="green">{message}</Alert>
            </div>
          )}
          {error && (
            <div className="mb-4">
              <Alert tone="red">{error}</Alert>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Order code">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MF-XXXXXXXXXX" required autoComplete="off" />
            </Field>
            <Field label="Phone used to order">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024 000 0000" required inputMode="tel" autoComplete="tel" />
            </Field>
          </div>
          <p className="mb-4 text-xs text-ink-400">
            The code is on the confirmation screen, your receipt and in the tracking link we sent you. We only link an order when both match, so nobody else can add it.
          </p>
          <Button type="submit" variant="primary" size="sm" icon={LinkIcon} loading={busy}>
            Add order
          </Button>
        </form>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------
   Addresses
------------------------------------------------------------------ */
function AddressesTab() {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.get<{ addresses: any[] }>('/customer/addresses');
      setAddresses(d.addresses);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = Object.fromEntries(new FormData(form).entries());
    setAdding(true);
    setError('');
    try {
      await api.post('/customer/addresses', {
        label: String(fd.label || 'Home'),
        address: String(fd.address || ''),
        landmark: String(fd.landmark || ''),
        is_default: Boolean(fd.is_default),
      });
      form.reset();
      setNotice('Address saved.');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: number) {
    try {
      await api.del(`/customer/addresses/${id}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function makeDefault(id: number) {
    await api.post(`/customer/addresses/${id}/default`).catch((err) => setError((err as Error).message));
    await load();
  }

  if (busy) return <Spinner className="py-20" />;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr] lg:items-start">
      <Card className="p-5 md:p-6">
        <h2 className="text-[15px] font-extrabold tracking-tight text-ink-900">Add a delivery address</h2>
        <p className="mt-1 text-[12.5px] text-ink-500">Save the places you order to most, so checkout takes seconds.</p>
        {error && <Alert tone="red">{error}</Alert>}
        {notice && <Alert tone="green">{notice}</Alert>}
        <form onSubmit={add} className="mt-4 space-y-4">
          <Field label="Label">
            <Input name="label" placeholder="Home, Office, Mum's place…" defaultValue="Home" />
          </Field>
          <Field label="Address">
            <Input name="address" placeholder="e.g. Ring Road Central, House 12" required />
          </Field>
          <Field label="Landmark" hint="Helps the rider find you fast.">
            <Input name="landmark" placeholder="e.g. opposite Koala supermarket" />
          </Field>
          <label className="flex items-center gap-2.5 text-[12.5px] font-semibold text-ink-600">
            <input type="checkbox" name="is_default" className="h-4 w-4 accent-mayford-600" />
            Make this my default address
          </label>
          <Button type="submit" variant="primary" size="lg" full icon={MapPin} loading={adding}>
            Save address
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        {addresses.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={MapPin} title="No saved addresses" text="Add one and it will appear here and at checkout." />
          </Card>
        ) : (
          addresses.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <IconTile icon={Home} tone={a.is_default ? 'brand' : 'outline'} size="sm" />
                  <div>
                    <p className="text-[13.5px] font-extrabold text-ink-900">
                      {a.label} {a.is_default ? <Badge tone="brand" className="ml-1">Default</Badge> : null}
                    </p>
                    <p className="text-[12.5px] text-ink-500">{a.address}</p>
                    {a.landmark && <p className="text-[12px] text-ink-400">Landmark: {a.landmark}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {!a.is_default && (
                    <button
                      type="button"
                      onClick={() => void makeDefault(a.id)}
                      className="rounded-tile border border-ink-200 px-3 py-1.5 text-[12px] font-bold text-ink-700 hover:border-ink-300"
                    >
                      Make default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void remove(a.id)}
                    className="rounded-tile border border-red-200 px-2.5 py-1.5 text-red-600 hover:bg-red-50"
                    aria-label="Delete address"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2.3} />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Profile
------------------------------------------------------------------ */
function ProfileTab() {
  const { customer, refresh, signOut } = useCustomer();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwNotice, setPwNotice] = useState('');

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.post('/customer/profile', {
        full_name: String(fd.full_name || ''),
        phone: String(fd.phone || ''),
        marketing_opt_in: Boolean(fd.marketing_opt_in),
      });
      await refresh();
      setNotice('Profile updated.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = Object.fromEntries(new FormData(form).entries());
    setPwBusy(true);
    setPwError('');
    setPwNotice('');
    try {
      await api.post('/customer/password', { current_password: String(fd.current_password || ''), new_password: String(fd.new_password || '') });
      form.reset();
      setPwNotice('Password changed.');
    } catch (err) {
      setPwError((err as Error).message);
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <Card className="p-5 md:p-6">
        <h2 className="text-[15px] font-extrabold tracking-tight text-ink-900">Your details</h2>
        {error && <Alert tone="red">{error}</Alert>}
        {notice && <Alert tone="green">{notice}</Alert>}
        <form onSubmit={saveProfile} className="mt-4 space-y-4">
          <Field label="Full name">
            <Input name="full_name" defaultValue={customer?.full_name} required />
          </Field>
          <Field label="Phone number">
            <Input name="phone" inputMode="tel" defaultValue={customer?.phone || ''} placeholder="024 000 0000" />
          </Field>
          <Field label="Email address" hint="Contact us to change the email on your account.">
            <Input value={customer?.email || ''} disabled />
          </Field>
          <label className="flex items-center gap-2.5 text-[12.5px] font-semibold text-ink-600">
            <input type="checkbox" name="marketing_opt_in" defaultChecked={customer?.marketing_opt_in} className="h-4 w-4 accent-mayford-600" />
            Send me offers and new menu announcements
          </label>
          <Button type="submit" variant="primary" size="lg" full icon={BadgeCheck} loading={busy}>
            Save changes
          </Button>
        </form>
      </Card>

      <div className="space-y-5">
        <Card className="p-5 md:p-6">
          <h2 className="text-[15px] font-extrabold tracking-tight text-ink-900">Change password</h2>
          {pwError && <Alert tone="red">{pwError}</Alert>}
          {pwNotice && <Alert tone="green">{pwNotice}</Alert>}
          <form onSubmit={changePassword} className="mt-4 space-y-4">
            <Field label="Current password">
              <Input name="current_password" type="password" required autoComplete="current-password" />
            </Field>
            <Field label="New password" hint="At least 8 characters, with a letter and a number.">
              <Input name="new_password" type="password" required autoComplete="new-password" />
            </Field>
            <Button type="submit" variant="outline" size="lg" full icon={ShieldCheck} loading={pwBusy}>
              Update password
            </Button>
          </form>
        </Card>

        <Card className="p-5 md:p-6">
          <h2 className="text-[15px] font-extrabold tracking-tight text-ink-900">Session</h2>
          <p className="mt-1 text-[12.5px] text-ink-500">
            Signed in since {customer?.last_login_at || customer?.created_at}. Sign out on shared devices.
          </p>
          <Button
            variant="ghost"
            size="md"
            className="mt-4"
            icon={LogOut}
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
          >
            Sign out
          </Button>
        </Card>

        <Card className="p-5 md:p-6">
          <div className="flex items-center gap-3">
            <IconTile icon={Star} tone="flame" size="sm" />
            <div>
              <h2 className="text-[14.5px] font-extrabold text-ink-900">Loyalty</h2>
              <p className="text-[12.5px] text-ink-500">Order direct 5 times and your next delivery is on us.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Bits
------------------------------------------------------------------ */
function StatCard({ icon, label, value, hint }: { icon: typeof User; label: string; value: string; hint: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <IconTile icon={icon} tone="light" size="sm" />
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-400">{label}</p>
          <p className="truncate text-[19px] font-extrabold tabular-nums text-ink-900">{value}</p>
          <p className="truncate text-[12px] text-ink-500">{hint}</p>
        </div>
      </div>
    </Card>
  );
}

function StatusPill({ status }: { status: string }) {
  const cancelled = status.startsWith('Cancelled');
  return <Badge tone={cancelled ? 'danger' : STATUS_TONE[status] || 'neutral'}>{cancelled ? 'Cancelled' : status}</Badge>;
}

function Steps({ steps }: { steps: OrderStep[] }) {
  const completed = useMemo(() => steps.filter((s) => s.done).length, [steps]);
  if (!steps?.length) return null;
  return (
    <div className="mt-3">
      <div className="h-1.5 w-full overflow-hidden rounded-tile bg-ink-100">
        <div className="h-full rounded-tile bg-mayford-600 transition-all" style={{ width: `${(completed / steps.length) * 100}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-semibold text-ink-500">
        {steps.map((step) => (
          <span key={step.key} className={`inline-flex items-center gap-1 ${step.done ? 'text-ink-800' : 'text-ink-400'}`}>
            {step.done ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success-600" strokeWidth={2.4} />
            ) : (
              <span className="h-3 w-3 rounded-full border border-ink-200" />
            )}
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}

