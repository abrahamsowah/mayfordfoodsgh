import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useSettings } from '../components/SiteLayout';
import { Alert, Btn, Card, Eyebrow, Field, Input, Section, Select, Textarea } from '../components/ui';
import { ghs, outletWhatsApp, waLink } from '../utils';

export default function CheckoutPage() {
  const { items, count, total, clear } = useCart();
  const { settings } = useSettings();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (items.length === 0) return <Navigate to="/menu" replace />;

  async function placeOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true);
    setError('');
    try {
      let orderDetails = '';
      for (const item of items) {
        orderDetails += `${item.food_name} x ${item.quantity} = ${ghs(item.price * item.quantity)}\n`;
      }
      await api.post('/orders', {
        customer_name: String(fd.customer_name || ''),
        phone: String(fd.phone || ''),
        food_item: 'Multiple Foods',
        quantity: 0,
        outlet: String(fd.outlet || ''),
        order_type: String(fd.order_type || ''),
        address: String(fd.address || ''),
        order_details: orderDetails,
        total,
      });
      const outlet = String(fd.outlet || 'Adabraka');
      const message =
        `NEW MAYFORD FOODS ORDER\n` +
        `Customer: ${fd.customer_name}\n` +
        `Phone: ${fd.phone}\n` +
        `Items:\n${orderDetails}` +
        `Outlet: ${outlet}\n` +
        `Order Type: ${fd.order_type}\n` +
        `Address: ${fd.address}\n` +
        `TOTAL: ${ghs(total)}`;
      clear();
      window.open(waLink(outletWhatsApp(outlet, settings), message), '_blank');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section>
      <div className="mb-10 text-center">
        <Eyebrow>Almost There</Eyebrow>
        <h1 className="text-4xl font-extrabold tracking-tight text-stone-900">Checkout</h1>
        <p className="mt-3 text-stone-600">
          {count} item{count > 1 ? 's' : ''} · Total <strong className="text-mayford-700">{ghs(total)}</strong>
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Form */}
        <Card className="p-7 md:p-9">
          <h2 className="mb-6 text-lg font-extrabold tracking-tight text-stone-900">Delivery Details</h2>
          {error && <Alert tone="red">{error}</Alert>}
          <form onSubmit={placeOrder}>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label="Your Name">
                <Input name="customer_name" placeholder="Your Name" required />
              </Field>
              <Field label="Phone Number">
                <Input name="phone" placeholder="Phone Number" required />
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
              <Textarea name="address" rows={4} placeholder="Delivery Address (if delivery)" />
            </Field>
            <Btn type="submit" disabled={busy} className="w-full !py-3.5">
              {busy ? 'Placing Order…' : 'Place Order →'}
            </Btn>
            <p className="mt-4 text-center text-xs text-stone-500">
              After placing the order you will be taken to WhatsApp to confirm it with the selected branch.
            </p>
          </form>
        </Card>

        {/* Summary */}
        <Card className="h-fit p-7">
          <h2 className="text-lg font-extrabold tracking-tight text-stone-900">Your Items</h2>
          <ul className="mt-5 space-y-4">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <img src={`/assets/images/${item.image}`} alt="" className="h-12 w-12 rounded-xl object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-stone-800">{item.food_name}</p>
                  <p className="text-xs text-stone-500">× {item.quantity}</p>
                </div>
                <span className="text-sm font-extrabold text-mayford-700">{ghs(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between border-t border-dashed border-stone-200 pt-5">
            <span className="font-extrabold text-stone-900">Total</span>
            <span className="text-2xl font-extrabold text-mayford-700">{ghs(total)}</span>
          </div>
        </Card>
      </div>
    </Section>
  );
}
