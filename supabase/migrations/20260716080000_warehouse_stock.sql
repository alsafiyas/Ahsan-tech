-- Warehouse Stock & Movements Migration
-- Adds warehouse_stock (per-location stock levels) and stock_movements tables
-- Syncs with existing products table (current_stock, minimum_stock)

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================
DROP TYPE IF EXISTS public.movement_type CASCADE;
CREATE TYPE public.movement_type AS ENUM ('in', 'out', 'transfer');

-- ============================================================
-- 2. TABLES
-- ============================================================

-- Per-warehouse stock levels (links products to warehouses)
CREATE TABLE IF NOT EXISTS public.warehouse_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    warehouse_name TEXT NOT NULL DEFAULT 'Tashkent Main',
    quantity INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'pcs',
    last_movement_date DATE DEFAULT CURRENT_DATE,
    last_movement_type public.movement_type DEFAULT 'in',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Stock movements log (purchase orders, sales, transfers)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    movement_type public.movement_type NOT NULL DEFAULT 'in',
    quantity INTEGER NOT NULL DEFAULT 0,
    from_location TEXT NOT NULL DEFAULT 'Supplier',
    to_location TEXT NOT NULL DEFAULT 'Tashkent Main',
    reference TEXT NOT NULL DEFAULT '',
    performed_by TEXT NOT NULL DEFAULT 'System',
    movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_product ON public.warehouse_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse ON public.warehouse_stock(warehouse_name);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_quantity ON public.warehouse_stock(quantity);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON public.stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON public.stock_movements(reference);

-- ============================================================
-- 4. ENABLE RLS
-- ============================================================
ALTER TABLE public.warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "public_read_warehouse_stock" ON public.warehouse_stock;
CREATE POLICY "public_read_warehouse_stock" ON public.warehouse_stock FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "public_write_warehouse_stock" ON public.warehouse_stock;
CREATE POLICY "public_write_warehouse_stock" ON public.warehouse_stock FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_stock_movements" ON public.stock_movements;
CREATE POLICY "public_read_stock_movements" ON public.stock_movements FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "public_write_stock_movements" ON public.stock_movements;
CREATE POLICY "public_write_stock_movements" ON public.stock_movements FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================
-- 6. UPDATED_AT TRIGGER
-- ============================================================
DROP TRIGGER IF EXISTS trg_warehouse_stock_updated_at ON public.warehouse_stock;
CREATE TRIGGER trg_warehouse_stock_updated_at BEFORE UPDATE ON public.warehouse_stock
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 7. FUNCTION: sync products.current_stock after movement
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_product_stock_after_movement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Recalculate current_stock for the product as sum of all warehouse quantities
    UPDATE public.products
    SET current_stock = (
        SELECT COALESCE(SUM(ws.quantity), 0)
        FROM public.warehouse_stock ws
        WHERE ws.product_id = NEW.product_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_stock ON public.warehouse_stock;
CREATE TRIGGER trg_sync_product_stock
AFTER INSERT OR UPDATE ON public.warehouse_stock
FOR EACH ROW EXECUTE FUNCTION public.sync_product_stock_after_movement();

-- ============================================================
-- 8. MOCK DATA
-- ============================================================
DO $$
DECLARE
    p_hik2cd2t47 UUID;
    p_rg59 UUID;
    p_dah_hfw UUID;
    p_bnc UUID;
    p_hik2cd2143 UUID;
    p_dah_nvr UUID;
    p_ptz UUID;
    p_reolink UUID;
    p_pwr UUID;
    p_cat6 UUID;
BEGIN
    -- Get existing product IDs
    SELECT id INTO p_hik2cd2t47 FROM public.products WHERE sku = 'HIK-2CD2T47' LIMIT 1;
    SELECT id INTO p_rg59 FROM public.products WHERE sku = 'CBL-RG59-100' LIMIT 1;
    SELECT id INTO p_dah_hfw FROM public.products WHERE sku = 'DAH-HFW2849' LIMIT 1;
    SELECT id INTO p_bnc FROM public.products WHERE sku = 'CON-BNC-50' LIMIT 1;
    SELECT id INTO p_hik2cd2143 FROM public.products WHERE sku = 'HIK-2CD2143' LIMIT 1;
    SELECT id INTO p_dah_nvr FROM public.products WHERE sku = 'DAH-NVR4108' LIMIT 1;
    SELECT id INTO p_ptz FROM public.products WHERE sku = 'HIK-PTZ4425' LIMIT 1;
    SELECT id INTO p_reolink FROM public.products WHERE sku = 'REO-RLC810' LIMIT 1;
    SELECT id INTO p_pwr FROM public.products WHERE sku = 'PWR-12V5A' LIMIT 1;
    SELECT id INTO p_cat6 FROM public.products WHERE sku = 'CBL-CAT6-305' LIMIT 1;

    -- Warehouse stock per location
    IF p_hik2cd2t47 IS NOT NULL THEN
        INSERT INTO public.warehouse_stock (product_id, warehouse_name, quantity, min_stock, unit, last_movement_date, last_movement_type)
        VALUES (p_hik2cd2t47, 'Tashkent Main', 2, 10, 'pcs', CURRENT_DATE - 1, 'out')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF p_rg59 IS NOT NULL THEN
        INSERT INTO public.warehouse_stock (product_id, warehouse_name, quantity, min_stock, unit, last_movement_date, last_movement_type)
        VALUES (p_rg59, 'Tashkent Main', 3, 20, 'rolls', CURRENT_DATE - 2, 'out')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF p_dah_hfw IS NOT NULL THEN
        INSERT INTO public.warehouse_stock (product_id, warehouse_name, quantity, min_stock, unit, last_movement_date, last_movement_type)
        VALUES (p_dah_hfw, 'Tashkent Main', 1, 8, 'pcs', CURRENT_DATE - 1, 'out')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF p_bnc IS NOT NULL THEN
        INSERT INTO public.warehouse_stock (product_id, warehouse_name, quantity, min_stock, unit, last_movement_date, last_movement_type)
        VALUES (p_bnc, 'Tashkent Main', 5, 50, 'packs', CURRENT_DATE - 3, 'out')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF p_hik2cd2143 IS NOT NULL THEN
        INSERT INTO public.warehouse_stock (product_id, warehouse_name, quantity, min_stock, unit, last_movement_date, last_movement_type)
        VALUES
            (p_hik2cd2143, 'Tashkent Main', 10, 10, 'pcs', CURRENT_DATE, 'in'),
            (p_hik2cd2143, 'Samarkand', 4, 5, 'pcs', CURRENT_DATE - 4, 'in')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF p_dah_nvr IS NOT NULL THEN
        INSERT INTO public.warehouse_stock (product_id, warehouse_name, quantity, min_stock, unit, last_movement_date, last_movement_type)
        VALUES (p_dah_nvr, 'Tashkent Main', 8, 5, 'pcs', CURRENT_DATE - 2, 'in')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF p_ptz IS NOT NULL THEN
        INSERT INTO public.warehouse_stock (product_id, warehouse_name, quantity, min_stock, unit, last_movement_date, last_movement_type)
        VALUES (p_ptz, 'Tashkent Main', 6, 5, 'pcs', CURRENT_DATE - 5, 'out')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF p_reolink IS NOT NULL THEN
        INSERT INTO public.warehouse_stock (product_id, warehouse_name, quantity, min_stock, unit, last_movement_date, last_movement_type)
        VALUES
            (p_reolink, 'Tashkent Main', 8, 8, 'pcs', CURRENT_DATE - 1, 'in'),
            (p_reolink, 'Namangan', 3, 3, 'pcs', CURRENT_DATE - 6, 'in')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF p_pwr IS NOT NULL THEN
        INSERT INTO public.warehouse_stock (product_id, warehouse_name, quantity, min_stock, unit, last_movement_date, last_movement_type)
        VALUES (p_pwr, 'Tashkent Main', 22, 15, 'pcs', CURRENT_DATE - 7, 'in')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF p_cat6 IS NOT NULL THEN
        INSERT INTO public.warehouse_stock (product_id, warehouse_name, quantity, min_stock, unit, last_movement_date, last_movement_type)
        VALUES
            (p_cat6, 'Tashkent Main', 5, 10, 'rolls', CURRENT_DATE - 2, 'out'),
            (p_cat6, 'Samarkand', 2, 3, 'rolls', CURRENT_DATE - 8, 'in')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Stock movements (purchase orders, sales, transfers)
    IF p_hik2cd2t47 IS NOT NULL THEN
        INSERT INTO public.stock_movements (product_id, movement_type, quantity, from_location, to_location, reference, performed_by, movement_date)
        VALUES
            (p_hik2cd2t47, 'in', 5, 'Supplier', 'Tashkent Main', 'PO-2026-045', 'Sherzod Rahimov', CURRENT_DATE - 1),
            (p_hik2cd2t47, 'out', 3, 'Tashkent Main', 'Customer', 'SO-2026-112', 'Malika Yusupova', CURRENT_DATE - 1)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF p_dah_hfw IS NOT NULL THEN
        INSERT INTO public.stock_movements (product_id, movement_type, quantity, from_location, to_location, reference, performed_by, movement_date)
        VALUES
            (p_dah_hfw, 'in', 4, 'Supplier', 'Tashkent Main', 'PO-2026-044', 'Sherzod Rahimov', CURRENT_DATE - 3),
            (p_dah_hfw, 'out', 3, 'Tashkent Main', 'Service', 'SRV-2026-006', 'Bobur Yusupov', CURRENT_DATE - 2)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF p_hik2cd2143 IS NOT NULL THEN
        INSERT INTO public.stock_movements (product_id, movement_type, quantity, from_location, to_location, reference, performed_by, movement_date)
        VALUES
            (p_hik2cd2143, 'in', 14, 'Supplier', 'Tashkent Main', 'PO-2026-043', 'Sherzod Rahimov', CURRENT_DATE),
            (p_hik2cd2143, 'transfer', 4, 'Tashkent Main', 'Samarkand', 'TRF-2026-008', 'Sherzod Rahimov', CURRENT_DATE - 4)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF p_ptz IS NOT NULL THEN
        INSERT INTO public.stock_movements (product_id, movement_type, quantity, from_location, to_location, reference, performed_by, movement_date)
        VALUES
            (p_ptz, 'in', 10, 'Supplier', 'Tashkent Main', 'PO-2026-040', 'Sherzod Rahimov', CURRENT_DATE - 10),
            (p_ptz, 'out', 4, 'Tashkent Main', 'Customer', 'SO-2026-098', 'Akbar Toshmatov', CURRENT_DATE - 5)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF p_cat6 IS NOT NULL THEN
        INSERT INTO public.stock_movements (product_id, movement_type, quantity, from_location, to_location, reference, performed_by, movement_date)
        VALUES
            (p_cat6, 'in', 10, 'Supplier', 'Tashkent Main', 'PO-2026-043', 'Sherzod Rahimov', CURRENT_DATE - 2),
            (p_cat6, 'transfer', 2, 'Tashkent Main', 'Samarkand', 'TRF-2026-009', 'Sherzod Rahimov', CURRENT_DATE - 8)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF p_rg59 IS NOT NULL THEN
        INSERT INTO public.stock_movements (product_id, movement_type, quantity, from_location, to_location, reference, performed_by, movement_date)
        VALUES
            (p_rg59, 'in', 10, 'Supplier', 'Tashkent Main', 'PO-2026-038', 'Sherzod Rahimov', CURRENT_DATE - 15),
            (p_rg59, 'out', 7, 'Tashkent Main', 'Installation', 'INST-2026-022', 'Sardor Nazarov', CURRENT_DATE - 6)
        ON CONFLICT (id) DO NOTHING;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Warehouse mock data insertion failed: %', SQLERRM;
END $$;
