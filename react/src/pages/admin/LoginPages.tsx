import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { Btn, Input } from '../../components/ui';

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
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-lg">
        <img src="/assets/images/logo.png" alt="" className="mx-auto mb-4 h-16 w-16 rounded-full object-cover" />
        <h2 className="mb-4 text-2xl font-bold text-mayford">Admin Access</h2>
        {error && <p className="mb-3 font-semibold text-red-600">{error}</p>}
        <form onSubmit={submit}>
          <Input
            type="password"
            placeholder="Enter Admin PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            className="mb-4"
          />
          <Btn type="submit" disabled={busy} className="w-full">
            Continue
          </Btn>
        </form>
        <p className="mt-4 text-sm text-gray-500">
          <Link to="/" className="underline">
            ← Back to website
          </Link>
        </p>
      </div>
    </div>
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

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center p-4"
      style={{ backgroundImage: "url('/assets/images/hero.png')" }}
    >
      <div className="absolute inset-0 bg-black/45" />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/95 p-8 shadow-2xl">
        <div className="text-center">
          <img src="/assets/images/logo.png" alt="" className="mx-auto mb-3 h-20 w-20 rounded-full object-cover" />
          <h2 className="text-2xl font-bold text-mayford">Mayford Foods Admin</h2>
        </div>
        {error && <p className="mt-4 text-center font-semibold text-red-600">{error}</p>}
        <form onSubmit={submit} className="mt-4">
          <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required className="mb-3" />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mb-4"
          />
          <Btn type="submit" disabled={busy} className="w-full !bg-mayford hover:!bg-mayford-dark">
            Login
          </Btn>
        </form>
        <div className="mt-5 text-center text-sm text-gray-600">
          Forgot Password?
          <br />
          Contact Super Admin <span className="font-semibold">0244143271</span>
        </div>
      </div>
    </div>
  );
}
