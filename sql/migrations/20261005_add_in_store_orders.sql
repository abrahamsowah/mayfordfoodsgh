-- Add a source marker for cashier-created orders.
-- Safe to run on an existing Supabase project; preserves current order data.
BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_source VARCHAR(30) NOT NULL DEFAULT 'Online';

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_order_source_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_source_check
  CHECK (order_source IN ('Online', 'In-Store'));
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Public storefront submissions are always online orders. Cashier orders are
-- created through the authenticated server-side admin endpoint.
DROP POLICY IF EXISTS "Public insert orders" ON public.orders;
CREATE POLICY "Public insert orders" ON public.orders FOR INSERT TO anon
  WITH CHECK (
    total > 0
    AND customer_name IS NOT NULL
    AND length(trim(customer_name)) >= 2
    AND phone IS NOT NULL
    AND length(trim(phone)) >= 7
    AND outlet IN ('Adabraka', 'Dzorwulu')
    AND order_type IN ('Delivery', 'Pickup')
    AND order_source = 'Online'
  );

COMMIT;
