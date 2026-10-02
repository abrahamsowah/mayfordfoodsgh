import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Check,
  ChefHat,
  Edit3,
  Eye,
  GraduationCap,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Star,
  X,
} from 'lucide-react';
import { api } from '../../api';
import { Alert, Btn, DeleteBtn, EmptyRow, Field, Select, Stars, Textarea } from '../../components/ui';
import type { CateringBooking, ContactMessage, Rating, TrainingApplication } from '../../types';
import { waLink } from '../../utils';

function MetricCard({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-[#111111]">{value}</p>
    </div>
  );
}

/* ============================= RATINGS ============================= */
export function AdminRatings() {
  const [data, setData] = useState<{
    ratings: Rating[];
    total_reviews: number;
    avg_rating: number;
    highest_rating: number;
  } | null>(null);

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
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mayford-600">
          <Star className="h-3.5 w-3.5" />
          <span>Customer Feedback</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111111]">Guest Ratings &amp; Reviews</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard value={data?.total_reviews ?? '...'} label="Total Verified Reviews" />
        <MetricCard value={`${(data?.avg_rating ?? 0).toFixed(1)} / 5.0`} label="Average Guest Rating" />
        <MetricCard value={`${data?.highest_rating ?? 0} / 5`} label="Highest Rating" />
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-[#111111] text-[11px] font-bold uppercase tracking-wider text-white">
                <th className="p-4">ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Service</th>
                <th className="p-4">Rating</th>
                <th className="p-4">Comment</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {!data ? (
                <EmptyRow colSpan={8} text="Loading ratings..." />
              ) : data.ratings.length === 0 ? (
                <EmptyRow colSpan={8} />
              ) : (
                data.ratings.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F7F7F7]">
                    <td className="p-4 font-mono font-bold text-[#6B6B6B]">#{r.id}</td>
                    <td className="p-4 font-bold text-[#111111]">{r.customer_name}</td>
                    <td className="p-4 text-[#6B6B6B]">{r.phone || 'N/A'}</td>
                    <td className="p-4 font-medium text-[#111111]">{r.service_type}</td>
                    <td className="p-4">
                      <Stars n={r.rating} />
                    </td>
                    <td className="max-w-[260px] p-4 text-[#6B6B6B]">{r.comment || 'N/A'}</td>
                    <td className="whitespace-nowrap p-4 text-[#6B6B6B]">
                      {String(r.created_at).slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="p-4 text-right">
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
    api
      .get<{ bookings: CateringBooking[] }>('/admin/catering-bookings')
      .then((d) => setBookings(d.bookings))
      .catch(() => setBookings([]));
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
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mayford-600">
          <ChefHat className="h-3.5 w-3.5" />
          <span>Event Hospitality</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111111]">Outside Catering Bookings</h1>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-[#111111] text-[11px] font-bold uppercase tracking-wider text-white">
                <th className="p-4">ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Event Type</th>
                <th className="p-4">Event Date</th>
                <th className="p-4">Guests</th>
                <th className="p-4">Details</th>
                <th className="p-4">Submitted</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {!bookings ? (
                <EmptyRow colSpan={9} text="Loading bookings..." />
              ) : bookings.length === 0 ? (
                <EmptyRow colSpan={9} />
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#F7F7F7]">
                    <td className="p-4 font-mono font-bold text-[#6B6B6B]">#{b.id}</td>
                    <td className="p-4 font-bold text-[#111111]">{b.customer_name}</td>
                    <td className="p-4 font-medium text-[#111111]">{b.phone}</td>
                    <td className="p-4">
                      <span className="inline-block rounded-sm border border-neutral-300 bg-[#F7F7F7] px-2.5 py-0.5 text-[11px] font-semibold text-[#111111]">
                        {b.event_type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap p-4 font-semibold text-[#111111]">{b.event_date}</td>
                    <td className="p-4 font-bold tabular-nums text-[#111111]">{b.guest_count}</td>
                    <td className="max-w-[220px] p-4 text-[#6B6B6B]">{b.message || 'N/A'}</td>
                    <td className="whitespace-nowrap p-4 text-[#6B6B6B]">
                      {String(b.created_at).slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="p-4 text-right">
                      <DeleteBtn onConfirm={() => remove(b)} />
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

/* ============================= CONTACT MESSAGES ============================= */
export function AdminContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);

  const load = useCallback(() => {
    api
      .get<{ messages: ContactMessage[] }>('/admin/contact-messages')
      .then((d) => setMessages(d.messages))
      .catch(() => setMessages([]));
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
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mayford-600">
          <Mail className="h-3.5 w-3.5" />
          <span>Customer Support</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111111]">Contact &amp; Feedback Messages</h1>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-[#111111] text-[11px] font-bold uppercase tracking-wider text-white">
                <th className="p-4">ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Phone / Email</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Message</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {!messages ? (
                <EmptyRow colSpan={7} text="Loading messages..." />
              ) : messages.length === 0 ? (
                <EmptyRow colSpan={7} />
              ) : (
                messages.map((m) => (
                  <tr key={m.id} className="hover:bg-[#F7F7F7]">
                    <td className="p-4 font-mono font-bold text-[#6B6B6B]">#{m.id}</td>
                    <td className="p-4 font-bold text-[#111111]">{m.full_name}</td>
                    <td className="p-4 font-medium text-[#111111]">{m.email}</td>
                    <td className="p-4">
                      <span className="inline-block rounded-sm border border-neutral-300 bg-[#F7F7F7] px-2.5 py-0.5 text-[11px] font-semibold text-[#111111]">
                        {m.subject}
                      </span>
                    </td>
                    <td className="max-w-[280px] p-4 text-[#6B6B6B]">{m.message}</td>
                    <td className="whitespace-nowrap p-4 text-[#6B6B6B]">
                      {String(m.created_at).slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="p-4 text-right">
                      <DeleteBtn onConfirm={() => remove(m)} />
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

/* ============================= TRAINING APPLICATIONS & CRM ============================= */
export function AdminTrainingApplications() {
  const [apps, setApps] = useState<TrainingApplication[] | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [schoolFilter, setSchoolFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [editingApp, setEditingApp] = useState<TrainingApplication | null>(null);
  const [emailPreviewApp, setEmailPreviewApp] = useState<TrainingApplication | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const load = useCallback(() => {
    api
      .get<{ applications: TrainingApplication[] }>('/admin/training-applications')
      .then((d) => setApps(d.applications))
      .catch(() => setApps([]));
  }, []);
  useEffect(load, [load]);

  async function updateStatus(appId: number, nextStatus: string, nextNotes?: string) {
    try {
      await api.put(`/admin/training-applications/${appId}`, {
        status: nextStatus,
        admin_notes: nextNotes,
      });
      setSavedMsg(`Application #${appId} updated`);
      setTimeout(() => setSavedMsg(''), 3000);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function saveEditForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingApp) return;
    const fd = new FormData(e.currentTarget);
    const nextStatus = String(fd.get('status') || 'New');
    const nextNotes = String(fd.get('admin_notes') || '');
    setEditBusy(true);
    try {
      await api.put(`/admin/training-applications/${editingApp.id}`, {
        status: nextStatus,
        admin_notes: nextNotes,
      });
      setSavedMsg(`Application #${editingApp.id} updated`);
      setEditingApp(null);
      load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setEditBusy(false);
    }
  }

  async function remove(a: TrainingApplication) {
    try {
      await api.del(`/admin/training-applications/${a.id}`);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  const filtered = useMemo(() => {
    let list = apps || [];
    if (statusFilter !== 'All') {
      list = list.filter((a) => (a.status || 'New').toLowerCase() === statusFilter.toLowerCase());
    }
    if (schoolFilter !== 'All') {
      list = list.filter((a) => a.training_school === schoolFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.full_name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.phone.includes(q) ||
          (a.application_ref && a.application_ref.toLowerCase().includes(q)) ||
          a.program.toLowerCase().includes(q)
      );
    }
    return list;
  }, [apps, statusFilter, schoolFilter, search]);

  const counts = useMemo(() => {
    const list = apps || [];
    return {
      total: list.length,
      new: list.filter((a) => (a.status || 'New') === 'New').length,
      contacted: list.filter((a) => a.status === 'Contacted').length,
      admitted: list.filter((a) => a.status === 'Admitted').length,
    };
  }, [apps]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-6 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mayford-600">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Admissions CRM</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111111]">
            Training Academy Applications
          </h1>
          <p className="mt-1 text-xs text-[#6B6B6B]">
            Follow up with prospective culinary students, update admission pipelines, and review dispatched confirmation emails.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-3 md:border-t-0 md:pt-0">
          <div className="rounded-md border border-neutral-200 bg-[#F7F7F7] px-3.5 py-2 text-xs">
            <span className="text-[#6B6B6B]">Total Applicants:</span>{' '}
            <strong className="font-bold text-[#111111]">{counts.total}</strong>
          </div>
          <div className="rounded-md border border-neutral-200 bg-mayford-50 px-3.5 py-2 text-xs">
            <span className="text-mayford-700">New Inquiries:</span>{' '}
            <strong className="font-bold text-mayford-800">{counts.new}</strong>
          </div>
          <div className="rounded-md border border-neutral-200 bg-emerald-50 px-3.5 py-2 text-xs">
            <span className="text-emerald-700">Admitted:</span>{' '}
            <strong className="font-bold text-emerald-800">{counts.admitted}</strong>
          </div>
        </div>
      </div>

      {savedMsg && <Alert tone="green">{savedMsg}</Alert>}

      {/* Filter Strip */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1.5">
            {['All', 'New', 'Contacted', 'Interview Scheduled', 'Admitted', 'Archived'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === st
                    ? 'bg-[#111111] text-white'
                    : 'border border-neutral-200 bg-[#F7F7F7] text-[#6B6B6B] hover:border-neutral-300 hover:text-[#111111]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
              className="!w-44 !py-1.5 !text-xs"
            >
              <option value="All">All Schools</option>
              <option value="School of Culinary Arts">School of Culinary Arts</option>
              <option value="School of Restaurant Management">School of Restaurant Management</option>
              <option value="School of Hospitality Excellence">School of Hospitality Excellence</option>
            </Select>

            <div className="relative w-48">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, ref..."
                className="w-full rounded-md border border-neutral-300 bg-white py-1.5 pl-8 pr-2.5 text-xs text-[#111111] outline-none focus:border-[#111111]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-[#111111] text-[11px] font-bold uppercase tracking-wider text-white">
                <th className="p-4">Ref &amp; Date</th>
                <th className="p-4">Applicant</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Department &amp; Programme</th>
                <th className="p-4">Status</th>
                <th className="p-4">Follow-Up Notes</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {!apps ? (
                <EmptyRow colSpan={7} text="Loading applications..." />
              ) : filtered.length === 0 ? (
                <EmptyRow colSpan={7} text="No applications match the selected filters." />
              ) : (
                filtered.map((a) => {
                  const ref = a.application_ref || `MFA-${a.id}`;
                  const currentStatus = a.status || 'New';
                  const waAdmissionsMsg = `Mayford Training Academy: Hello ${a.full_name}, regarding your application (${ref}) for ${a.program}...`;

                  return (
                    <tr key={a.id} className="hover:bg-[#F7F7F7]">
                      <td className="p-4">
                        <span className="font-mono font-bold text-mayford-700">{ref}</span>
                        <p className="mt-0.5 text-[10px] text-[#6B6B6B]">
                          {String(a.created_at).slice(0, 16).replace('T', ' ')}
                        </p>
                      </td>
                      <td className="p-4 font-bold text-[#111111]">
                        <p>{a.full_name}</p>
                        {a.message && (
                          <p className="mt-1 line-clamp-1 text-[11px] font-normal text-[#6B6B6B]">
                            "{a.message}"
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-[#111111]">{a.phone}</p>
                        <p className="text-[11px] text-[#6B6B6B]">{a.email}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <a
                            href={waLink(a.phone, waAdmissionsMsg)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:underline"
                          >
                            <MessageCircle className="h-3 w-3" />
                            <span>WhatsApp</span>
                          </a>
                          <a
                            href={`tel:${a.phone}`}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-neutral-600 hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            <span>Call</span>
                          </a>
                        </div>
                      </td>
                      <td className="max-w-[240px] p-4">
                        <p className="font-semibold text-[#111111]">{a.training_school}</p>
                        <span className="mt-1 inline-block rounded-sm border border-neutral-300 bg-[#F7F7F7] px-2 py-0.5 text-[10px] font-semibold text-[#111111]">
                          {a.program}
                        </span>
                      </td>
                      <td className="p-4">
                        <select
                          value={currentStatus}
                          onChange={(e) => updateStatus(a.id, e.target.value, a.admin_notes || '')}
                          className={`rounded px-2.5 py-1 text-xs font-semibold outline-none ${
                            currentStatus === 'Admitted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : currentStatus === 'Contacted'
                              ? 'bg-blue-100 text-blue-800'
                              : currentStatus === 'Interview Scheduled'
                              ? 'bg-amber-100 text-amber-800'
                              : currentStatus === 'Archived'
                              ? 'bg-neutral-200 text-neutral-600'
                              : 'bg-mayford-100 text-mayford-800'
                          }`}
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Interview Scheduled">Interview Scheduled</option>
                          <option value="Admitted">Admitted</option>
                          <option value="Archived">Archived</option>
                        </select>
                      </td>
                      <td className="max-w-[200px] p-4 text-[#6B6B6B]">
                        <p className="line-clamp-2 text-[11px]">{a.admin_notes || 'No follow-up notes yet.'}</p>
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {a.confirmation_email_html && (
                            <button
                              type="button"
                              onClick={() => setEmailPreviewApp(a)}
                              title="View dispatched branded confirmation email"
                              className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#111111] hover:border-[#111111]"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Email</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingApp(a)}
                            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#111111] hover:border-[#111111]"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                          <DeleteBtn confirmText="Delete this training application?" onConfirm={() => remove(a)} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Application / Follow-Up Modal */}
      {editingApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setEditingApp(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-6 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-mayford-600">
                  Admissions Follow-Up
                </span>
                <h3 className="text-base font-bold text-[#111111]">
                  {editingApp.full_name} ({editingApp.application_ref || `MFA-${editingApp.id}`})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingApp(null)}
                className="rounded-md p-1 text-neutral-400 hover:text-[#111111]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={saveEditForm} className="space-y-4">
              <div className="rounded-md bg-[#F7F7F7] p-3 text-xs space-y-1 text-[#6B6B6B]">
                <p>
                  <strong>School:</strong> {editingApp.training_school}
                </p>
                <p>
                  <strong>Programme:</strong> {editingApp.program}
                </p>
                <p>
                  <strong>Contact:</strong> {editingApp.phone} · {editingApp.email}
                </p>
                {editingApp.message && (
                  <p>
                    <strong>Applicant Message:</strong> "{editingApp.message}"
                  </p>
                )}
              </div>

              <Field label="Admission Status">
                <Select name="status" defaultValue={editingApp.status || 'New'}>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted (Called / WhatsApp sent)</option>
                  <option value="Interview Scheduled">Interview Scheduled</option>
                  <option value="Admitted">Admitted to Cohort</option>
                  <option value="Archived">Archived</option>
                </Select>
              </Field>

              <Field label="Admissions Follow-Up Notes">
                <Textarea
                  name="admin_notes"
                  rows={4}
                  defaultValue={editingApp.admin_notes || ''}
                  placeholder="Record phone calls, interview schedule, candidate background, fee payment status..."
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Btn type="button" variant="outline" onClick={() => setEditingApp(null)}>
                  Cancel
                </Btn>
                <Btn type="submit" variant="red" disabled={editBusy}>
                  <Check className="h-4 w-4" />
                  <span>{editBusy ? 'Saving...' : 'Save Notes'}</span>
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispatched Branded Confirmation Email Preview Modal */}
      {emailPreviewApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setEmailPreviewApp(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-6 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-mayford-600">
                  Dispatched Email Copy
                </span>
                <h3 className="text-base font-bold text-[#111111]">
                  Branded Confirmation: {emailPreviewApp.full_name} ({emailPreviewApp.application_ref})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEmailPreviewApp(null)}
                className="rounded-md p-1 text-neutral-400 hover:text-[#111111]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              className="rounded-md border border-neutral-200 overflow-hidden bg-neutral-50"
              dangerouslySetInnerHTML={{ __html: emailPreviewApp.confirmation_email_html || '<p>No copy stored.</p>' }}
            />

            <div className="mt-4 flex justify-end">
              <Btn type="button" variant="outline" onClick={() => setEmailPreviewApp(null)}>
                Close Preview
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
