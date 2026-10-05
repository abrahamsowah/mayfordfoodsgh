import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, Edit3, FolderOpen, Plus, Search, Tags, X } from 'lucide-react';
import { api } from '../../api';
import { Alert, Btn, DeleteBtn, EmptyRow, Field, Input, Select, Textarea } from '../../components/ui';
import type { Category, MenuItem } from '../../types';
import { effectivePrice, ghs, prepareImageForUpload } from '../../utils';
import { SmartImage } from '../../components/SmartImage';

const PRESET_KITCHEN_IMAGES = [
  { file: 'Jollof.png', label: 'Jollof Rice' },
  { file: 'bankuokro.jpeg', label: 'Banku & Okro' },
  { file: 'fufu.jpeg', label: 'Fufu & Soup' },
  { file: 'friedyam.jpg', label: 'Fried Yam' },
  { file: 'boiledyam.jpg', label: 'Boiled Yam' },
  { file: 'palavasauce.jpg', label: 'Palava Sauce' },
  { file: 'plantainpalava.jpeg', label: 'Plantain & Palava' },
  { file: 'riceball.jpg', label: 'Omotuo / Riceball' },
  { file: 'ricepalava.jpg', label: 'Rice & Palava' },
  { file: 'ricestew.webp', label: 'Plain Rice & Stew' },
  { file: 'apapransa.jpg', label: 'Apapransa' },
  { file: 'oilrice.jpg', label: 'Angwamo / Oil Rice' },
  { file: 'samosa.jpg', label: 'Samosa / Snacks' },
  { file: 'specialorder.jpeg', label: 'Special Platter' },
];

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
  const [foodName, setFoodName] = useState(editing?.food_name || '');
  const [category, setCategory] = useState(editing?.category || categories[0]?.category_name || 'Rice Dishes');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState(editing?.description || '');
  const [price, setPrice] = useState(editing ? String(editing.price) : '');
  const [discountPercent, setDiscountPercent] = useState(editing ? String(editing.discount_percent || 0) : '0');
  const [status, setStatus] = useState(editing?.status || 'available');
  const [selectedPresetImage, setSelectedPresetImage] = useState(editing?.image || 'Jollof.png');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const numericPrice = Number(price || 0);
  const numericDiscount = Math.max(0, Math.min(100, Number(discountPercent || 0)));
  const finalPrice = effectivePrice({ price: numericPrice, discount_percent: numericDiscount });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const resolvedCategory = category === '__custom__' ? customCategory.trim() : category;
      if (!resolvedCategory) {
        throw new Error('Please select or enter a category.');
      }

      // If custom category was entered, ensure it exists in menu_categories
      if (
        category === '__custom__' &&
        !categories.some((c) => c.category_name.toLowerCase() === resolvedCategory.toLowerCase())
      ) {
        await api.post('/admin/categories', { category_name: resolvedCategory }).catch(() => undefined);
      }

      const fd = new FormData();
      fd.append('food_name', foodName.trim());
      fd.append('category', resolvedCategory);
      fd.append('description', description.trim());
      fd.append('price', String(numericPrice));
      fd.append('discount_percent', String(numericDiscount));
      fd.append('status', status);
      if (imageFile) {
        fd.append('image', await prepareImageForUpload(imageFile));
      } else {
        fd.append('image', selectedPresetImage);
      }

      if (editing) {
        await api.uploadPut(`/admin/menu/${editing.id}`, fd);
      } else {
        await api.upload('/admin/menu', fd);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const displayImage = previewUrl || `/assets/images/${selectedPresetImage}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-neutral-200 bg-white p-6 shadow-lift sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between border-b border-neutral-200 pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-mayford-600">
              Kitchen Menu Catalog
            </p>
            <h2 className="text-xl font-bold tracking-tight text-[#111111]">
              {editing ? `Edit Dish: ${editing.food_name}` : 'Add New Dish to Menu'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-[#111111]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <Alert tone="red">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Dish / Food Name">
              <Input
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="e.g. Assorted Jollof with Grilled Chicken"
                required
              />
            </Field>

            <Field label="Menu Category">
              <Select value={category} onChange={(e) => setCategory(e.target.value)} required>
                {categories.map((c) => (
                  <option key={c.id} value={c.category_name}>
                    {c.category_name}
                  </option>
                ))}
                <option value="__custom__">+ Create New Category...</option>
              </Select>
            </Field>
          </div>

          {category === '__custom__' && (
            <Field label="New Category Name">
              <Input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Continental Specials, Beverages, Sides..."
                required
              />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Base Price (GH₵)">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="80.00"
                required
              />
            </Field>

            <Field label="Discount (%)">
              <Input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="0"
              />
            </Field>

            <Field label="Availability">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="available">Available on Menu</option>
                <option value="unavailable">Unavailable / Sold Out</option>
              </Select>
            </Field>
          </div>

          {/* Live Effective Price Preview */}
          <div className="flex items-center justify-between rounded-md border border-neutral-200 bg-[#F7F7F7] px-4 py-2.5 text-xs">
            <span className="font-semibold text-[#6B6B6B]">Customer Menu Price Preview</span>
            <span className="font-bold tabular-nums text-[#111111]">
              {ghs(finalPrice)}
              {numericDiscount > 0 && (
                <span className="ml-2 text-neutral-400 line-through">{ghs(numericPrice)}</span>
              )}
            </span>
          </div>

          <Field label="Dish Description (Ingredients, Portion & Sides)">
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe how the dish is prepared and what it is served with..."
              required
            />
          </Field>

          {/* Dish Image Upload + Kitchen Library Picker */}
          <div className="rounded-lg border border-neutral-200 bg-[#F7F7F7] p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#111111]">
              Dish Photography
            </p>
            <div className="grid items-start gap-4 sm:grid-cols-[140px_1fr]">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-md border border-neutral-200 bg-white">
                <SmartImage
                  src={displayImage}
                  alt="Dish preview"
                  sizes="(min-width: 640px) 40vw, 100vw"
                  fallbackSrc="/assets/images/Jollof.png"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#111111]">
                    Upload Custom Image File
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="!bg-white !py-1.5 !text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#6B6B6B]">
                    Or Select From Kitchen Photo Library
                  </label>
                  <Select
                    value={selectedPresetImage}
                    onChange={(e) => {
                      setSelectedPresetImage(e.target.value);
                      setImageFile(null);
                    }}
                    className="!py-2 !text-xs"
                  >
                    {PRESET_KITCHEN_IMAGES.map((img) => (
                      <option key={img.file} value={img.file}>
                        {img.label} ({img.file})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-[#111111] hover:bg-neutral-50"
            >
              Cancel
            </button>
            <Btn type="submit" disabled={busy} className="!bg-mayford-600 hover:!bg-mayford-700">
              <Check className="h-4 w-4" />
              <span>{busy ? 'Saving Dish...' : editing ? 'Save Changes' : 'Add Dish to Menu'}</span>
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminMenuItems() {
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterCat, setFilterCat] = useState('All');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; editing: MenuItem | null }>({ open: false, editing: null });

  const load = useCallback(() => {
    api
      .get<{ items: MenuItem[] }>('/menu?all=1')
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
    api
      .get<{ categories: Category[] }>('/categories?order=name')
      .then((d) => setCategories(d.categories))
      .catch(() => undefined);
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

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (items || []).filter((i) => {
      const matchCat = filterCat === 'All' || i.category === filterCat;
      const matchQ =
        !q ||
        i.food_name.toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [items, filterCat, search]);

  const availableCount = (items || []).filter((i) => i.status === 'available').length;
  const discountedCount = (items || []).filter((i) => Number(i.discount_percent || 0) > 0).length;

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-6 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-mayford-600">Menu Catalog</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111111]">Food Menu Items</h1>
          <p className="mt-1 text-xs text-[#6B6B6B]">
            Add new dishes, update prices, manage descriptions, and control availability on the public menu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-5 border-r border-neutral-200 pr-5 text-xs">
            <div>
              <p className="text-[#6B6B6B]">Total Dishes</p>
              <p className="text-lg font-bold tabular-nums text-[#111111]">{items?.length ?? 0}</p>
            </div>
            <div>
              <p className="text-[#6B6B6B]">Available</p>
              <p className="text-lg font-bold tabular-nums text-[#111111]">{availableCount}</p>
            </div>
            <div>
              <p className="text-[#6B6B6B]">Discounted</p>
              <p className="text-lg font-bold tabular-nums text-[#111111]">{discountedCount}</p>
            </div>
          </div>

          <Btn
            onClick={() => setModal({ open: true, editing: null })}
            className="!bg-mayford-600 hover:!bg-mayford-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Dish</span>
          </Btn>
        </div>
      </div>

      {/* Category & Search Filter Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {['All', ...categories.map((c) => c.category_name)].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilterCat(c)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterCat === c
                  ? 'bg-[#111111] text-white'
                  : 'border border-neutral-200 bg-[#F7F7F7] text-[#6B6B6B] hover:text-[#111111]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes..."
            className="w-full rounded-md border border-neutral-300 bg-white py-2 pl-9 pr-8 text-xs text-[#111111] outline-none focus:border-[#111111]"
          />
        </div>
      </div>

      {/* Dishes Table */}
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-[#111111] text-[11px] font-bold uppercase tracking-wider text-white">
                <th className="p-4">Dish</th>
                <th className="p-4">Category</th>
                <th className="p-4">Description</th>
                <th className="p-4">Price</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {!items ? (
                <EmptyRow colSpan={6} text="Loading menu items..." />
              ) : visible.length === 0 ? (
                <EmptyRow colSpan={6} text="No food items found." />
              ) : (
                visible.map((i) => (
                  <tr key={i.id} className="hover:bg-[#F7F7F7]">
                    <td className="p-4">
                      <div className="flex items-center gap-3.5">
                        <SmartImage
                          src={`/assets/images/${i.image}`}
                          alt={i.food_name}
                          sizes="80px"
                          fallbackSrc="/assets/images/Jollof.png"
                          className="h-14 w-20 shrink-0 rounded-md border border-neutral-200 bg-neutral-100 object-cover"
                        />
                        <div>
                          <p className="text-sm font-bold text-[#111111]">{i.food_name}</p>
                          <p className="text-[11px] text-[#6B6B6B]">ID #{i.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-block rounded-sm border border-neutral-300 bg-[#F7F7F7] px-2.5 py-1 text-[11px] font-semibold text-[#111111]">
                        {i.category}
                      </span>
                    </td>
                    <td className="max-w-[260px] p-4 text-[#6B6B6B]">{i.description}</td>
                    <td className="p-4 tabular-nums">
                      <p className="text-sm font-bold text-[#111111]">{ghs(effectivePrice(i))}</p>
                      {i.discount_percent > 0 && (
                        <p className="text-[11px] text-mayford-600 font-semibold">
                          {i.discount_percent}% Off (Base {ghs(i.price)})
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block rounded-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          i.status === 'available'
                            ? 'bg-[#111111] text-white'
                            : 'border border-neutral-300 bg-white text-neutral-500'
                        }`}
                      >
                        {i.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setModal({ open: true, editing: i })}
                          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] transition-colors hover:border-[#111111] hover:bg-[#111111] hover:text-white"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <DeleteBtn
                          confirmText={`Delete "${i.food_name}" from the menu?`}
                          onConfirm={() => remove(i)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal.open && (
        <MenuFormModal
          editing={modal.editing}
          categories={categories}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={load}
        />
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
    api
      .get<{ categories: Category[] }>('/categories')
      .then((d) => setCategories(d.categories))
      .catch(() => setCategories([]));
  }, []);
  useEffect(load, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api.post('/admin/categories', { category_name: name });
      setMessage({ tone: 'green', text: 'Category added.' });
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
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mayford-600">
          <FolderOpen className="h-3.5 w-3.5" />
          <span>Menu Structure</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111111]">Menu Categories</h1>
        <p className="mt-1 mb-5 text-xs text-[#6B6B6B]">
          Organize dishes into tabs on the digital menu (e.g. Rice Dishes, Local Dishes, Soups, Drinks).
        </p>

        {message && <Alert tone={message.tone}>{message.text}</Alert>}

        <form onSubmit={add} className="flex max-w-md gap-2.5">
          <Input
            placeholder="Enter new category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Btn type="submit" disabled={busy} className="shrink-0">
            <Plus className="h-4 w-4" />
            <span>Add Category</span>
          </Btn>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-[#111111] text-[11px] font-bold uppercase tracking-wider text-white">
                <th className="p-4">ID</th>
                <th className="p-4">Category Name</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {!categories ? (
                <EmptyRow colSpan={3} text="Loading categories..." />
              ) : categories.length === 0 ? (
                <EmptyRow colSpan={3} />
              ) : (
                categories.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F7F7F7]">
                    <td className="p-4 font-mono font-bold text-[#6B6B6B]">#{c.id}</td>
                    <td className="p-4">
                      {editing?.id === c.id ? (
                        <form onSubmit={saveEdit} className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            required
                            className="max-w-xs !py-1.5 !text-xs"
                          />
                          <Btn type="submit" disabled={busy} className="!px-3.5 !py-1.5 !text-xs">
                            Save
                          </Btn>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#111111]"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <span className="text-sm font-bold text-[#111111]">{c.category_name}</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(c);
                            setEditName(c.category_name);
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#111111]"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
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
    </div>
  );
}

export function AdminDiscounts() {
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [values, setValues] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);

  const load = useCallback(() => {
    api
      .get<{ items: MenuItem[] }>('/menu?all=1')
      .then((d) => {
        setItems(d.items);
        setValues(Object.fromEntries(d.items.map((i) => [i.id, String(i.discount_percent)])));
      })
      .catch(() => setItems([]));
  }, []);

  useEffect(load, [load]);

  async function saveDiscount(item: MenuItem) {
    setBusyId(item.id);
    try {
      await api.put(`/admin/menu/${item.id}/discount`, { discount_percent: Number(values[item.id] || 0) });
      setSavedId(item.id);
      load();
      setTimeout(() => setSavedId((v) => (v === item.id ? null : v)), 2000);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mayford-600">
          <Tags className="h-3.5 w-3.5" />
          <span>Pricing &amp; Offers</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111111]">Promotional Discounts</h1>
        <p className="mt-1 text-xs text-[#6B6B6B]">
          Set percentage discounts on individual menu items. Discounts automatically apply to customer carts and Paystack checkout.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-[#111111] text-[11px] font-bold uppercase tracking-wider text-white">
                <th className="p-4">Dish</th>
                <th className="p-4">Base Price</th>
                <th className="p-4">Active Offer</th>
                <th className="p-4">Discount %</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {!items ? (
                <EmptyRow colSpan={5} text="Loading dishes..." />
              ) : items.length === 0 ? (
                <EmptyRow colSpan={5} />
              ) : (
                [...items]
                  .sort((a, b) => a.food_name.localeCompare(b.food_name))
                  .map((i) => (
                    <tr key={i.id} className="hover:bg-[#F7F7F7]">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <SmartImage
                            src={`/assets/images/${i.image}`}
                            alt={i.food_name}
                            sizes="64px"
                            fallbackSrc="/assets/images/Jollof.png"
                            className="h-12 w-16 rounded-md border border-neutral-200 object-cover"
                          />
                          <span className="text-sm font-bold text-[#111111]">{i.food_name}</span>
                        </div>
                      </td>
                      <td className="p-4 font-semibold tabular-nums text-[#111111]">{ghs(i.price)}</td>
                      <td className="p-4">
                        {i.discount_percent > 0 ? (
                          <span className="inline-block rounded-sm bg-mayford-600 px-2.5 py-1 text-[11px] font-bold text-white">
                            {i.discount_percent}% OFF ({ghs(effectivePrice(i))})
                          </span>
                        ) : (
                          <span className="text-[#6B6B6B]">Standard Price</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={values[i.id] ?? '0'}
                          onChange={(e) => setValues((v) => ({ ...v, [i.id]: e.target.value }))}
                          className="w-24 !py-1.5 !text-xs"
                        />
                      </td>
                      <td className="p-4 text-right">
                        {savedId === i.id ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <Check className="h-3.5 w-3.5" />
                            <span>Saved</span>
                          </span>
                        ) : (
                          <Btn
                            type="button"
                            disabled={busyId === i.id}
                            onClick={() => saveDiscount(i)}
                            className="!px-4 !py-1.5 !text-xs"
                          >
                            Apply
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
    </div>
  );
}
