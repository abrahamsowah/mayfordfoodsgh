import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useAdminSession, prettyRole } from '../../components/AdminLayout';
import type { DashStats } from '../../types';
import { ghs } from '../../utils';

interface Toast {
  id: number;
  text: string;
}

function Card({
  to,
  value,
  label,
  valueClass = 'text-mayford',
  children,
}: {
  to?: string;
  value: React.ReactNode;
  label: string;
  valueClass?: string;
  children?: React.ReactNode;
}) {
  const inner = (
    <>
      <p className={`text-3xl font-extrabold ${valueClass}`}>{value}</p>
      <p className="mt-2 text-gray-700">{label}</p>
      {children}
    </>
  );
  const cls =
    'block rounded-2xl bg-white p-6 text-center shadow-md transition hover:-translate-y-1 hover:shadow-xl';
  return to ? (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export default function AdminDashboard() {
  const { admin } = useAdminSession();
  const [stats, setStats] = useState<DashStats | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const soundRef = useRef<HTMLAudioElement | null>(null);
  const notified = useRef({ orders: false, applications: false, messages: false });
  const toastId = useRef(0);

  // New-notification sound (original assets/sounds/notification.wav)
  useEffect(() => {
    soundRef.current = new Audio('/assets/sounds/notification.wav');
  }, []);

  function pushToast(text: string) {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
    try {
      if (soundRef.current) {
        soundRef.current.currentTime = 0;
        void soundRef.current.play().catch(() => undefined);
      }
    } catch {
      /* audio blocked until first user interaction */
    }
  }

  async function loadStats() {
    try {
      const d = await api.get<{ role: string; stats: DashStats }>('/admin/stats');
      setStats(d.stats);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void loadStats();
  }, []);

  // Notification polling every 5s (original check-notifications.php loop)
  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const d = await api.get<{ orders: number; applications: number; messages: number }>('/admin/notifications');
        if (stop) return;
        if (d.orders > 0 && !notified.current.orders) {
          notified.current.orders = true;
          pushToast('New Order Received');
        }
        if (d.applications > 0 && !notified.current.applications) {
          notified.current.applications = true;
          pushToast('New Training Application Received');
        }
        if (d.messages > 0 && !notified.current.messages) {
          notified.current.messages = true;
          pushToast('New Contact Message Received');
        }
        // Reset flags once the admin has viewed them (counts return to 0)
        if (d.orders === 0) notified.current.orders = false;
        if (d.applications === 0) notified.current.applications = false;
        if (d.messages === 0) notified.current.messages = false;
      } catch {
        /* ignore */
      }
    }
    void poll();
    const t = setInterval(poll, 5000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  async function resetRevenue() {
    if (!confirm('Reset all orders and revenue?')) return;
    try {
      await api.del('/admin/orders');
      await loadStats();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  const isSuper = admin?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-md">
        <h1 className="text-2xl font-bold text-mayford">Mayford Foods Admin Dashboard</h1>
        <p className="mt-1 text-gray-700">Welcome, {admin?.name}</p>
        <span className="mt-3 inline-block rounded-full bg-mayford-orange px-4 py-1.5 text-sm font-bold text-white">
          {prettyRole(admin?.role || '')}
        </span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card value={stats ? ghs(stats.revenue) : '…'} label="Total Revenue" valueClass="text-green-600">
          {isSuper && (
            <button
              type="button"
              onClick={resetRevenue}
              className="mt-3 rounded bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700"
            >
              Reset Revenue
            </button>
          )}
        </Card>
        <Card to="/admin/orders" value={stats ? stats.pending_orders : '…'} label="Pending Orders" />
        <Card to="/admin/orders" value={stats ? stats.completed_orders : '…'} label="Completed Orders" />
        <Card to="/admin/orders" value="Orders" label="View Customer Orders" valueClass="text-xl" />
        {isSuper && (
          <>
            <Card to="/admin/menu" value="Menu" label="Manage Menu Items" valueClass="text-xl" />
            <Card to="/admin/categories" value="Categories" label="Manage Categories" valueClass="text-xl" />
            <Card to="/admin/training-applications" value={stats ? stats.training_applications : '…'} label="Training Applications" />
            <Card to="/admin/contact-messages" value={stats ? stats.contact_messages : '…'} label="Contact Messages" />
            <Card
              value={stats && stats.total_visitors !== undefined ? stats.total_visitors.toLocaleString() : '…'}
              label="Total Visitors"
              valueClass="text-blue-600"
            />
          </>
        )}
      </div>

      {/* Toast notifications */}
      <div className="fixed right-5 top-5 z-[80] space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className="rounded-lg bg-green-600 px-5 py-3 font-bold text-white shadow-xl">
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
