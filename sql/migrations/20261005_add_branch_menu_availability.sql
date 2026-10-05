-- Track whether each catalog item is in stock at each Mayford outlet.
-- Public menu responses intentionally do not expose these per-branch flags;
-- the API uses them to route orders to a kitchen that can fulfill the basket.
BEGIN;

CREATE TABLE IF NOT EXISTS public.menu_item_outlet_availability (
  menu_item_id BIGINT NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  outlet VARCHAR(100) NOT NULL CHECK (outlet IN ('Adabraka', 'Dzorwulu')),
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'unavailable')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by BIGINT REFERENCES public.admins(id) ON DELETE SET NULL,
  PRIMARY KEY (menu_item_id, outlet)
);

CREATE INDEX IF NOT EXISTS idx_menu_item_outlet_availability_outlet_status
  ON public.menu_item_outlet_availability (outlet, status);

INSERT INTO public.menu_item_outlet_availability (menu_item_id, outlet, status)
SELECT item.id, outlet.outlet, 'available'
FROM public.menu_items AS item
CROSS JOIN (VALUES ('Adabraka'), ('Dzorwulu')) AS outlet(outlet)
ON CONFLICT (menu_item_id, outlet) DO NOTHING;

ALTER TABLE public.menu_item_outlet_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access menu_item_outlet_availability"
  ON public.menu_item_outlet_availability;
CREATE POLICY "Service role full access menu_item_outlet_availability"
  ON public.menu_item_outlet_availability FOR ALL TO service_role
  USING (true) WITH CHECK (true);
REVOKE ALL ON public.menu_item_outlet_availability FROM anon, authenticated;
GRANT ALL ON public.menu_item_outlet_availability TO service_role;

COMMIT;
