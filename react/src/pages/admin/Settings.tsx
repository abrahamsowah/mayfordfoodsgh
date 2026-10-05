import { useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Database,
  Globe,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Radio,
  Save,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../api';
import { Alert, Btn, Field, Input } from '../../components/ui';
import type { Settings as SettingsType } from '../../types';

interface SystemStatus {
  supabase: {
    configured: boolean;
    url: string;
    has_service_role_key: boolean;
    has_anon_key: boolean;
    masked_anon_key: string;
    masked_service_key: string;
    realtime_enabled: boolean;
    realtime_tables: string[];
    rls_enabled_tables_count: number;
    rls_policies_count: number;
  };
  database: {
    mode: string;
    is_supabase: boolean;
    connection_label: string;
    table_counts: Record<string, number>;
  };
  email: {
    provider: string;
    configured: boolean;
    email_from: string;
    masked_key: string;
  };
  payment: {
    provider: string;
    configured: boolean;
    masked_key: string;
  };
  security_audit?: {
    rls_locked: boolean;
    rls_tables_protected: number;
    rls_policies_count: number;
    realtime_enabled: boolean;
    realtime_tables: string[];
    payment_anti_tampering: boolean;
    payment_hmac_sha256_active: boolean;
    payment_currency_enforced: string;
    payment_anti_replay_active: boolean;
    rate_limiting_active: boolean;
    phone_privacy_shield_active: boolean;
    session_security: string;
    timing_safe_pin_auth: boolean;
    scrypt_password_hashing: boolean;
  };
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [message, setMessage] = useState<{ tone: 'green' | 'red'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Resend test state
  const [testEmail, setTestEmail] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const [resendResult, setResendResult] = useState<{ tone: 'green' | 'red'; text: string } | null>(null);

  // Password change state
  const [pwMsg, setPwMsg] = useState<{ tone: 'green' | 'red'; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    api
      .get<{ settings: SettingsType | null }>('/admin/settings')
      .then((d) => setSettings(d.settings))
      .catch(() => undefined);

    api
      .get<SystemStatus>('/admin/system-status')
      .then((d) => setSystemStatus(d))
      .catch(() => undefined);
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true);
    setMessage(null);
    try {
      const d = await api.put<{ message: string }>('/admin/settings', fd);
      setMessage({ tone: 'green', text: d.message || 'Settings Updated Successfully' });
    } catch (err) {
      setMessage({ tone: 'red', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function sendResendTest(e: FormEvent) {
    e.preventDefault();
    if (!testEmail || !testEmail.includes('@')) {
      setResendResult({ tone: 'red', text: 'Please enter a valid recipient email address' });
      return;
    }
    setResendBusy(true);
    setResendResult(null);
    try {
      const res = await api.post<{ ok: boolean; message: string; email_id?: string }>('/admin/resend/test', {
        recipient_email: testEmail.trim(),
      });
      setResendResult({ tone: 'green', text: res.message || 'Test email dispatched via Resend successfully!' });
    } catch (err) {
      setResendResult({ tone: 'red', text: (err as Error).message });
    } finally {
      setResendBusy(false);
    }
  }

  async function submitPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const current_password = String(fd.get('current_password') || '');
    const new_password = String(fd.get('new_password') || '');
    const confirm_password = String(fd.get('confirm_password') || '');

    if (new_password !== confirm_password) {
      setPwMsg({ tone: 'red', text: 'New password and confirmation do not match' });
      return;
    }

    setPwBusy(true);
    setPwMsg(null);
    try {
      const d = await api.put<{ message: string }>('/admin/password', {
        current_password,
        new_password,
      });
      setPwMsg({ tone: 'green', text: d.message || 'Password updated successfully' });
      form.reset();
    } catch (err) {
      setPwMsg({ tone: 'red', text: (err as Error).message });
    } finally {
      setPwBusy(false);
    }
  }

  if (!settings) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-[#6B6B6B]">
        Loading website settings...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top Banner */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mayford-600">
          <Globe className="h-3.5 w-3.5" />
          <span>Platform Configuration</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111111]">
          Cloud Infrastructure &amp; Security Controls
        </h1>
        <p className="mt-1 text-xs text-[#6B6B6B]">
          Manage Supabase PostgreSQL database connections, Realtime subscriptions, Resend email delivery, Paystack payment credentials, and security policies.
        </p>
      </div>

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      {/* Cloud Services Status Strip (Supabase + Resend + Paystack) */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Supabase Status */}
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">Database Engine</span>
            <Database className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-3 text-sm font-bold text-[#111111]">
            {systemStatus?.database.connection_label || 'Supabase / PostgreSQL'}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                systemStatus?.database.is_supabase ? 'bg-emerald-500' : 'bg-emerald-500'
              }`}
            />
            <span className="font-semibold text-emerald-700">Schema Synchronized</span>
          </div>
        </div>

        {/* Resend Email Status */}
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">Email Delivery (Resend)</span>
            <Mail className="h-4 w-4 text-[#111111]" />
          </div>
          <p className="mt-3 text-sm font-bold text-[#111111]">
            {systemStatus?.email.email_from || 'orders@mayfordfoodsgh.com'}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                systemStatus?.email.configured ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span className="font-semibold text-[#111111]">
              {systemStatus?.email.configured ? 'Resend API Active' : 'Resend Key Ready'}
            </span>
          </div>
        </div>

        {/* Paystack Payment Status */}
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">Payment Gateway</span>
            <CreditCard className="h-4 w-4 text-[#09A5DB]" />
          </div>
          <p className="mt-3 text-sm font-bold text-[#111111]">Paystack (Ghana GHS)</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-[#09A5DB]" />
            <span className="font-semibold text-[#09A5DB]">Mobile Money &amp; Cards</span>
          </div>
        </div>
      </div>

      {/* Security Audit & Realtime Publication Panel */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111]">Security &amp; Realtime Subsystem Audit</h2>
              <p className="text-xs text-[#6B6B6B]">
                Active PostgreSQL Row Level Security (RLS), Supabase Realtime publication, and payment anti-fraud engines.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-emerald-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Audited &amp; Locked</span>
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Supabase Realtime Table Subscriptions */}
          <div className="rounded-md border border-neutral-200 bg-[#F7F7F7] p-4">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                Supabase Realtime Tables (Public Catalog)
              </h3>
            </div>
            <p className="mt-1 text-xs text-[#6B6B6B]">
              Registered in <code className="font-mono text-neutral-800">supabase_realtime</code> publication with <code className="font-mono text-neutral-800">REPLICA IDENTITY FULL</code> (Customer orders &amp; PII isolated from public stream):
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(systemStatus?.supabase?.realtime_tables || [
                'visitor_counter',
                'menu_items',
                'menu_categories',
                'banners',
                'advertisement_banners',
                'ratings',
                'website_settings',
              ]).map((table) => (
                <span
                  key={table}
                  className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[11px] font-mono font-medium text-neutral-800 border border-neutral-200"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {table}
                </span>
              ))}
            </div>
          </div>

          {/* Row Level Security & Access Control */}
          <div className="rounded-md border border-neutral-200 bg-[#F7F7F7] p-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                Row Level Security (17 Tables Protected)
              </h3>
            </div>
            <p className="mt-1 text-xs text-[#6B6B6B]">
              Strict policy isolation between public anon key and server service role:
            </p>
            <ul className="mt-2.5 space-y-1.5 text-xs text-neutral-700">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span><strong>Public Anon Key:</strong> Restricted catalog SELECT + validated guest form INSERT only</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span><strong>Customer Privacy Shield:</strong> Direct SELECT/INSERT/UPDATE on orders &amp; staff tables completely blocked</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span><strong>Order Tracking Function:</strong> SECURITY DEFINER RPC requiring phone digits match</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span><strong>Service Role Key:</strong> Authoritative backend pricing, payment verification, and audit logging</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment Anti-Fraud & Transaction Integrity Grid */}
        <div className="mt-4 rounded-md border border-neutral-200 bg-[#F7F7F7] p-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[#09A5DB]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
              Payment Anti-Tampering &amp; Transaction Safeguards
            </h3>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-4 text-xs">
            <div className="rounded bg-white p-2.5 border border-neutral-200">
              <p className="font-bold text-[#111111]">HMAC-SHA256 Token</p>
              <p className="mt-0.5 text-[#6B6B6B]">Signs verified references with amount and status to prevent client tampering.</p>
            </div>
            <div className="rounded bg-white p-2.5 border border-neutral-200">
              <p className="font-bold text-[#111111]">Anti-Replay &amp; Unique Index</p>
              <p className="mt-0.5 text-[#6B6B6B]">Database unique constraint blocks duplicate reuse of Paystack references.</p>
            </div>
            <div className="rounded bg-white p-2.5 border border-neutral-200">
              <p className="font-bold text-[#111111]">Currency (GHS) Enforcement</p>
              <p className="mt-0.5 text-[#6B6B6B]">Server verifies Paystack currency is strictly Ghana Cedis (GHS) before acceptance.</p>
            </div>
            <div className="rounded bg-white p-2.5 border border-neutral-200">
              <p className="font-bold text-[#111111]">Payment Audit Ledger</p>
              <p className="mt-0.5 text-[#6B6B6B]">Immutable append-only ledger logs every gateway verification and webhook event.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Resend Live Email Diagnostics Card */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#111111] text-white">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111]">Resend Email Delivery Test</h2>
              <p className="text-xs text-[#6B6B6B]">
                Send a real test email through Resend to verify your API key and sender domain.
              </p>
            </div>
          </div>
          <span className="rounded-sm bg-neutral-100 px-2.5 py-1 text-[11px] font-mono text-[#111111]">
            RESEND_API_KEY
          </span>
        </div>

        {resendResult && (
          <div className="mb-4">
            <Alert tone={resendResult.tone}>{resendResult.text}</Alert>
          </div>
        )}

        <form onSubmit={sendResendTest} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Recipient Email Address">
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                required
              />
            </Field>
          </div>
          <div>
            <Btn type="submit" variant="red" disabled={resendBusy} className="w-full sm:w-auto">
              <Send className="h-4 w-4" />
              <span>{resendBusy ? 'Sending...' : 'Send Test Email via Resend'}</span>
            </Btn>
          </div>
        </form>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Paystack Configuration */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <div className="mb-5 flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#011B33] text-[#09A5DB]">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#111111]">Paystack Public Key (GHS)</h2>
                <p className="text-xs text-[#6B6B6B]">
                  Used for frontend Paystack inline checkout popup.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#09A5DB] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Active</span>
            </span>
          </div>

          <Field
            label="Paystack Public Key"
            hint="Enter your live (pk_live_...) or test (pk_test_...) Paystack Public Key."
          >
            <Input
              name="paystack_public_key"
              defaultValue={settings.paystack_public_key || 'pk_test_mayfordfoodsgh_public_key'}
              placeholder="pk_live_xxxxxxxxxxxxxxxxxxxxxxxx"
              className="font-mono text-xs"
            />
          </Field>
        </div>

        {/* Contact & Branches */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-2.5 border-b border-neutral-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F7F7F7] text-[#111111]">
              <Phone className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111]">Branch Contact &amp; Operating Hours</h2>
              <p className="text-xs text-[#6B6B6B]">Displayed across the header, footer, and contact pages.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Support Email">
              <Input name="email" type="email" defaultValue={settings.email} required />
            </Field>
            <Field label="Opening Hours">
              <Input name="opening_hours" defaultValue={settings.opening_hours} required />
            </Field>
            <Field label="Adabraka Main Branch Phone">
              <Input name="adabraka_phone" defaultValue={settings.adabraka_phone} required />
            </Field>
            <Field label="Dzorwulu Branch Phone">
              <Input name="dzorwulu_phone" defaultValue={settings.dzorwulu_phone} required />
            </Field>
            <Field label="Facebook Page URL">
              <Input name="facebook_link" type="url" defaultValue={settings.facebook_link} required />
            </Field>
            <Field label="TikTok Profile URL">
              <Input name="tiktok_link" type="url" defaultValue={settings.tiktok_link} required />
            </Field>
          </div>
        </div>

        <div className="flex justify-end">
          <Btn type="submit" variant="red" size="lg" disabled={busy}>
            <Save className="h-4 w-4" />
            <span>{busy ? 'Saving Settings...' : 'Save Website & Payment Settings'}</span>
          </Btn>
        </div>
      </form>

      {/* Admin Security & Password Encryption Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-2.5 border-b border-neutral-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#111111] text-white">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111]">Update Staff Password</h2>
              <p className="text-xs text-[#6B6B6B]">Encrypted with salted scrypt hashing</p>
            </div>
          </div>

          {pwMsg && <Alert tone={pwMsg.tone}>{pwMsg.text}</Alert>}

          <form onSubmit={submitPassword}>
            <Field label="Current Password">
              <Input name="current_password" type="password" placeholder="Enter current password" required />
            </Field>
            <Field label="New Password">
              <Input
                name="new_password"
                type="password"
                minLength={6}
                placeholder="Minimum 6 characters"
                required
              />
            </Field>
            <Field label="Confirm New Password">
              <Input
                name="confirm_password"
                type="password"
                minLength={6}
                placeholder="Re-enter new password"
                required
              />
            </Field>
            <Btn type="submit" disabled={pwBusy} className="w-full">
              <Lock className="h-4 w-4" />
              <span>{pwBusy ? 'Encrypting & Updating...' : 'Update Password'}</span>
            </Btn>
          </form>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-2.5 border-b border-neutral-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111]">Production Security &amp; Cloud Controls</h2>
              <p className="text-xs text-[#6B6B6B]">Active cloud database &amp; messaging safeguards</p>
            </div>
          </div>

          <ul className="space-y-3 text-xs">
            {[
              {
                title: 'Supabase Realtime & Replication',
                desc: '11 dynamic tables registered in supabase_realtime with REPLICA IDENTITY FULL.',
              },
              {
                title: 'Row Level Security & Isolation',
                desc: '16 tables protected with separate policies for Anon Key and Service Role Key.',
              },
              {
                title: 'HMAC-SHA256 Paystack Anti-Fraud',
                desc: 'Authoritative server price calculation, anti-replay index, and currency GHS check.',
              },
              {
                title: '2-Stage Admin Authentication Gate',
                desc: 'Timing-safe SHA-256 PIN comparison and salted scrypt password encryption.',
              },
            ].map((item) => (
              <li
                key={item.title}
                className="flex items-start gap-2.5 rounded-md border border-neutral-200 bg-[#F7F7F7] p-3"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-bold text-[#111111]">{item.title}</p>
                  <p className="mt-0.5 text-[#6B6B6B]">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
