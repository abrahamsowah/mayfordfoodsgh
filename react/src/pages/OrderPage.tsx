import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { useSettings } from '../components/SiteLayout';
import { Alert, Btn, Field, Input, Section, Select, Textarea } from '../components/ui';
import type { MenuItem } from '../types';
import { effectivePrice, ghs, outletWhatsApp, waLink } from '../utils';

/** Single-item quick order (original order.php?id=) */
export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const [food, setFood] = useState<MenuItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { settings } = useSettings();

  useEffect(() => {
    if (!id) return;
    api
      .get<{ item: MenuItem }>(`/menu/${id}`)
      .then((d) => setFood(d.item))
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <Section>
        <p className="text-center text-stone-500">Food item not found. It may have been removed from the menu.</p>
      </Section>
    );
  }

  if (!food) {
    return (
      <Section>
        <p className="text-center text-stone-500">Loading…</p>
      </Section>
    );
  }

  async function placeOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    const quantity = Math.max(1, Number(fd.quantity || 1));
    const total = effectivePrice(food!) * quantity;
    setBusy(true);
    setError('');
    try {
      await api.post('/orders', {
        customer_name: String(fd.customer_name || ''),
        phone: String(fd.phone || ''),
        food_item: food!.food_name,
        quantity,
        outlet: String(fd.outlet || ''),
        order_type: String(fd.order_type || ''),
        address: String(fd.address || ''),
        order_details: `${food!.food_name} x ${quantity}`,
        total,
      });
      const outlet = String(fd.outlet || 'Adabraka');
      const message =
        `NEW MAYFORD FOODS ORDER\n` +
        `Customer: ${fd.customer_name}\n` +
        `Phone: ${fd.phone}\n` +
        `Food: ${food!.food_name}\n` +
        `Quantity: ${quantity}\n` +
        `Outlet: ${outlet}\n` +
        `Order Type: ${fd.order_type}\n` +
        `Address: ${fd.address}\n` +
        `Total: ${ghs(total)}`;
      window.open(waLink(outletWhatsApp(outlet, settings), message), '_blank');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section>
      <div className="mx-auto grid max-w-4xl gap-8 overflow-hidden rounded-[2.5rem] bg-white shadow-lift ring-1 ring-stone-900/5 lg:grid-cols-2">
        {/* Image side */}
        <div className="relative min-h-[280px]">
          <img src={`/assets/images/${food.image}`} alt={food.food_name} className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute left-5 top-5 rounded-full bg-white/90 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-mayford-700 backdrop-blur">
            {food.category}
          </span>
        </div>
        {/* Form side */}
        <div className="p-7 md:p-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-flame-600">Quick Order</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-900">{food.food_name}</h1>
          <p className="mt-2 text-2xl font-extrabold text-mayford-700">{ghs(effectivePrice(food))}</p>
          {error && <Alert tone="red">{error}</Alert>}
          <form onSubmit={placeOrder} className="mt-6">
            <Field label="Your Name">
              <Input name="customer_name" placeholder="Your Name" required />
            </Field>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label="Phone Number">
                <Input name="phone" placeholder="Phone Number" required />
              </Field>
              <Field label="Quantity">
                <Input name="quantity" type="number" min={1} defaultValue={1} required />
              </Field>
              <Field label="Outlet">
                <Select name="outlet" required defaultValue="">
                  <option value="" disabled>
                    Select Outlet
                  </option>
                  <option value="Adabraka">Adabraka</option>
                  <option value="Dzorwulu">Dzorwulu</option>
                </Select>
              </Field>
              <Field label="Order Type">
                <Select name="order_type" required defaultValue="">
                  <option value="" disabled>
                    Order Type
                  </option>
                  <option value="Pickup">Pickup</option>
                  <option value="Delivery">Delivery</option>
                </Select>
              </Field>
            </div>
            <Field label="Delivery Address (if delivery)">
              <Textarea name="address" rows={3} placeholder="Delivery Address (if delivery)" />
            </Field>
            <Btn type="submit" disabled={busy} className="w-full !py-3.5">
              {busy ? 'Placing Order…' : 'Place Order →'}
            </Btn>
          </form>
        </div>
      </div>
    </Section>
  );
}
