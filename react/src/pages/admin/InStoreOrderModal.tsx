import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, Minus, Plus, Search, Store, X } from 'lucide-react';
import { api } from '../../api';
import type { MenuItem, Order } from '../../types';
import { effectivePrice, ghs } from '../../utils';
import { Alert, Btn, Field, Input, Select, Textarea } from '../../components/ui';

type Outlet = 'Adabraka' | 'Dzorwulu';
type PaymentMethod = 'Cash' | 'Mobile Money' | 'Card' | 'Bank Transfer' | 'Other';

interface Props {
  isSuperAdmin: boolean;
  defaultOutlet: Outlet;
  onClose: () => void;
  onCreated: (order: Order) => void;
}

export default function InStoreOrderModal({ isSuperAdmin, defaultOutlet, onClose, onCreated }: Props) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState('');
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [outlet, setOutlet] = useState<Outlet>(defaultOutlet);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Pending'>('Paid');
  const [status, setStatus] = useState('Pending');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<{ items: MenuItem[] }>('/menu')
      .then((data) => {
        if (active) setMenuItems(data.items || []);
      })
      .catch((err) => {
        if (active) setMenuError((err as Error).message || 'Could not load the menu.');
      })
      .finally(() => {
        if (active) setMenuLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return menuItems.filter((item) => {
      if (String(item.status || '').toLowerCase() !== 'available') return false;
      return !term || `${item.food_name} ${item.category}`.toLowerCase().includes(term);
    });
  }, [menuItems, search]);

  const selectedItems = useMemo(
    () => menuItems
      .filter((item) => (quantities[item.id] || 0) > 0)
      .map((item) => ({ item, quantity: quantities[item.id], lineTotal: effectivePrice(item) * quantities[item.id] })),
    [menuItems, quantities]
  );
  const total = selectedItems.reduce((sum, line) => sum + line.lineTotal, 0);
  const itemCount = selectedItems.reduce((sum, line) => sum + line.quantity, 0);

  function adjustQuantity(itemId: number, delta: number) {
    setQuantities((current) => {
      const next = Math.max(0, Math.min(100, (current[itemId] || 0) + delta));
      const copy = { ...current };
      if (next === 0) delete copy[itemId];
      else copy[itemId] = next;
      return copy;
    });
  }

  async function submitSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedItems.length === 0) {
      setError('Add at least one available menu item.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await api.post<{ ok: boolean; order: Order }>('/admin/orders/in-store', {
        outlet,
        customer_name: customerName.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        status,
        items: selectedItems.map(({ item, quantity }) => ({ id: item.id, quantity })),
      });
      setCreatedOrder(response.order);
      onCreated(response.order);
    } catch (err) {
      setError((err as Error).message || 'Could not create the in-store order.');
    } finally {
      setSubmitting(false);
    }
  }

  function createAnother() {
    setCreatedOrder(null);
    setQuantities({});
    setCustomerName('');
    setPhone('');
    setNotes('');
    setPaymentMethod('Cash');
    setPaymentStatus('Paid');
    setStatus('Pending');
    setSearch('');
    setError('');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="in-store-order-title"
        className="my-auto flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#111111] text-white">
              <Store className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-mayford-600">Cashier / POS</p>
              <h2 id="in-store-order-title" className="text-lg font-bold text-[#111111]">
                {createdOrder ? `Sale #${createdOrder.id} recorded` : 'Create In-Store Order'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-[#111111] disabled:opacity-50"
            aria-label="Close in-store order"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {createdOrder ? (
          <div className="overflow-y-auto p-6 sm:p-8">
            <div className="mx-auto max-w-xl rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Check className="h-6 w-6" />
              </span>
              <p className="mt-4 text-xl font-bold text-[#111111]">In-store sale saved</p>
              <p className="mt-1 text-sm text-[#6B6B6B]">
                Order #{createdOrder.id} · {createdOrder.outlet} · {createdOrder.payment_status}
              </p>
              <p className="mt-4 text-3xl font-bold tabular-nums text-[#111111]">{ghs(createdOrder.total)}</p>
              <div className="mt-4 rounded-md bg-white p-4 text-left text-sm">
                <p className="whitespace-pre-wrap font-medium text-[#111111]">{createdOrder.order_details}</p>
                <p className="mt-3 border-t border-neutral-100 pt-3 text-xs text-[#6B6B6B]">
                  Payment: {createdOrder.payment_method} · Kitchen status: {createdOrder.status}
                </p>
              </div>
              <p className="mt-4 text-xs text-emerald-800">
                The sale has been added to branch orders, revenue totals, top-selling items, and the live kitchen queue.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                <Btn type="button" variant="outline" onClick={createAnother}>Create Another Sale</Btn>
                <Btn type="button" onClick={onClose}>Done</Btn>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={submitSale} className="flex min-h-0 flex-1 flex-col">
            <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5 border-b border-neutral-100 p-5 sm:p-7 lg:border-b-0 lg:border-r">
                {error && <Alert tone="red">{error}</Alert>}
                {menuError && <Alert tone="red">{menuError}</Alert>}

                <div className="flex flex-wrap items-end justify-between gap-3">
                  <Field label="Branch">
                    {isSuperAdmin ? (
                      <Select value={outlet} onChange={(event) => setOutlet(event.target.value as Outlet)}>
                        <option value="Adabraka">Adabraka</option>
                        <option value="Dzorwulu">Dzorwulu</option>
                      </Select>
                    ) : (
                      <div className="rounded-md border border-neutral-200 bg-[#F7F7F7] px-3.5 py-2.5 text-sm font-semibold text-[#111111]">
                        {outlet}
                      </div>
                    )}
                  </Field>
                  <span className="mb-4 rounded-full bg-[#F7F7F7] px-3 py-2 text-xs font-semibold text-[#6B6B6B]">
                    {itemCount} item{itemCount === 1 ? '' : 's'} selected
                  </span>
                </div>

                <Field label="Find menu items">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="pl-9"
                      placeholder="Search food or category..."
                    />
                  </div>
                </Field>

                <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {menuLoading ? (
                    <div className="rounded-md border border-neutral-200 bg-[#F7F7F7] p-6 text-center text-sm text-[#6B6B6B]">
                      Loading available menu items…
                    </div>
                  ) : visibleItems.length === 0 ? (
                    <div className="rounded-md border border-neutral-200 bg-[#F7F7F7] p-6 text-center text-sm text-[#6B6B6B]">
                      No available menu items match this search.
                    </div>
                  ) : (
                    visibleItems.map((item) => {
                      const quantity = quantities[item.id] || 0;
                      return (
                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 p-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#111111]">{item.food_name}</p>
                            <p className="mt-0.5 text-xs text-[#6B6B6B]">{item.category}</p>
                            <p className="mt-1 text-xs font-semibold text-[#111111]">{ghs(effectivePrice(item))}</p>
                          </div>
                          {quantity ? (
                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={() => adjustQuantity(item.id, -1)}
                                className="flex h-8 w-8 items-center justify-center rounded border border-neutral-300 hover:bg-neutral-100"
                                aria-label={`Remove one ${item.food_name}`}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-6 text-center text-sm font-bold tabular-nums">{quantity}</span>
                              <button
                                type="button"
                                onClick={() => adjustQuantity(item.id, 1)}
                                className="flex h-8 w-8 items-center justify-center rounded border border-neutral-300 hover:bg-neutral-100"
                                aria-label={`Add one ${item.food_name}`}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <Btn type="button" size="sm" onClick={() => adjustQuantity(item.id, 1)}>
                              <Plus className="h-3.5 w-3.5" /> Add
                            </Btn>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-4 p-5 sm:p-7">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Customer (optional)">
                    <Input
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      maxLength={255}
                      placeholder="Walk-in Customer"
                    />
                  </Field>
                  <Field label="Phone (optional)">
                    <Input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      maxLength={50}
                      placeholder="024..."
                      inputMode="tel"
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Payment method">
                    <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
                      <option value="Cash">Cash</option>
                      <option value="Mobile Money">Mobile Money</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Other">Other</option>
                    </Select>
                  </Field>
                  <Field label="Payment collected?">
                    <Select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as 'Paid' | 'Pending')}>
                      <option value="Paid">Yes — paid</option>
                      <option value="Pending">No — pending</option>
                    </Select>
                  </Field>
                </div>

                <Field label="Kitchen status">
                  <Select value={status} onChange={(event) => setStatus(event.target.value)}>
                    <option value="Pending">Pending — send to kitchen queue</option>
                    <option value="Preparing">Preparing</option>
                    <option value="Ready">Ready</option>
                    <option value="Completed">Completed</option>
                  </Select>
                </Field>

                <Field label="Notes (optional)">
                  <Textarea
                    rows={2}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    maxLength={500}
                    placeholder="Counter note or special instructions"
                  />
                </Field>

                <div className="rounded-md border border-neutral-200 bg-[#F7F7F7] p-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-[#6B6B6B]">
                    <span>Items</span>
                    <span>{itemCount}</span>
                  </div>
                  <div className="max-h-36 space-y-2 overflow-y-auto">
                    {selectedItems.map(({ item, quantity, lineTotal }) => (
                      <div key={item.id} className="flex justify-between gap-3 text-xs">
                        <span className="min-w-0 truncate text-[#111111]">{item.food_name} × {quantity}</span>
                        <span className="shrink-0 font-semibold tabular-nums text-[#111111]">{ghs(lineTotal)}</span>
                      </div>
                    ))}
                    {selectedItems.length === 0 && <p className="text-xs text-[#6B6B6B]">No items added yet.</p>}
                  </div>
                  <div className="mt-3 flex justify-between border-t border-neutral-200 pt-3 text-sm font-bold text-[#111111]">
                    <span>Total</span>
                    <span className="tabular-nums">{ghs(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <footer className="flex flex-col-reverse justify-between gap-3 border-t border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:px-7">
              <p className="text-xs text-[#6B6B6B]">Price is recalculated against the current Supabase menu before saving.</p>
              <div className="flex justify-end gap-2">
                <Btn type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Btn>
                <Btn type="submit" disabled={submitting || menuLoading || !!menuError || selectedItems.length === 0}>
                  <Check className="h-4 w-4" />
                  {submitting ? 'Saving sale…' : `Create Sale · ${ghs(total)}`}
                </Btn>
              </div>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
