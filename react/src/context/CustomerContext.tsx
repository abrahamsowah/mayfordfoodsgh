import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api';
import type { Customer } from '../types';

/**
 * Customer session (separate from the admin session).
 * Loaded once on boot and refreshed after sign-in / sign-out.
 */
interface CustomerContextValue {
  customer: Customer | null;
  ordersCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<Customer>;
  register: (input: { full_name: string; email: string; phone: string; password: string; marketing_opt_in?: boolean }) => Promise<Customer>;
  signOut: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextValue | null>(null);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ordersCount, setOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ customer: Customer | null; orders_count?: number }>('/auth/customer/session');
      setCustomer(data.customer);
      setOrdersCount(Number(data.orders_count || 0));
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<CustomerContextValue>(
    () => ({
      customer,
      ordersCount,
      loading,
      refresh,
      signIn: async (email, password) => {
        const res = await api.post<{ customer: Customer }>('/auth/customer/login', { email, password });
        setCustomer(res.customer);
        void refresh();
        return res.customer;
      },
      register: async (input) => {
        const res = await api.post<{ customer: Customer }>('/auth/customer/register', input);
        setCustomer(res.customer);
        return res.customer;
      },
      signOut: async () => {
        await api.post('/auth/customer/logout').catch(() => undefined);
        setCustomer(null);
        setOrdersCount(0);
      },
    }),
    [customer, ordersCount, loading, refresh]
  );

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export function useCustomer(): CustomerContextValue {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomer must be used inside CustomerProvider');
  return ctx;
}
