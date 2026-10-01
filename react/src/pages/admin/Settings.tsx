import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Bike,
  Clock,
  CreditCard,
  KeyRound,
  Mail,
  MessageCircle,
  Plus,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  Share2,
  Trash2,
  Users,
} from 'lucide-react';
import { api } from '../../api';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyRow,
  Field,
  IconTile,
  Input,
  PageHeader,
  Panel,
  Spinner,
  Td,
  Th,
} from '../../components/ui';
import { useAdminSession } from '../../components/AdminLayout';
import type { PaymentGatewayStatus, Settings as SettingsType } from '../../types';

interface AdminRow {
  id: number;
  admin_name: string;
  username: string;
  role: string;
  created_at: string;
}

export default function AdminSettings() {
  const { admin } = useAdminSession();
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [gateway, setGateway] = useState<PaymentGatewayStatus | null>(null);
  const [message, setMessage] = useState<{ tone: 'green' | 'red' | 'orange'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [teamBusy, setTeamBusy] = useState(false);

  const isSuper = admin?.role === 'super_admin';

  const load = useCallback(() => {
    api
      .get<{ settings: SettingsType | null; gateway: PaymentGatewayStatus }>('/admin/settings')
      .then((d) => {
        setSettings(d.settings);
        setGateway(d.gateway);
      })
      .catch(() => undefined);
    api
      .get<{ admins: AdminRow[] }>('/admin/admins')
      .then((d) => setAdmins(d.admins))
      .catch(() => undefined);
  }, []);

  useEffect(load, [load]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true);
    setMessage(null);
    try {
      const d = await api.put<{ message: string }>('/admin/settings', {
        ...fd,
        paystack_enabled: fd.paystack_enabled === 'on',
      });
      setMessage({ tone: 'green', text: d.message || 'Settings updated successfully.' });
      load();
    } catch (err) {
      setMessage({ tone: 'red', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function addAdmin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = Object.fromEntries(new FormData(form).entries());
    setTeamBusy(true);
    setMessage(null);
    try {
      await api.post('/admin/admins', fd);
      form.reset();
      setMessage({ tone: 'green', text: 'Team member added. They can sign in with the PIN + their new password.' });
      load();
    } catch (err) {
      setMessage({ tone: 'red', text: (err as Error).message });
    } finally {
      setTeamBusy(false);
    }
  }

  async function removeAdmin(row: AdminRow) {
    if (!confirm(`Remove ${row.admin_name}? They will lose access immediately.`)) return;
    try {
      await api.del(`/admin/admins/${row.id}`);
      setMessage({ tone: 'green', text: `${row.admin_name} removed.` });
      load();
    } catch (err) {
      setMessage({ tone: 'red', text: (err as Error).message });
    }
  }

  async function resetAdminPassword(row: AdminRow) {
    const next = prompt(`New password for ${row.admin_name} (min 8 chars, letters + numbers):`);
    if (!next) return;
    try {
      await api.put(`/admin/admins/${row.id}/password`, { new_password: next });
      setMessage({ tone: 'green', text: `Password updated for ${row.admin_name}.` });
    } catch (err) {
      setMessage({ tone: 'red', text: (err as Error).message });
    }
  }

  if (!settings) {
    return (
      <div className="py-24">
        <Spinner className="py-0" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        subtitle="Store details, delivery pricing, payments and the admin team."
        action={
          <Badge tone="neutral" icon={Share2}>
            Applies site-wide
          </Badge>
        }
      />

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <form onSubmit={submit} className="space-y-5">
        <Panel title="Contact & delivery" subtitle="Shown in the header, footer, outlet pages and WhatsApp buttons" icon={MessageCircle}>
          <div className="grid gap-x-4 md:grid-cols-2">
            <Field label="Email address">
              <Input name="email" type="email" defaultValue={settings.email} required />
            </Field>
            <Field label="Opening hours">
              <Input name="opening_hours" defaultValue={settings.opening_hours} required />
            </Field>
            <Field label="Adabraka phone" hint="Used for the Adabraka WhatsApp and call buttons.">
              <Input name="adabraka_phone" defaultValue={settings.adabraka_phone} required />
            </Field>
            <Field label="Dzorwulu phone" hint="Used for the Dzorwulu WhatsApp and call buttons.">
              <Input name="dzorwulu_phone" defaultValue={settings.dzorwulu_phone} required />
            </Field>
            <Field label="Delivery fee (GH₵)" hint="Charged on delivery orders below the free-delivery threshold.">
              <Input name="delivery_fee" type="number" step="0.5" min="0" defaultValue={Number(settings.delivery_fee || 0)} />
            </Field>
            <Field label="Free delivery over (GH₵)" hint="Set 0 to always charge the delivery fee.">
              <Input name="free_delivery_over" type="number" step="1" min="0" defaultValue={Number(settings.free_delivery_over || 0)} />
            </Field>
          </div>
          <label className="mt-4 flex items-center gap-3 rounded-tile border border-ink-200 bg-ink-50/60 px-4 py-3 text-[13px] font-semibold text-ink-700">
            <input type="checkbox" name="paystack_enabled" defaultChecked={Number(settings.paystack_enabled ?? 1) === 1} className="h-4 w-4 accent-mayford-600" />
            Offer online payment at checkout (Paystack)
          </label>
        </Panel>

        <Panel title="Social profiles" subtitle="Linked from the footer and contact page" icon={Share2}>
          <div className="grid gap-x-4 md:grid-cols-2">
            <Field label="Facebook page URL">
              <Input name="facebook_link" type="url" defaultValue={settings.facebook_link} required />
            </Field>
            <Field label="TikTok profile URL">
              <Input name="tiktok_link" type="url" defaultValue={settings.tiktok_link} required />
            </Field>
          </div>
        </Panel>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-ink-200 bg-white p-4 shadow-xs">
          <p className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-500">
            <Bike className="h-4 w-4 text-ink-400" strokeWidth={2.3} />
            Bolt Food links live in the contact and outlets pages.
            <span className="hidden items-center gap-2 text-ink-400 sm:inline-flex">
              <Clock className="h-3.5 w-3.5" strokeWidth={2.3} /> Updated {new Date().toLocaleDateString()}
            </span>
          </p>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="md" icon={Mail} onClick={() => window.open(`mailto:${settings.email}`)}>
              Test email link
            </Button>
            <Button type="submit" variant="primary" size="md" icon={Save} loading={busy}>
              {busy ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        </div>
      </form>

      {/* Payments */}
      <Panel title="Payments" subtitle="Paystack is the gateway that receives money for online orders" icon={CreditCard}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconTile icon={CreditCard} tone={gateway?.enabled ? 'brand' : 'outline'} size="sm" />
            <div>
              <p className="text-[13.5px] font-extrabold text-ink-900">
                Paystack {gateway?.enabled ? `· ${gateway.mode} mode` : '· not configured'}
              </p>
              <p className="text-[12.5px] text-ink-500">
                {gateway?.enabled
                  ? `Mobile Money, card and bank transfer in ${gateway.currency}. Webhooks confirm payments automatically.`
                  : 'Add PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY to the server environment (server/.env) and restart the API.'}
              </p>
            </div>
          </div>
          <Badge tone={gateway?.enabled ? 'success' : 'warning'}>{gateway?.enabled ? 'Live' : 'Awaiting keys'}</Badge>
        </div>
        <div className="mt-4 grid gap-3 text-[12.5px] sm:grid-cols-2">
          <div className="rounded-tile border border-ink-200 p-3.5">
            <p className="font-extrabold text-ink-800">Webhook URL</p>
            <p className="break-all font-mono text-[11.5px] text-ink-500">{gateway?.configured?.webhook || '/api/payments/webhook/paystack'}</p>
            <p className="mt-1 text-ink-500">Register this in the Paystack dashboard → Settings → API Keys &amp; Webhooks.</p>
          </div>
          <div className="rounded-tile border border-ink-200 p-3.5">
            <p className="font-extrabold text-ink-800">Security</p>
            <p className="mt-1 text-ink-500">
              Every payment is re-verified server-side and webhook signatures are checked with HMAC-SHA512 before an order is marked paid.
            </p>
          </div>
        </div>
      </Panel>

      {/* Team */}
      <Panel title="Admin team" subtitle="Roles decide what each person can see and change" icon={ShieldCheck}>
        {isSuper && (
          <form onSubmit={addAdmin} className="mb-5 grid gap-3 rounded-tile border border-ink-200 bg-ink-50/50 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <Field label="Full name">
              <Input name="admin_name" placeholder="e.g. Ama Mensah" required />
            </Field>
            <Field label="Username">
              <Input name="username" placeholder="ama" required autoCapitalize="none" />
            </Field>
            <Field label="Password" hint="8+ characters, letters and numbers.">
              <Input name="password" type="password" placeholder="••••••••" required />
            </Field>
            <Field label="Role">
              <select
                name="role"
                className="h-11 w-full rounded-tile border border-ink-200 bg-white px-3.5 text-[13.5px] font-semibold text-ink-700 outline-none focus:border-mayford-500"
                defaultValue="adabraka_admin"
              >
                <option value="adabraka_admin">Adabraka manager</option>
                <option value="dzorwulu_admin">Dzorwulu manager</option>
                <option value="super_admin">Super admin</option>
              </select>
            </Field>
            <Button type="submit" variant="primary" size="md" icon={Plus} loading={teamBusy}>
              Add member
            </Button>
          </form>
        )}

        {admins.length === 0 ? (
          <p className="text-[13px] text-ink-500">{isSuper ? 'No team members yet.' : 'Only super admins can see the team list.'}</p>
        ) : (
          <DataTable
            head={
              <>
                <Th>Name</Th>
                <Th>Username</Th>
                <Th>Role</Th>
                <Th>Added</Th>
                {isSuper && <Th className="!text-right">Actions</Th>}
              </>
            }
          >
            <tbody>
              {admins.length === 0 && <EmptyRow colSpan={isSuper ? 5 : 4} text="No team members yet." />}
              {admins.map((a) => (
                <tr key={a.id}>
                  <Td className="font-bold text-ink-900">{a.admin_name}</Td>
                  <Td className="font-mono text-[12.5px] text-ink-600">{a.username}</Td>
                  <Td>
                    <Badge tone={a.role === 'super_admin' ? 'brand' : 'neutral'}>{a.role.replace(/_/g, ' ')}</Badge>
                  </Td>
                  <Td className="text-[12.5px] text-ink-500">{a.created_at}</Td>
                  {isSuper && (
                    <Td className="!text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void resetAdminPassword(a)}
                          className="inline-flex items-center gap-1.5 rounded-pill border border-ink-200 px-3 py-1.5 text-[12px] font-bold text-ink-700 hover:border-ink-300"
                        >
                          <KeyRound className="h-3.5 w-3.5" strokeWidth={2.3} /> Password
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeAdmin(a)}
                          className="inline-flex items-center gap-1.5 rounded-pill border border-red-200 px-3 py-1.5 text-[12px] font-bold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2.3} /> Remove
                        </button>
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
        <p className="mt-4 flex items-center gap-2 text-[12px] text-ink-500">
          <Users className="h-3.5 w-3.5 text-ink-400" strokeWidth={2.3} />
          Passwords are stored with scrypt hashing — nobody (including us) can read them.
        </p>
      </Panel>
    </div>
  );
}
