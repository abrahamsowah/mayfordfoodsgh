import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Bell, Check, Edit3, Film, Image as ImageIcon, Megaphone, Plus, Users, X } from 'lucide-react';
import { api } from '../../api';
import { Alert, Btn, DeleteBtn, EmptyRow, Field, Input, Select, Textarea } from '../../components/ui';
import type { AdVideo, Advert, Banner, CommunityMedia, Slide } from '../../types';

const COMMUNITY_PRESETS = [
  { file: 'community1.png', label: 'Meal Donation Drive' },
  { file: 'community2.png', label: 'Youth Mentorship' },
  { file: 'community5.png', label: 'Welfare Outreach' },
];

/* ============================= ADVERTS ============================= */
export function AdminAdverts() {
  const [adverts, setAdverts] = useState<Advert[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [editing, setEditing] = useState<Advert | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const load = useCallback(() => {
    api
      .get<{ adverts: Advert[] }>('/adverts?all=1')
      .then((d) => setAdverts(d.adverts))
      .catch(() => setAdverts([]));
  }, []);
  useEffect(load, [load]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    setError('');
    setSaved('');
    try {
      await api.upload('/admin/adverts', fd);
      setSaved('Advertisement Added Successfully');
      form.reset();
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    setEditBusy(true);
    setError('');
    try {
      await api.uploadPut(`/admin/adverts/${editing.id}`, fd);
      setSaved(`Updated advertisement "${editing.title}"`);
      setEditing(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEditBusy(false);
    }
  }

  async function toggleStatus(a: Advert) {
    const fd = new FormData();
    fd.set('status', a.status === 'Active' ? 'Inactive' : 'Active');
    try {
      await api.uploadPut(`/admin/adverts/${a.id}`, fd);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function remove(a: Advert) {
    try {
      await api.del(`/admin/adverts/${a.id}`);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="mb-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mayford-600">
            <Megaphone className="h-3.5 w-3.5" />
            <span>Marketing Campaigns</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111111]">
            Promotional Banners &amp; Offers
          </h1>
          <p className="mt-1 text-xs text-[#6B6B6B]">
            Add new promotional campaigns or edit existing offers displayed on the homepage.
          </p>
        </div>
        {saved && <Alert tone="green">{saved}</Alert>}
        {error && <Alert tone="red">{error}</Alert>}
        <form onSubmit={add} className="grid gap-4 md:grid-cols-2">
          <Field label="Banner Image">
            <Input type="file" accept="image/*" name="banner_image" required />
          </Field>
          <Field label="Campaign Title">
            <Input name="title" placeholder="e.g. Fresh Jollof Special" required />
          </Field>
          <div className="md:col-span-2">
            <Field label="Description">
              <Textarea name="description" rows={3} placeholder="Promotional details..." required />
            </Field>
          </div>
          <Field label="Button Text">
            <Input name="button_text" placeholder="Order Now" required />
          </Field>
          <Field label="Button Link">
            <Input name="button_link" placeholder="/menu" required />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue="Active">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </Field>
          <div className="flex items-end pb-4">
            <Btn type="submit" variant="red" disabled={busy} className="w-full">
              <Plus className="h-4 w-4" />
              <span>{busy ? 'Publishing...' : 'Publish Advertisement'}</span>
            </Btn>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 p-5">
          <h2 className="text-base font-bold text-[#111111]">Active &amp; Archived Advertisements</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[740px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-[#111111] text-[11px] font-bold uppercase tracking-wider text-white">
                <th className="p-4">ID</th>
                <th className="p-4">Image</th>
                <th className="p-4">Title &amp; Copy</th>
                <th className="p-4">Button CTA</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {!adverts ? (
                <EmptyRow colSpan={6} text="Loading advertisements..." />
              ) : adverts.length === 0 ? (
                <EmptyRow colSpan={6} />
              ) : (
                adverts.map((a) => (
                  <tr key={a.id} className="hover:bg-[#F7F7F7]">
                    <td className="p-4 font-mono font-bold text-[#6B6B6B]">#{a.id}</td>
                    <td className="p-4">
                      <img
                        src={`/assets/adverts/${a.banner_image}`}
                        onError={(e) => ((e.target as HTMLImageElement).src = `/assets/images/${a.banner_image}`)}
                        alt=""
                        className="h-12 w-20 rounded-md border border-neutral-200 object-cover"
                      />
                    </td>
                    <td className="max-w-[260px] p-4">
                      <p className="font-bold text-[#111111]">{a.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-[#6B6B6B]">{a.description}</p>
                    </td>
                    <td className="p-4 text-[#6B6B6B]">
                      {a.button_text} ({a.button_link})
                    </td>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => toggleStatus(a)}
                        className={`inline-block rounded-sm px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                          a.status === 'Active' ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-[#111111]'
                        }`}
                      >
                        {a.status}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing(a)}
                          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#111111]"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <DeleteBtn onConfirm={() => remove(a)} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Advertisement Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-6 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-base font-bold text-[#111111]">Edit Advertisement #{editing.id}</h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md p-1 text-neutral-400 hover:text-[#111111]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={saveEdit} className="space-y-3">
              <Field label="Title">
                <Input name="title" defaultValue={editing.title} required />
              </Field>
              <Field label="Description">
                <Textarea name="description" rows={3} defaultValue={editing.description} required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Button Text">
                  <Input name="button_text" defaultValue={editing.button_text} required />
                </Field>
                <Field label="Button Link">
                  <Input name="button_link" defaultValue={editing.button_link} required />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Status">
                  <Select name="status" defaultValue={editing.status}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </Select>
                </Field>
                <Field label="Replace Image (Optional)">
                  <Input type="file" accept="image/*" name="banner_image" />
                </Field>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Btn type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Btn>
                <Btn type="submit" variant="red" disabled={editBusy}>
                  <Check className="h-4 w-4" />
                  <span>{editBusy ? 'Saving...' : 'Save Changes'}</span>
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================= BANNERS ============================= */
export function AdminBanners() {
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const load = useCallback(() => {
    api
      .get<{ banners: Banner[] }>('/banners')
      .then((d) => setBanners(d.banners))
      .catch(() => setBanners([]));
  }, []);
  useEffect(load, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/admin/banners', { banner_text: text });
      setText('');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: number) {
    if (!editText.trim()) return;
    try {
      await api.put(`/admin/banners/${id}`, { banner_text: editText.trim() });
      setEditingId(null);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function remove(b: Banner) {
    try {
      await api.del(`/admin/banners/${b.id}`);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mayford-600">
          <Bell className="h-3.5 w-3.5" />
          <span>Top Announcement Strip</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111111]">Manage Header Announcements</h1>
        <p className="mt-1 mb-5 text-xs text-[#6B6B6B]">
          Add, edit, or remove announcements scrolling in the top bar across all public pages.
        </p>
        {error && <Alert tone="red">{error}</Alert>}
        <form onSubmit={add} className="flex max-w-2xl gap-2">
          <Input
            placeholder="Enter announcement text..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
          <Btn type="submit" variant="red" disabled={busy}>
            <Plus className="h-4 w-4" />
            <span>Add</span>
          </Btn>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-[#111111] text-[11px] font-bold uppercase tracking-wider text-white">
                <th className="p-4">ID</th>
                <th className="p-4">Announcement Message</th>
                <th className="p-4">Created</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {!banners ? (
                <EmptyRow colSpan={4} text="Loading announcements..." />
              ) : banners.length === 0 ? (
                <EmptyRow colSpan={4} />
              ) : (
                banners.map((b) => (
                  <tr key={b.id} className="hover:bg-[#F7F7F7]">
                    <td className="p-4 font-mono font-bold text-[#6B6B6B]">#{b.id}</td>
                    <td className="p-4 font-bold text-[#111111]">
                      {editingId === b.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="!py-1.5 !text-xs"
                          />
                          <Btn type="button" size="sm" onClick={() => saveEdit(b.id)}>
                            <Check className="h-3.5 w-3.5" />
                            <span>Save</span>
                          </Btn>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1 text-neutral-400 hover:text-[#111111]"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        b.banner_text
                      )}
                    </td>
                    <td className="whitespace-nowrap p-4 text-[#6B6B6B]">
                      {String(b.created_at).slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(b.id);
                            setEditText(b.banner_text);
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#111111]"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <DeleteBtn onConfirm={() => remove(b)} />
                      </div>
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

/* ============================= SLIDES ============================= */
export function AdminSlides() {
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [replacingId, setReplacingId] = useState<number | null>(null);

  const load = useCallback(() => {
    api
      .get<{ slides: Slide[] }>('/slides')
      .then((d) => setSlides(d.slides))
      .catch(() => setSlides([]));
  }, []);
  useEffect(load, [load]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    setError('');
    setSaved('');
    try {
      await api.upload('/admin/slides', fd);
      setSaved('Slide Uploaded Successfully');
      form.reset();
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function replaceSlide(id: number, file: File) {
    const fd = new FormData();
    fd.append('image', file);
    setReplacingId(id);
    try {
      await api.uploadPut(`/admin/slides/${id}`, fd);
      setSaved(`Slide #${id} updated`);
      load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setReplacingId(null);
    }
  }

  async function remove(s: Slide) {
    try {
      await api.del(`/admin/slides/${s.id}`);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mayford-600">
          <ImageIcon className="h-3.5 w-3.5" />
          <span>Landing Page Visuals</span>
        </div>
        <h1 className="mt-1 mb-5 text-2xl font-bold tracking-tight text-[#111111]">Hero Gallery Slides</h1>
        {saved && <Alert tone="green">{saved}</Alert>}
        {error && <Alert tone="red">{error}</Alert>}
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <div className="w-72">
            <Input type="file" accept="image/*" name="image" required />
          </div>
          <Btn type="submit" variant="red" disabled={busy}>
            <Plus className="h-4 w-4" />
            <span>{busy ? 'Uploading...' : 'Upload Slide'}</span>
          </Btn>
        </form>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!slides
          ? null
          : slides.map((s) => (
              <div key={s.id} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                <img src={`/assets/images/${s.image}`} alt="" className="h-44 w-full object-cover" />
                <div className="flex items-center justify-between gap-2 p-4">
                  <span className="truncate text-xs font-bold text-[#111111]">
                    #{s.id} ({s.image})
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#111111]">
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>{replacingId === s.id ? '...' : 'Replace'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void replaceSlide(s.id, f);
                        }}
                      />
                    </label>
                    <DeleteBtn onConfirm={() => remove(s)} />
                  </div>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

/* ============================= VIDEOS ============================= */
export function AdminVideos() {
  const [videos, setVideos] = useState<AdVideo[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api
      .get<{ videos: AdVideo[] }>('/advertisement-videos')
      .then((d) => setVideos(d.videos))
      .catch(() => setVideos([]));
  }, []);
  useEffect(load, [load]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    setError('');
    setSaved('');
    try {
      await api.upload('/admin/videos', fd);
      setSaved('Video Uploaded Successfully');
      form.reset();
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(v: AdVideo) {
    try {
      await api.del(`/admin/videos/${v.id}`);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mayford-600">
          <Film className="h-3.5 w-3.5" />
          <span>Video Showcase</span>
        </div>
        <h1 className="mt-1 mb-5 text-2xl font-bold tracking-tight text-[#111111]">Advertisement Videos</h1>
        {saved && <Alert tone="green">{saved}</Alert>}
        {error && <Alert tone="red">{error}</Alert>}
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <div className="w-72">
            <Input type="file" accept="video/*" name="video" required />
          </div>
          <Btn type="submit" variant="red" disabled={busy}>
            <Plus className="h-4 w-4" />
            <span>{busy ? 'Uploading...' : 'Upload Video'}</span>
          </Btn>
        </form>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!videos
          ? null
          : videos.map((v) => (
              <div key={v.id} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                <video controls className="h-48 w-full bg-black object-cover">
                  <source src={`/assets/videos/${v.video_name}`} type="video/mp4" />
                </video>
                <div className="flex items-center justify-between p-4">
                  <span className="truncate text-xs font-bold text-[#111111]">{v.video_name}</span>
                  <DeleteBtn confirmText="Delete this video (file and record)?" onConfirm={() => remove(v)} />
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

/* ============================= COMMUNITY ACTIVITIES & MEDIA ============================= */
export function AdminCommunity() {
  const [media, setMedia] = useState<CommunityMedia[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [imageMode, setImageMode] = useState<'upload' | 'preset'>('preset');
  const [presetFile, setPresetFile] = useState(COMMUNITY_PRESETS[0].file);
  const [editing, setEditing] = useState<CommunityMedia | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const load = useCallback(() => {
    api
      .get<{ media: CommunityMedia[] }>('/community-media')
      .then((d) => setMedia(d.media))
      .catch(() => setMedia([]));
  }, []);
  useEffect(load, [load]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (imageMode === 'preset') {
      fd.delete('media');
      fd.set('file_name', presetFile);
    }
    setBusy(true);
    setError('');
    setSaved('');
    try {
      await api.upload('/admin/community', fd);
      setSaved('Community Activity Added Successfully');
      form.reset();
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    setEditBusy(true);
    setError('');
    try {
      await api.uploadPut(`/admin/community/${editing.id}`, fd);
      setSaved('Community Activity Updated Successfully');
      setEditing(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEditBusy(false);
    }
  }

  async function remove(m: CommunityMedia) {
    try {
      await api.del(`/admin/community/${m.id}`);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mayford-600">
          <Users className="h-3.5 w-3.5" />
          <span>Social Impact &amp; Outreach</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111111]">
          Manage Community Activities &amp; Media
        </h1>
        <p className="mt-1 mb-5 text-xs text-[#6B6B6B]">
          Post new community outreach activities or edit existing titles, descriptions, photos, and videos.
        </p>

        {saved && <Alert tone="green">{saved}</Alert>}
        {error && <Alert tone="red">{error}</Alert>}

        <form onSubmit={add} className="grid gap-4 md:grid-cols-2">
          <Field label="Activity Title">
            <Input name="title" placeholder="e.g. Accra Neighbourhood Meal Drive" required />
          </Field>
          <Field label="Media Type">
            <Select name="media_type" defaultValue="image">
              <option value="image">Photo (Image)</option>
              <option value="video">Video</option>
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Activity Description">
              <Textarea
                name="description"
                rows={2}
                placeholder="Describe the community outreach programme or food donation event..."
                required
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setImageMode('preset')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  imageMode === 'preset'
                    ? 'bg-[#111111] text-white'
                    : 'border border-neutral-300 bg-white text-[#111111]'
                }`}
              >
                Use Existing Outreach Photo
              </button>
              <button
                type="button"
                onClick={() => setImageMode('upload')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  imageMode === 'upload'
                    ? 'bg-[#111111] text-white'
                    : 'border border-neutral-300 bg-white text-[#111111]'
                }`}
              >
                Upload New Photo / Video
              </button>
            </div>

            {imageMode === 'preset' ? (
              <div className="grid grid-cols-3 gap-3">
                {COMMUNITY_PRESETS.map((p) => (
                  <button
                    key={p.file}
                    type="button"
                    onClick={() => setPresetFile(p.file)}
                    className={`overflow-hidden rounded-md border text-left transition-all ${
                      presetFile === p.file
                        ? 'border-[#111111] ring-2 ring-[#111111]'
                        : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    <img src={`/assets/images/${p.file}`} alt={p.label} className="h-24 w-full object-cover" />
                    <p className="p-2 text-xs font-semibold text-[#111111]">{p.label}</p>
                  </button>
                ))}
              </div>
            ) : (
              <Input type="file" name="media" accept="image/*,video/*" required />
            )}
          </div>

          <div className="md:col-span-2 flex justify-end pt-2">
            <Btn type="submit" variant="red" disabled={busy}>
              <Plus className="h-4 w-4" />
              <span>{busy ? 'Publishing...' : 'Add Community Activity'}</span>
            </Btn>
          </div>
        </form>
      </div>

      {/* Existing Community Activities Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!media
          ? null
          : media.map((m) => (
              <div key={m.id} className="flex flex-col justify-between overflow-hidden rounded-lg border border-neutral-200 bg-white">
                <div>
                  {m.media_type === 'video' ? (
                    <video controls className="h-48 w-full bg-black object-cover">
                      <source src={`/assets/community/${m.file_name}`} type="video/mp4" />
                      <source src={`/assets/videos/${m.file_name}`} type="video/mp4" />
                    </video>
                  ) : (
                    <img
                      src={`/assets/community/${m.file_name}`}
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (!img.dataset.fallback) {
                          img.dataset.fallback = '1';
                          img.src = `/assets/images/${m.file_name}`;
                        }
                      }}
                      alt={m.title || ''}
                      className="h-48 w-full object-cover"
                    />
                  )}
                  <div className="p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-mayford-600">
                      {m.media_type.toUpperCase()} · #{m.id}
                    </span>
                    <h3 className="mt-1 text-sm font-bold text-[#111111]">
                      {m.title || 'Community Outreach Activity'}
                    </h3>
                    {m.description && (
                      <p className="mt-1 text-xs leading-relaxed text-[#6B6B6B]">{m.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-neutral-100 p-4">
                  <button
                    type="button"
                    onClick={() => setEditing(m)}
                    className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#111111]"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit Activity</span>
                  </button>
                  <DeleteBtn confirmText="Delete this community activity?" onConfirm={() => remove(m)} />
                </div>
              </div>
            ))}
      </div>

      {/* Edit Community Activity Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-6 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-base font-bold text-[#111111]">
                Edit Community Activity #{editing.id}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md p-1 text-neutral-400 hover:text-[#111111]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={saveEdit} className="space-y-3">
              <Field label="Activity Title">
                <Input name="title" defaultValue={editing.title || ''} required />
              </Field>
              <Field label="Activity Description">
                <Textarea name="description" rows={3} defaultValue={editing.description || ''} required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Media Type">
                  <Select name="media_type" defaultValue={editing.media_type}>
                    <option value="image">Photo (Image)</option>
                    <option value="video">Video</option>
                  </Select>
                </Field>
                <Field label="Preset Image (Or Upload Below)">
                  <Select name="file_name" defaultValue={editing.file_name}>
                    <option value={editing.file_name}>Keep current ({editing.file_name})</option>
                    {COMMUNITY_PRESETS.map((p) => (
                      <option key={p.file} value={p.file}>
                        {p.label} ({p.file})
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Upload Replacement Photo / Video (Optional)">
                <Input type="file" name="media" accept="image/*,video/*" />
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <Btn type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Btn>
                <Btn type="submit" variant="red" disabled={editBusy}>
                  <Check className="h-4 w-4" />
                  <span>{editBusy ? 'Saving...' : 'Save Changes'}</span>
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
