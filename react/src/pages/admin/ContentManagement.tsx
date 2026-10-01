import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api';
import { Alert, Btn, DeleteBtn, EmptyRow, Field, Input, Select, Textarea } from '../../components/ui';
import type { AdVideo, Advert, Banner, CommunityMedia, Slide } from '../../types';

/* ============================= ADVERTS ============================= */
export function AdminAdverts() {
  const [adverts, setAdverts] = useState<Advert[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const load = useCallback(() => {
    api.get<{ adverts: Advert[] }>('/adverts?all=1').then((d) => setAdverts(d.adverts)).catch(() => setAdverts([]));
  }, []);
  useEffect(load, [load]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    setSaved('');
    try {
      await api.upload('/admin/adverts', fd);
      setSaved('Advertisement Added Successfully');
      e.currentTarget.reset();
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
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
      <div className="rounded-card border border-ink-100 bg-white p-5 md:p-6">
        <h1 className="mb-4 text-xl font-semibold tracking-tight text-ink-900 md:text-2xl">Add Advertisement Banner</h1>
        {saved && <Alert tone="green">{saved}</Alert>}
        {error && <Alert tone="red">{error}</Alert>}
        <form onSubmit={add} className="grid gap-0 md:grid-cols-2">
          <Field label="Banner Image">
            <Input type="file" accept="image/*" name="banner_image" required />
          </Field>
          <Field label="Title">
            <Input name="title" required />
          </Field>
          <div className="md:col-span-2">
            <Field label="Description">
              <Textarea name="description" rows={3} required />
            </Field>
          </div>
          <Field label="Button Text">
            <Input name="button_text" required />
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
          <div className="flex items-end">
            <Btn type="submit" disabled={busy} className="w-full">
              {busy ? 'Adding…' : 'Add Advertisement'}
            </Btn>
          </div>
        </form>
      </div>

      <div className="rounded-card border border-ink-100 bg-white p-5 md:p-6">
        <h2 className="mb-4 text-[18px] font-semibold tracking-tight text-ink-900">Existing Advertisements</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50/70 text-[11px] font-semibold text-ink-500">
                <th className="px-4 py-3 text-ink-600">ID</th>
                <th className="px-4 py-3 text-ink-600">Image</th>
                <th className="px-4 py-3 text-ink-600">Title</th>
                <th className="px-4 py-3 text-ink-600">Button</th>
                <th className="px-4 py-3 text-ink-600">Status</th>
                <th className="px-4 py-3 text-ink-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {!adverts ? (
                <EmptyRow colSpan={6} text="Loading…" />
              ) : adverts.length === 0 ? (
                <EmptyRow colSpan={6} />
              ) : (
                adverts.map((a) => (
                  <tr key={a.id} className="transition hover:bg-ink-50">
                    <td className="px-4 py-3 text-ink-600">{a.id}</td>
                    <td className="px-4 py-3 text-ink-600">
                      <img
                        src={`/assets/adverts/${a.banner_image}`}
                        onError={(e) => ((e.target as HTMLImageElement).src = `/assets/images/${a.banner_image}`)}
                        alt=""
                        className="h-14 w-24 rounded-lg object-cover"
                      />
                    </td>
                    <td className="p-3 font-semibold">{a.title}</td>
                    <td className="px-4 py-3 text-ink-600">{a.button_text} → {a.button_link}</td>
                    <td className="px-4 py-3 text-ink-600">
                      <span className={`rounded-tile px-3 py-1 text-xs font-semibold ${a.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-ink-600'}`}>
                        {a.status}
                      </span>
                    </td>
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
    </div>
  );
}

/* ============================= BANNERS ============================= */
export function AdminBanners() {
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get<{ banners: Banner[] }>('/banners').then((d) => setBanners(d.banners)).catch(() => setBanners([]));
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

  async function remove(b: Banner) {
    try {
      await api.del(`/admin/banners/${b.id}`);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="rounded-card border border-ink-100 bg-white p-5 md:p-6">
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-ink-900 md:text-2xl">Manage Banners</h2>
      <p className="mb-4 text-sm text-ink-500">These messages scroll in the orange banner at the top of every page.</p>
      {error && <Alert tone="red">{error}</Alert>}
      <form onSubmit={add} className="mb-6 flex max-w-xl gap-2">
        <Input placeholder="Enter banner message" value={text} onChange={(e) => setText(e.target.value)} required />
        <Btn type="submit" disabled={busy}>
          Add Banner
        </Btn>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50/70 text-[11px] font-semibold text-ink-500">
              <th className="px-4 py-3 text-ink-600">ID</th>
              <th className="px-4 py-3 text-ink-600">Message</th>
              <th className="px-4 py-3 text-ink-600">Created</th>
              <th className="px-4 py-3 text-ink-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {!banners ? (
              <EmptyRow colSpan={4} text="Loading…" />
            ) : banners.length === 0 ? (
              <EmptyRow colSpan={4} />
            ) : (
              banners.map((b) => (
                <tr key={b.id} className="transition hover:bg-ink-50">
                  <td className="px-4 py-3 text-ink-600">{b.id}</td>
                  <td className="p-3 font-semibold">{b.banner_text}</td>
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

/* ============================= SLIDES ============================= */
export function AdminSlides() {
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get<{ slides: Slide[] }>('/slides').then((d) => setSlides(d.slides)).catch(() => setSlides([]));
  }, []);
  useEffect(load, [load]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    setSaved('');
    try {
      await api.upload('/admin/slides', fd);
      setSaved('Slide Uploaded Successfully');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
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
      <div className="rounded-card border border-ink-100 bg-white p-5 md:p-6">
        <h2 className="mb-4 text-[18px] font-semibold tracking-tight text-ink-900">Add Hero Slide</h2>
        {saved && <Alert tone="green">{saved}</Alert>}
        {error && <Alert tone="red">{error}</Alert>}
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <Input type="file" accept="image/*" name="image" required />
          <Btn type="submit" disabled={busy}>
            {busy ? 'Uploading…' : 'Upload Slide'}
          </Btn>
        </form>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!slides
          ? null
          : slides.map((s) => (
              <div key={s.id} className="overflow-hidden rounded-card border border-ink-100 bg-white">
                <img src={`/assets/images/${s.image}`} alt="" className="h-40 w-full object-cover" />
                <div className="flex items-center justify-between p-4">
                  <span className="text-sm font-semibold text-ink-600">#{s.id} · {s.image}</span>
                  <DeleteBtn onConfirm={() => remove(s)} />
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
    api.get<{ videos: AdVideo[] }>('/advertisement-videos').then((d) => setVideos(d.videos)).catch(() => setVideos([]));
  }, []);
  useEffect(load, [load]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    setSaved('');
    try {
      await api.upload('/admin/videos', fd);
      setSaved('Video Uploaded Successfully');
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
      <div className="rounded-card border border-ink-100 bg-white p-5 md:p-6">
        <h1 className="mb-4 text-[18px] font-semibold tracking-tight text-ink-900">Upload Advertisement Video</h1>
        {saved && <Alert tone="green">{saved}</Alert>}
        {error && <Alert tone="red">{error}</Alert>}
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <Input type="file" accept="video/*" name="video" required />
          <Btn type="submit" disabled={busy}>
            {busy ? 'Uploading…' : 'Upload Video'}
          </Btn>
        </form>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!videos
          ? null
          : videos.map((v) => (
              <div key={v.id} className="overflow-hidden rounded-card border border-ink-100 bg-white">
                <video controls className="h-44 w-full bg-black object-cover">
                  <source src={`/assets/videos/${v.video_name}`} type="video/mp4" />
                </video>
                <div className="flex items-center justify-between p-4">
                  <span className="truncate text-sm font-semibold text-ink-600">{v.video_name}</span>
                  <DeleteBtn confirmText="Delete this video (file and record)?" onConfirm={() => remove(v)} />
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

/* ============================= COMMUNITY MEDIA ============================= */
export function AdminCommunity() {
  const [media, setMedia] = useState<CommunityMedia[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get<{ media: CommunityMedia[] }>('/community-media').then((d) => setMedia(d.media)).catch(() => setMedia([]));
  }, []);
  useEffect(load, [load]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    setSaved('');
    try {
      await api.upload('/admin/community', fd);
      setSaved('Community Media Added Successfully');
      e.currentTarget.reset();
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
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
      <div className="rounded-card border border-ink-100 bg-white p-5 md:p-6">
        <h1 className="mb-4 text-[18px] font-semibold tracking-tight text-ink-900">Add Community Media</h1>
        {saved && <Alert tone="green">{saved}</Alert>}
        {error && <Alert tone="red">{error}</Alert>}
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <div className="w-44">
            <Field label="Type">
              <Select name="media_type" defaultValue="image">
                <option value="image">Image</option>
                <option value="video">Video</option>
              </Select>
            </Field>
          </div>
          <div className="w-64">
            <Field label="File">
              <Input type="file" name="media" required />
            </Field>
          </div>
          <Btn type="submit" disabled={busy}>
            {busy ? 'Uploading…' : 'Add Media'}
          </Btn>
        </form>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!media
          ? null
          : media.map((m) => (
              <div key={m.id} className="overflow-hidden rounded-card border border-ink-100 bg-white">
                {m.media_type === 'video' ? (
                  <video controls className="h-44 w-full bg-black object-cover">
                    <source src={`/assets/community/${m.file_name}`} type="video/mp4" />
                  </video>
                ) : (
                  <img src={`/assets/community/${m.file_name}`} alt="" className="h-44 w-full object-cover" />
                )}
                <div className="flex items-center justify-between p-4">
                  <span className="truncate text-sm font-semibold text-ink-600">
                    {m.media_type} · {m.file_name}
                  </span>
                  <DeleteBtn confirmText="Delete this media (file and record)?" onConfirm={() => remove(m)} />
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
