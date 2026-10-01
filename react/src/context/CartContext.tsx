import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartItem, MenuItem } from '../types';
import { effectivePrice } from '../utils';

/**
 * Shopping cart.
 * The PHP site kept the cart in $_SESSION; the SPA keeps it in localStorage
 * so it behaves the same way across page navigation and browser restarts.
 */
const STORAGE_KEY = 'mayford_cart';

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (item: MenuItem) => void;
  setQuantity: (id: number, quantity: number) => void;
  removeItem: (id: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    return {
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      total: items.reduce((s, i) => s + i.price * i.quantity, 0),
      addItem: (item: MenuItem) =>
        setItems((prev) => {
          const price = effectivePrice(item);
          const existing = prev.find((i) => i.id === item.id);
          if (existing) {
            return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
          }
          return [
            ...prev,
            { id: item.id, food_name: item.food_name, price, image: item.image, quantity: 1 },
          ];
        }),
      setQuantity: (id: number, quantity: number) =>
        setItems((prev) =>
          quantity <= 0
            ? prev.filter((i) => i.id !== id)
            : prev.map((i) => (i.id === id ? { ...i, quantity: Math.min(99, quantity) } : i))
        ),
      removeItem: (id: number) => setItems((prev) => prev.filter((i) => i.id !== id)),
      clear: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
