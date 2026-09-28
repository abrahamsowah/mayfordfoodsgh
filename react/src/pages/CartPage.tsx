import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Btn, Card, Eyebrow, LinkBtn, Section } from '../components/ui';
import { ghs } from '../utils';

export default function CartPage() {
  const { items, count, total, removeItem } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <Section>
        <div className="mx-auto max-w-md rounded-[2.5rem] bg-white p-12 text-center shadow-soft">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-mayford-50 text-mayford-600">
            <ShoppingBag className="h-9 w-9" />
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-stone-900">Your Cart Is Empty</h1>
          <p className="mt-3 text-stone-600">Fresh Ghanaian &amp; continental meals are waiting for you.</p>
          <div className="mt-7">
            <LinkBtn href="/menu">Browse The Menu</LinkBtn>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section>
      <div className="mb-10 text-center">
        <Eyebrow>Review Your Order</Eyebrow>
        <h1 className="text-4xl font-extrabold tracking-tight text-stone-900">Your Cart</h1>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Items */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-[11px] font-extrabold uppercase tracking-widest text-stone-400">
                  <th className="p-4">Food</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Qty</th>
                  <th className="p-4">Subtotal</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-stone-100 last:border-0">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={`/assets/images/${item.image}`} alt={item.food_name} className="h-14 w-14 rounded-xl object-cover" />
                        <span className="font-bold text-stone-800">{item.food_name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-stone-600">{ghs(item.price)}</td>
                    <td className="p-4 font-bold text-stone-800">{item.quantity}</td>
                    <td className="p-4 font-extrabold text-mayford-700">{ghs(item.price * item.quantity)}</td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.food_name}`}
                        className="rounded-full bg-stone-100 px-3.5 py-2 text-xs font-bold text-stone-600 transition hover:bg-red-600 hover:text-white"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Summary */}
        <Card className="h-fit p-7">
          <h2 className="text-lg font-extrabold tracking-tight text-stone-900">Order Summary</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between text-stone-600">
              <dt>Items</dt>
              <dd className="font-bold text-stone-900">{count}</dd>
            </div>
            <div className="flex justify-between text-stone-600">
              <dt>Delivery</dt>
              <dd className="font-bold text-stone-900">Confirmed on WhatsApp</dd>
            </div>
            <div className="flex justify-between border-t border-dashed border-stone-200 pt-4 text-base">
              <dt className="font-extrabold text-stone-900">Total</dt>
              <dd className="text-xl font-extrabold text-mayford-700">{ghs(total)}</dd>
            </div>
          </dl>
          <Btn className="mt-6 w-full !py-3.5" onClick={() => navigate('/checkout')}>
            Proceed To Checkout →
          </Btn>
          <p className="mt-4 text-center text-xs text-stone-500">
            Checkout is fast. You&apos;ll confirm the order with the branch on WhatsApp.
          </p>
        </Card>
      </div>
    </Section>
  );
}
