import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, KeyRound, Lock, ShieldCheck, User } from 'lucide-react';
import { api } from '../../api';
import { Alert, Button, Field, IconTile, Input } from '../../components/ui';

/** Shared shell for the two-step admin gate. */
function AuthShell({
  icon,
  step,
  title,
  subtitle,
  children,
}: {
  icon: typeof KeyRound;
  step: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 p-4">
      <div className="pointer-events-none absolute inset-0  opacity-20" aria-hidden="true" />

      <div className="relative w-full max-w-[26rem] rounded-card border border-ink-200 bg-white p-7 sm:p-8">
        <div className="flex items-center gap-3">
          <img src="/assets/images/logo.png" alt="" className="h-10 w-10 rounded-tile object-cover ring-1 ring-ink-900/5" />
          <div>
            <p className="text-[14px] font-semibold tracking-tight text-ink-900">Mayford Foods</p>
            <p className="text-[12px] font-semibold text-mayford-600">Admin console</p>
          </div>
        </div>

        <div className="mt-7 flex items-center gap-3">
          <IconTile icon={icon} tone="brand" />
          <div>
            <p className="text-[12px] font-semibold text-ink-400">{step}</p>
            <h1 className="text-[20px] font-semibold tracking-tight text-ink-900">{title}</h1>
          </div>
        </div>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-500">{subtitle}</p>

        <div className="mt-6">{children}</div>

        <div className="mt-6 flex items-center justify-between border-t border-ink-100 pt-5">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink-500 transition hover:text-ink-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.4} /> Back to website
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-400">
            <ShieldCheck className="h-3.5 w-3.5 text-success-600" strokeWidth={2.4} /> Secure access
          </span>
        </div>
      </div>
    </div>
  );
}

/** Admin PIN gate (original admin-pin.php) */
export function AdminPinPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/admin-pin', { pin });
      navigate('/admin/login');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      icon={KeyRound}
      step="Step 1 of 2"
      title="Enter the access PIN"
      subtitle="This gate keeps the admin console separate from the public website."
    >
      {error && <Alert tone="red">{error}</Alert>}
      <form onSubmit={submit}>
        <Field label="Admin PIN">
          <Input
            type="password"
            inputMode="numeric"
            autoFocus
            placeholder="• • • • • •"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            className="text-center text-lg tracking-[0.4em]"
          />
        </Field>
        <Button type="submit" variant="primary" size="lg" full loading={busy} iconRight={ArrowRight}>
          {busy ? 'Checking…' : 'Continue'}
        </Button>
      </form>
    </AuthShell>
  );
}

/** Admin username/password login (original login.php) */
export function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<{ admin_access: boolean }>('/auth/session')
      .then((d) => {
        if (!d.admin_access) {
          // Original behaviour: login.php bounces you to the PIN gate first.
          navigate('/admin-pin', { replace: true });
        }
      })
      .catch(() => undefined);
  }, [navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/login', { username, password });
      navigate('/admin/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      icon={Lock}
      step="Step 2 of 2"
      title="Sign in to the console"
      subtitle="Use the username and password issued to your outlet account."
    >
      {error && <Alert tone="red">{error}</Alert>}
      <form onSubmit={submit}>
        <Field label="Username">
          <div className="relative">
            <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" strokeWidth={2.2} />
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. mainadmin"
              autoComplete="username"
              required
              className="pl-11"
            />
          </div>
        </Field>
        <Field label="Password">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" strokeWidth={2.2} />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              autoComplete="current-password"
              required
              className="pl-11"
            />
          </div>
        </Field>
        <Button type="submit" variant="primary" size="lg" full loading={busy} iconRight={ArrowRight}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  );
}
