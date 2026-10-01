import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { DeleteBtn, EmptyRow, Stars } from '../../components/ui';
import type { CateringBooking, ContactMessage, Rating, TrainingApplication } from '../../types';

function Card({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-card border border-ink-200 bg-white p-5 text-center shadow-xs">
      <p className="text-3xl font-extrabold text-mayford">{value}</p>
      <p className="mt-1 text-ink-600">{label}</p>
    </div>
  );
}

/* ============================= RATINGS ============================= */
export function AdminRatings() {
  const [data, setData] = useState<{ ratings: Rating[]; total_reviews: number; avg_rating: number; highest_rating: number } | null>(null);

  const load = useCallback(() => {
    api
      .get<{ ratings: Rating[]; total_reviews: number; avg_rating: number; highest_rating: number }>('/admin/ratings')
      .then(setData)
      .catch(() => setData({ ratings: [], total_reviews: 0, avg_rating: 0, highest_rating: 0 }));
  }, []);
  useEffect(load, [load]);

  async function remove(r: Rating) {
    try {
      await api.del(`/admin/ratings/${r.id}`);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-3">
        <Card value={data?.total_reviews ?? '…'} label="Total Reviews" />
        <Card value={`${(data?.avg_rating ?? 0).toFixed(1)} / 5`} label="Average Rating" />
        <Card value={`${data?.highest_rating ?? 0} / 5`} label="Highest Rating" />
      </div>
      <div className="rounded-card border border-ink-200 bg-white p-5 shadow-xs md:p-6">
        <h1 className="mb-5 text-xl font-extrabold tracking-tight text-ink-900 md:text-2xl">Customer Ratings</h1>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50/70 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-500">
                <th className="px-4 py-3 text-ink-600">ID</th>
                <th className="px-4 py-3 text-ink-600">Name</th>
                <th className="px-4 py-3 text-ink-600">Phone</th>
                <th className="px-4 py-3 text-ink-600">Service</th>
                <th className="px-4 py-3 text-ink-600">Rating</th>
                <th className="px-4 py-3 text-ink-600">Comment</th>
                <th className="px-4 py-3 text-ink-600">Date</th>
                <th className="px-4 py-3 text-ink-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {!data ? (
                <EmptyRow colSpan={8} text="Loading…" />
              ) : data.ratings.length === 0 ? (
                <EmptyRow colSpan={8} />
              ) : (
                data.ratings.map((r) => (
                  <tr key={r.id} className="transition hover:bg-ink-50/70">
                    <td className="px-4 py-3 text-ink-600">{r.id}</td>
                    <td className="p-3 font-semibold">{r.customer_name}</td>
                    <td className="px-4 py-3 text-ink-600">{r.phone || '—'}</td>
                    <td className="px-4 py-3 text-ink-600">{r.service_type}</td>
                    <td className="px-4 py-3 text-ink-600">
                      <Stars n={r.rating} />
                    </td>
                    <td className="max-w-[260px] p-3">{r.comment || '—'}</td>
                    <td className="p-3 whitespace-nowrap">{String(r.created_at).slice(0, 16).replace('T', ' ')}</td>
                    <td className="px-4 py-3 text-ink-600">
                      <DeleteBtn confirmText="Delete this rating?" onConfirm={() => remove(r)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================= CATERING BOOKINGS ============================= */
export function AdminCateringBookings() {
  const [bookings, setBookings] = useState<CateringBooking[] | null>(null);

  const load = useCallback(() => {
    api.get<{ bookings: CateringBooking[] }>('/admin/catering-bookings').then((d) => setBookings(d.bookings)).catch(() => setBookings([]));
  }, []);
  useEffect(load, [load]);

  async function remove(b: CateringBooking) {
    try {
      await api.del(`/admin/catering-bookings/${b.id}`);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="rounded-card border border-ink-200 bg-white p-5 shadow-xs md:p-6">
      <h1 className="mb-5 text-xl font-extrabold tracking-tight text-ink-900 md:text-2xl">Catering Bookings</h1>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50/70 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-500">
              <th className="px-4 py-3 text-ink-600">ID</th>
              <th className="px-4 py-3 text-ink-600">Customer</th>
              <th className="px-4 py-3 text-ink-600">Phone</th>
              <th className="px-4 py-3 text-ink-600">Event Type</th>
              <th className="px-4 py-3 text-ink-600">Event Date</th>
              <th className="px-4 py-3 text-ink-600">Guests</th>
              <th className="px-4 py-3 text-ink-600">Message</th>
              <th className="px-4 py-3 text-ink-600">Date Submitted</th>
              <th className="px-4 py-3 text-ink-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {!bookings ? (
              <EmptyRow colSpan={9} text="Loading…" />
            ) : bookings.length === 0 ? (
              <EmptyRow colSpan={9} />
            ) : (
              bookings.map((b) => (
                <tr key={b.id} className="transition hover:bg-ink-50/70">
                  <td className="px-4 py-3 text-ink-600">{b.id}</td>
                  <td className="p-3 font-semibold">{b.customer_name}</td>
                  <td className="px-4 py-3 text-ink-600">{b.phone}</td>
                  <td className="px-4 py-3 text-ink-600">{b.event_type}</td>
                  <td className="p-3 whitespace-nowrap">{b.event_date}</td>
                  <td className="px-4 py-3 text-ink-600">{b.guest_count}</td>
                  <td className="max-w-[220px] p-3">{b.message || '—'}</td>
                  <td className="p-3 whitespace-nowrap">{String(b.created_at).slice(0, 16).replace('T', ' ')}</td>
                  <td className="px-4 py-3 text-ink-600">
                    <DeleteBtn onConfirm={() => remove(b)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================= CONTACT MESSAGES ============================= */
export function AdminContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);

  const load = useCallback(() => {
    api.get<{ messages: ContactMessage[] }>('/admin/contact-messages').then((d) => setMessages(d.messages)).catch(() => setMessages([]));
  }, []);
  useEffect(load, [load]);

  async function remove(m: ContactMessage) {
    try {
      await api.del(`/admin/contact-messages/${m.id}`);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="rounded-card border border-ink-200 bg-white p-5 shadow-xs md:p-6">
      <h1 className="mb-5 text-xl font-extrabold tracking-tight text-ink-900 md:text-2xl">Contact Messages</h1>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50/70 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-500">
              <th className="px-4 py-3 text-ink-600">ID</th>
              <th className="px-4 py-3 text-ink-600">Name</th>
              <th className="px-4 py-3 text-ink-600">Phone / Email</th>
              <th className="px-4 py-3 text-ink-600">Subject</th>
              <th className="px-4 py-3 text-ink-600">Message</th>
              <th className="px-4 py-3 text-ink-600">Date</th>
              <th className="px-4 py-3 text-ink-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {!messages ? (
              <EmptyRow colSpan={7} text="Loading…" />
            ) : messages.length === 0 ? (
              <EmptyRow colSpan={7} />
            ) : (
              messages.map((m) => (
                <tr key={m.id} className="transition hover:bg-ink-50/70">
                  <td className="px-4 py-3 text-ink-600">{m.id}</td>
                  <td className="p-3 font-semibold">{m.full_name}</td>
                  <td className="px-4 py-3 text-ink-600">{m.email}</td>
                  <td className="px-4 py-3 text-ink-600">{m.subject}</td>
                  <td className="max-w-[280px] p-3">{m.message}</td>
                  <td className="p-3 whitespace-nowrap">{String(m.created_at).slice(0, 16).replace('T', ' ')}</td>
                  <td className="px-4 py-3 text-ink-600">
                    <DeleteBtn onConfirm={() => remove(m)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================= TRAINING APPLICATIONS ============================= */
export function AdminTrainingApplications() {
  const [apps, setApps] = useState<TrainingApplication[] | null>(null);

  const load = useCallback(() => {
    api.get<{ applications: TrainingApplication[] }>('/admin/training-applications').then((d) => setApps(d.applications)).catch(() => setApps([]));
  }, []);
  useEffect(load, [load]);

  async function remove(a: TrainingApplication) {
    try {
      await api.del(`/admin/training-applications/${a.id}`);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="rounded-card border border-ink-200 bg-white p-5 shadow-xs md:p-6">
      <h1 className="mb-5 text-xl font-extrabold tracking-tight text-ink-900 md:text-2xl">Training Applications</h1>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50/70 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-500">
              <th className="px-4 py-3 text-ink-600">ID</th>
              <th className="px-4 py-3 text-ink-600">Name</th>
              <th className="px-4 py-3 text-ink-600">Phone</th>
              <th className="px-4 py-3 text-ink-600">Email</th>
              <th className="px-4 py-3 text-ink-600">Training School</th>
              <th className="px-4 py-3 text-ink-600">Program</th>
              <th className="px-4 py-3 text-ink-600">Message</th>
              <th className="px-4 py-3 text-ink-600">Date</th>
              <th className="px-4 py-3 text-ink-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {!apps ? (
              <EmptyRow colSpan={9} text="Loading…" />
            ) : apps.length === 0 ? (
              <EmptyRow colSpan={9} />
            ) : (
              apps.map((a) => (
                <tr key={a.id} className="transition hover:bg-ink-50/70">
                  <td className="px-4 py-3 text-ink-600">{a.id}</td>
                  <td className="p-3 font-semibold">{a.full_name}</td>
                  <td className="px-4 py-3 text-ink-600">{a.phone}</td>
                  <td className="px-4 py-3 text-ink-600">{a.email}</td>
                  <td className="px-4 py-3 text-ink-600">{a.training_school}</td>
                  <td className="px-4 py-3 text-ink-600">{a.program}</td>
                  <td className="max-w-[220px] p-3">{a.message || '—'}</td>
                  <td className="p-3 whitespace-nowrap">{String(a.created_at).slice(0, 16).replace('T', ' ')}</td>
                  <td className="px-4 py-3 text-ink-600">
                    <DeleteBtn onConfirm={() => remove(a)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
