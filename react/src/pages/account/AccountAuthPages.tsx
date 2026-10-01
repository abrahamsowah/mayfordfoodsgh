import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, KeyRound, LockKeyhole, Mail, User, UserPlus } from 'lucide-react';
import { api } from '../../api';
import { useCustomer } from '../../context/CustomerContext';
import { Alert, Button, Card, Field, IconTile, Input, Section } from '../../components/ui';

/* ------------------------------------------------------------------
   Shared shell
------------------------------------------------------------------ */
function AuthShell({
  icon,
  title,
  subtitle,
  children,
  footer,
}: {
  icon: typeof User;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Section className="!py-12 md:!py-16">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <IconTile icon={icon} tone="brand" size="lg" className="mx-auto" />
          <h1 className="mt-4 text-[24px] font-extrabold tracking-tight text-ink-900">{title}</h1>
          <p className="mt-1.5 text-[13.5px] text-ink-500">{subtitle}</p>
        </div>
        <Card className="p-6 md:p-7">{children}</Card>
        {footer && <div className="mt-5 text-center text-[13.5px] text-ink-500">{footer}</div>}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------
   Sign in
------------------------------------------------------------------ */
export function CustomerLoginPage() {
  const { signIn } = useCustomer();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/account';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true);
    setError('');
    try {
      await signIn(String(fd.email || ''), String(fd.password || ''));
      navigate(next, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      icon={LockKeyhole}
      title="Welcome back"
      subtitle="Sign in to track orders, reorder favourites and save addresses."
      footer={
        <>
          New here?{' '}
          <Link to="/account/register" className="font-bold text-mayford-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {error && <Alert tone="red">{error}</Alert>}
      <form onSubmit={submit} className="mt-3 space-y-4">
        <Field label="Email address">
          <Input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
        </Field>
        <Button type="submit" variant="primary" size="lg" full icon={ArrowRight} loading={busy}>
          Sign in
        </Button>
      </form>
      <p className="mt-4 text-center text-[12.5px] text-ink-500">
        <Link to="/account/forgot" className="font-semibold text-mayford-700 hover:underline">
          Forgot your password?
        </Link>
      </p>
    </AuthShell>
  );
}

/* ------------------------------------------------------------------
   Create account
------------------------------------------------------------------ */
export function CustomerRegisterPage() {
  const { register } = useCustomer();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true);
    setError('');
    try {
      await register({
        full_name: String(fd.full_name || ''),
        email: String(fd.email || ''),
        phone: String(fd.phone || ''),
        password: String(fd.password || ''),
        marketing_opt_in: Boolean(fd.marketing_opt_in),
      });
      navigate('/account', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      icon={UserPlus}
      title="Create your account"
      subtitle="Order faster, follow every delivery live and keep your order history."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/account/login" className="font-bold text-mayford-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {error && <Alert tone="red">{error}</Alert>}
      <form onSubmit={submit} className="mt-3 space-y-4">
        <Field label="Full name">
          <Input name="full_name" required autoComplete="name" placeholder="e.g. Akosua Mensah" />
        </Field>
        <Field label="Email address">
          <Input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        </Field>
        <Field label="Phone number" hint="So we can call you about deliveries.">
          <Input name="phone" inputMode="tel" required autoComplete="tel" placeholder="024 000 0000" />
        </Field>
        <Field label="Password" hint="At least 8 characters, with a letter and a number.">
          <Input name="password" type="password" required autoComplete="new-password" placeholder="••••••••" />
        </Field>
        <label className="flex items-start gap-2.5 rounded-tile border border-ink-200 bg-ink-50/60 px-3.5 py-3 text-[12.5px] text-ink-600">
          <input type="checkbox" name="marketing_opt_in" className="mt-0.5 h-4 w-4 accent-mayford-600" />
          Send me occasional offers and new menu announcements.
        </label>
        <Button type="submit" variant="primary" size="lg" full icon={ArrowRight} loading={busy}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}

/* ------------------------------------------------------------------
   Forgot password
------------------------------------------------------------------ */
export function CustomerForgotPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true);
    setError('');
    try {
      await api.post('/customer/password/forgot', { email: String(fd.email || '') });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      icon={Mail}
      title="Reset your password"
      subtitle="We will email you a secure link that is valid for one hour."
      footer={
        <Link to="/account/login" className="inline-flex items-center gap-1.5 font-semibold text-mayford-700 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <Alert tone="green">If that email is registered with us, a reset link is on its way. Check your inbox and spam folder.</Alert>
      ) : (
        <>
          {error && <Alert tone="red">{error}</Alert>}
          <form onSubmit={submit} className="mt-3 space-y-4">
            <Field label="Email address">
              <Input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
            </Field>
            <Button type="submit" variant="primary" size="lg" full icon={Mail} loading={busy}>
              Email me a reset link
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}

/* ------------------------------------------------------------------
   Set a new password (from the email link)
------------------------------------------------------------------ */
export function CustomerResetPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (fd.password !== fd.confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.post('/customer/password/reset', { token, new_password: String(fd.password || '') });
      setDone(true);
      setTimeout(() => navigate('/account/login', { replace: true }), 2200);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell icon={KeyRound} title="Choose a new password" subtitle="Make it something you have not used before.">
      {done ? (
        <Alert tone="green">Password updated. Taking you to sign in…</Alert>
      ) : (
        <>
          {!token && <Alert tone="orange">This link is missing its token. Please request a new reset email.</Alert>}
          {error && <Alert tone="red">{error}</Alert>}
          <form onSubmit={submit} className="mt-3 space-y-4">
            <Field label="New password" hint="At least 8 characters, with a letter and a number.">
              <Input name="password" type="password" required autoComplete="new-password" />
            </Field>
            <Field label="Confirm new password">
              <Input name="confirm" type="password" required autoComplete="new-password" />
            </Field>
            <Button type="submit" variant="primary" size="lg" full icon={LockKeyhole} loading={busy} disabled={!token}>
              Update password
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}

