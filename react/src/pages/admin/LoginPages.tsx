import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { api } from '../../api';
import { Btn, Field, Input } from '../../components/ui';
import { SmartImage } from '../../components/SmartImage';

export function AdminPinPage() {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  // If PIN gate is already unlocked, redirect straight to /admin/login (or dashboard if logged in)
  useEffect(() => {
    api
      .get<{ admin_access: boolean; admin: { id: number } | null }>('/auth/session')
      .then((d) => {
        if (d.admin) {
          navigate('/admin/dashboard', { replace: true });
        } else if (d.admin_access) {
          navigate('/admin/login', { replace: true });
        }
      })
      .catch(() => undefined);
  }, [navigate]);

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
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7] p-4">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8 shadow-soft">
        <div className="mb-6 flex items-center justify-between border-b border-neutral-100 pb-5">
          <div className="flex items-center gap-3">
            <SmartImage
              src="/assets/images/logo.png"
              alt="Mayford Foods"
              sizes="40px"
              eager
              className="h-10 w-10 rounded-md border border-neutral-200 object-cover"
            />
            <div>
              <h1 className="text-base font-bold text-[#111111]">Admin Security Gate</h1>
              <p className="text-xs text-[#6B6B6B]">Step 1 of 2: Verify Staff Security PIN</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-sm bg-[#111111] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            <Lock className="h-3 w-3" />
            <span>Protected</span>
          </span>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-neutral-200 border-l-4 border-l-red-600 bg-[#F7F7F7] px-3.5 py-2.5 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <Field
            label="Staff Security PIN"
            hint="Protected by brute-force rate limiting (max 6 attempts per 10 minutes)."
          >
            <div className="relative">
              <Input
                type={showPin ? 'text' : 'password'}
                placeholder="Enter Admin Security PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoComplete="off"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#111111]"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Btn type="submit" disabled={busy} className="w-full">
            <KeyRound className="h-4 w-4" />
            <span>{busy ? 'Verifying PIN...' : 'Unlock Admin Login'}</span>
          </Btn>
        </form>

        <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4 text-xs text-[#6B6B6B]">
          <Link to="/" className="inline-flex items-center gap-1.5 font-semibold text-[#6B6B6B] hover:text-[#111111]">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to website</span>
          </Link>
          <span>2-Stage Staff Auth</span>
        </div>
      </div>
    </div>
  );
}

export function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<{ admin_access: boolean; admin: { id: number } | null }>('/auth/session')
      .then((d) => {
        if (d.admin) {
          navigate('/admin/dashboard', { replace: true });
        } else if (!d.admin_access) {
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
      const e2 = err as Error & { needPin?: boolean };
      if (e2.needPin) {
        navigate('/admin-pin', { replace: true });
        return;
      }
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function lockPinGate() {
    await api.post('/auth/lock-pin').catch(() => undefined);
    navigate('/admin-pin', { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#111111] p-4">
      <div className="w-full max-w-md rounded-lg border border-neutral-800 bg-white p-8 shadow-lift">
        <div className="mb-6 flex items-center justify-between border-b border-neutral-100 pb-5">
          <div className="flex items-center gap-3">
            <SmartImage
              src="/assets/images/logo.png"
              alt="Mayford Foods"
              sizes="44px"
              eager
              className="h-11 w-11 rounded-md border border-neutral-200 object-cover"
            />
            <div>
              <h1 className="text-lg font-bold text-[#111111]">Mayford Foods Admin</h1>
              <p className="text-xs text-[#6B6B6B]">Step 2 of 2: Staff Account Sign In</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            <ShieldCheck className="h-3 w-3" />
            <span>PIN Verified</span>
          </span>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-neutral-200 border-l-4 border-l-red-600 bg-[#F7F7F7] px-3.5 py-2.5 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <Field label="Staff Username">
            <Input
              placeholder="e.g. mainadmin, adabraka, dzorwulu"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </Field>
          <Field label="Password">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#111111]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Btn type="submit" variant="red" disabled={busy} className="w-full">
            <ShieldCheck className="h-4 w-4" />
            <span>{busy ? 'Signing In...' : 'Sign In to Dashboard'}</span>
          </Btn>
        </form>

        <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4 text-xs text-[#6B6B6B]">
          <button
            type="button"
            onClick={lockPinGate}
            className="inline-flex items-center gap-1 font-semibold text-[#6B6B6B] hover:text-[#111111]"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Lock PIN Gate</span>
          </button>
          <span>
            Support: <strong className="text-[#111111]">0244143271</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
