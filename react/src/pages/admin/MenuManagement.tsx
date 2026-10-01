import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Check, Plus, Tags, UtensilsCrossed } from 'lucide-react';
import { api } from '../../api';
import {
  Alert,
  Btn,
  DeleteBtn,
  EmptyRow,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '../../components/ui';
import type { Category, MenuItem } from '../../types';
import { effectivePrice, ghs } from '../../utils';

function useMenuItemForm(editing: MenuItem | null, defaultCategory?: string) {
  const [foodName, setFoodName] = useState(editing?.food_name || '');
  const [category, setCategory] = useState(editing?.category || defaultCategory || '');
  const [description, setDescription] = useState(editing?.description || '');
  const [price, setPrice] = useState(editing ? String(editing.price) : '');
  const [status, setStatus] = useState(editing?.status || 'available');
  const [image, setImage] = useState<File | null>(null);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSaved('');
    try {
      if (editing) {
        await api.put(`/admin/menu/${editing.id}`, {
          food_name: foodName,
          category,
          description,
          price: Number(price),
          status,
        });
        setSaved('Food Item Updated Successfully');
      } else {
        const fd = new FormData();
        fd.append('food_name', foodName);
        fd.append('category', category);
        fd.append('description', description);
        fd.append('price', price);
        fd.append('status', status);
        if (image) fd.append('image', image);
        await api.upload('/admin/menu', fd);
        setSaved('Food Item Added Successfully');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return {
    foodName, setFoodName, category, setCategory, description, setDescription,
    price, setPrice, status, setStatus, image, setImage,
    saved, error, busy, submit,
  };
}

function MenuFormModal({
  editing,
  categories,
  onClose,
  onSaved,
}: {
  editing: MenuItem | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const f = useMenuItemForm(editing);
  const done = f.saved !== '';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-4 top-3 text-2xl leading-none text-ink-500 hover:text-ink-700">
          ×
        </button>
        <h2 className="mb-4 text-[18px] font-semibold tracking-tight text-ink-900">{editing ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
        {f.saved && <Alert tone="green">{f.saved}</Alert>}
        {f.error && <Alert tone="red">{f.error}</Alert>}
        <form onSubmit={async (e) => {
          await f.submit(e);
          onSaved();
          if (f.saved) onClose();
        }}>
          <Field label="Food Name">
            <Input value={f.foodName} onChange={(e) => f.setFoodName(e.target.value)} required />
          </Field>
          <Field label="Category">
            <Select value={f.category} onChange={(e) => f.setCategory(e.target.value)} required>
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.category_name}>
                  {c.category_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description">
            <Textarea rows={3} value={f.description} onChange={(e) => f.setDescription(e.target.value)} />
          </Field>
          <Field label="Price (GH₵)">
            <Input type="number" step="0.01" min="0" value={f.price} onChange={(e) => f.setPrice(e.target.value)} required />
          </Field>
          {!editing && (
            <Field label="Food Image">
              <Input type="file" accept="image/*" required onChange={(e) => f.setImage(e.target.files?.[0] || null)} />
            </Field>
          )}
          <Field label="Status">
            <Select value={f.status} onChange={(e) => f.setStatus(e.target.value)}>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </Select>
          </Field>
          <Btn type="submit" disabled={f.busy || done} className="w-full">
            {f.busy ? 'Saving…' : editing ? 'Update Menu Item' : 'Add Menu Item'}
          </Btn>
        </form>
      </div>
    </div>
  );
}

export function AdminMenuItems() {
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modal, setModal] = useState<{ open: boolean; editing: MenuItem | null }>({ open: false, editing: null });

  const load = useCallback(() => {
    api.get<{ items: MenuItem[] }>('/menu?all=1').then((d) => setItems(d.items)).catch(() => setItems([]));
    api.get<{ categories: Category[] }>('/categories?order=name').then((d) => setCategories(d.categories)).catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  async function remove(item: MenuItem) {
    try {
      await api.del(`/admin/menu/${item.id}`);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="rounded-card border border-ink-200 bg-white p-5 md:p-6">
      <PageHeader
        icon={UtensilsCrossed}
        title="Menu items"
        subtitle="Everything customers can order on the website"
        action={
          <Btn onClick={() => setModal({ open: true, editing: null })} icon={Plus}>
            Add new food
          </Btn>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50/70 text-[11px] font-semibold text-ink-500">
              <th className="px-4 py-3 text-ink-600">ID</th>
              <th className="px-4 py-3 text-ink-600">Image</th>
              <th className="px-4 py-3 text-ink-600">Food Name</th>
              <th className="px-4 py-3 text-ink-600">Category</th>
              <th className="px-4 py-3 text-ink-600">Price</th>
              <th className="px-4 py-3 text-ink-600">Status</th>
              <th className="px-4 py-3 text-ink-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {!items ? (
              <EmptyRow colSpan={7} text="Loading…" />
            ) : items.length === 0 ? (
              <EmptyRow colSpan={7} />
            ) : (
              items.map((i) => (
                <tr key={i.id} className="transition hover:bg-ink-50/70">
                  <td className="px-4 py-3 text-ink-600">{i.id}</td>
                  <td className="px-4 py-3 text-ink-600">
                    <img src={`/assets/images/${i.image}`} alt="" className="h-20 w-32 rounded-lg object-cover" />
                  </td>
                  <td className="p-3 font-semibold">{i.food_name}</td>
                  <td className="px-4 py-3 text-ink-600">{i.category}</td>
                  <td className="px-4 py-3 text-ink-600">
                    {ghs(i.price)}
                    {i.discount_percent > 0 && (
                      <span className="ml-1 text-xs font-bold text-green-600">({ghs(effectivePrice(i))})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    <span className={`rounded-tile px-3 py-1 text-xs font-bold ${i.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {i.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setModal({ open: true, editing: i })}
                        className="rounded bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700"
                      >
                        Edit
                      </button>
                      <DeleteBtn confirmText={`Are you sure you want to delete this item?`} onConfirm={() => remove(i)} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {modal.open && (
        <MenuFormModal editing={modal.editing} categories={categories} onClose={() => setModal({ open: false, editing: null })} onSaved={load} />
      )}
    </div>
  );
}

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState<{ tone: 'green' | 'red'; text: string } | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get<{ categories: Category[] }>('/categories').then((d) => setCategories(d.categories)).catch(() => setCategories([]));
  }, []);
  useEffect(load, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api.post('/admin/categories', { category_name: name });
      setMessage({ tone: 'green', text: 'Category Added Successfully' });
      setName('');
      load();
    } catch (err) {
      setMessage({ tone: 'red', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await api.put(`/admin/categories/${editing.id}`, { category_name: editName });
      setEditing(null);
      load();
    } catch (err) {
      setMessage({ tone: 'red', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Category) {
    try {
      await api.del(`/admin/categories/${c.id}`);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="rounded-card border border-ink-200 bg-white p-5 md:p-6">
      <h2 className="mb-5 text-xl font-semibold tracking-tight text-ink-900 md:text-2xl">Menu Categories</h2>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <form onSubmit={add} className="mb-6 flex max-w-md flex-wrap gap-2">
        <Input placeholder="Enter Category Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Btn type="submit" disabled={busy}>
          Add Category
        </Btn>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50/70 text-[11px] font-semibold text-ink-500">
              <th className="px-4 py-3 text-ink-600">ID</th>
              <th className="px-4 py-3 text-ink-600">Category Name</th>
              <th className="px-4 py-3 text-ink-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {!categories ? (
              <EmptyRow colSpan={3} text="Loading…" />
            ) : categories.length === 0 ? (
              <EmptyRow colSpan={3} />
            ) : (
              categories.map((c) => (
                <tr key={c.id} className="transition hover:bg-ink-50/70">
                  <td className="px-4 py-3 text-ink-600">{c.id}</td>
                  <td className="px-4 py-3 text-ink-600">
                    {editing?.id === c.id ? (
                      <form onSubmit={saveEdit} className="flex gap-2">
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} required className="max-w-xs" />
                        <Btn type="submit" disabled={busy}>
                          Save
                        </Btn>
                        <button type="button" onClick={() => setEditing(null)} className="rounded bg-gray-300 px-3 py-1.5 text-xs font-bold hover:bg-gray-400">
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <span className="font-semibold">{c.category_name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(c);
                          setEditName(c.category_name);
                        }}
                        className="rounded bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700"
                      >
                        Edit
                      </button>
                      <DeleteBtn confirmText="Delete this category?" onConfirm={() => remove(c)} />
                    </div>
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

export function AdminDiscounts() {
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [values, setValues] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<{ items: MenuItem[] }>('/menu?all=1')
      .then((d) => {
        setItems(d.items);
        setValues(Object.fromEntries(d.items.map((i) => [i.id, String(i.discount_percent)])));
      })
      .catch(() => setItems([]));
  }, []);

  async function saveDiscount(item: MenuItem) {
    setBusyId(item.id);
    try {
      await api.put(`/admin/menu/${item.id}/discount`, { discount_percent: Number(values[item.id] || 0) });
      setSavedId(item.id);
      setTimeout(() => setSavedId((v) => (v === item.id ? null : v)), 2000);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-card border border-ink-200 bg-white p-5 md:p-6">
      <PageHeader
        icon={Tags}
        title="Discounts"
        subtitle="Run percentage deals on individual dishes"
      />
      <p className="mb-5 text-sm text-ink-500">Set a discount percentage for any food item (0 = no discount).</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50/70 text-[11px] font-semibold text-ink-500">
              <th className="px-4 py-3 text-ink-600">Image</th>
              <th className="px-4 py-3 text-ink-600">Food Name</th>
              <th className="px-4 py-3 text-ink-600">Price</th>
              <th className="px-4 py-3 text-ink-600">Current Discount</th>
              <th className="px-4 py-3 text-ink-600">New Discount %</th>
              <th className="px-4 py-3 text-ink-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {!items ? (
              <EmptyRow colSpan={6} text="Loading…" />
            ) : items.length === 0 ? (
              <EmptyRow colSpan={6} />
            ) : (
              [...items]
                .sort((a, b) => a.food_name.localeCompare(b.food_name))
                .map((i) => (
                  <tr key={i.id} className="transition hover:bg-ink-50/70">
                    <td className="px-4 py-3 text-ink-600">
                      <img src={`/assets/images/${i.image}`} alt="" className="h-14 w-20 rounded-lg object-cover" />
                    </td>
                    <td className="p-3 font-semibold">{i.food_name}</td>
                    <td className="px-4 py-3 text-ink-600">{ghs(i.price)}</td>
                    <td className="px-4 py-3 text-ink-600">
                      <span className={`rounded-tile px-3 py-1 text-xs font-bold ${i.discount_percent > 0 ? 'bg-green-100 text-green-800' : 'bg-ink-100 text-ink-500'}`}>
                        {i.discount_percent > 0 ? `${i.discount_percent}% OFF → ${ghs(effectivePrice(i))}` : 'No discount'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={values[i.id] ?? '0'}
                        onChange={(e) => setValues((v) => ({ ...v, [i.id]: e.target.value }))}
                        className="w-24"
                      />
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {savedId === i.id ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-green-600">
                          <Check className="h-3.5 w-3.5" /> Saved
                        </span>
                      ) : (
                        <Btn type="button" disabled={busyId === i.id} onClick={() => saveDiscount(i)}>
                          Save
                        </Btn>
                      )}
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
