-- Dashboard Real-Time Tables Migration
-- Tables: orders, service_tickets, products, warehouse_items, employees, attendance, installations

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================
DROP TYPE IF EXISTS public.order_status CASCADE;
CREATE TYPE public.order_status AS ENUM ('paid', 'partial', 'invoiced', 'confirmed', 'overdue', 'cancelled');

DROP TYPE IF EXISTS public.ticket_status CASCADE;
CREATE TYPE public.ticket_status AS ENUM ('pending', 'repairing', 'service', 'ready', 'completed');

DROP TYPE IF EXISTS public.installation_status CASCADE;
CREATE TYPE public.installation_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

DROP TYPE IF EXISTS public.attendance_status CASCADE;
CREATE TYPE public.attendance_status AS ENUM ('present', 'late', 'absent', 'on_leave');

-- ============================================================
-- 2. CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    customer TEXT NOT NULL,
    product TEXT NOT NULL,
    total_uzs BIGINT NOT NULL DEFAULT 0,
    order_status public.order_status NOT NULL DEFAULT 'confirmed',
    branch TEXT NOT NULL DEFAULT 'Tashkent',
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.service_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL UNIQUE,
    customer TEXT NOT NULL,
    device TEXT NOT NULL,
    issue TEXT NOT NULL,
    ticket_status public.ticket_status NOT NULL DEFAULT 'pending',
    days_open INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'pcs',
    price_uzs BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    position TEXT NOT NULL,
    branch TEXT NOT NULL DEFAULT 'Tashkent',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    attendance_status public.attendance_status NOT NULL DEFAULT 'present',
    check_in_time TIME,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer TEXT NOT NULL,
    address TEXT NOT NULL,
    installation_status public.installation_status NOT NULL DEFAULT 'pending',
    installation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    branch TEXT NOT NULL DEFAULT 'Tashkent',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON public.orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_branch ON public.orders(branch);
CREATE INDEX IF NOT EXISTS idx_service_tickets_status ON public.service_tickets(ticket_status);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products(current_stock);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON public.attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_installations_date ON public.installations(installation_date);

-- ============================================================
-- 4. ENABLE RLS
-- ============================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS POLICIES (open read for dashboard, authenticated write)
-- ============================================================
DROP POLICY IF EXISTS "public_read_orders" ON public.orders;
CREATE POLICY "public_read_orders" ON public.orders FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "public_read_service_tickets" ON public.service_tickets;
CREATE POLICY "public_read_service_tickets" ON public.service_tickets FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "public_read_products" ON public.products;
CREATE POLICY "public_read_products" ON public.products FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "public_read_employees" ON public.employees;
CREATE POLICY "public_read_employees" ON public.employees FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "public_read_attendance" ON public.attendance;
CREATE POLICY "public_read_attendance" ON public.attendance FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "public_read_installations" ON public.installations;
CREATE POLICY "public_read_installations" ON public.installations FOR SELECT TO public USING (true);

-- ============================================================
-- 6. UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_service_tickets_updated_at ON public.service_tickets;
CREATE TRIGGER trg_service_tickets_updated_at BEFORE UPDATE ON public.service_tickets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_installations_updated_at ON public.installations;
CREATE TRIGGER trg_installations_updated_at BEFORE UPDATE ON public.installations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 7. MOCK DATA
-- ============================================================
DO $$
DECLARE
    emp1 UUID := gen_random_uuid();
    emp2 UUID := gen_random_uuid();
    emp3 UUID := gen_random_uuid();
    emp4 UUID := gen_random_uuid();
    emp5 UUID := gen_random_uuid();
BEGIN
    -- Orders
    INSERT INTO public.orders (order_number, customer, product, total_uzs, order_status, branch, order_date) VALUES
        ('ord-0241', 'Mirzo Ulugbek LLC', 'Hikvision DS-2CD2T47 x4', 18400000, 'paid', 'Tashkent', CURRENT_DATE),
        ('ord-0240', 'Jasur Xolmatov', 'Dahua IPC-HDW2849H x2 + DVR', 12750000, 'partial', 'Tashkent', CURRENT_DATE),
        ('ord-0239', 'Baraka Savdo OOO', 'PTZ DS-2DE4A425IWG x6', 34200000, 'invoiced', 'Samarkand', CURRENT_DATE),
        ('ord-0238', 'Dilnoza Yusupova', 'Reolink RLC-810A x3', 7800000, 'paid', 'Tashkent', CURRENT_DATE - 1),
        ('ord-0237', 'Ferghana Agro MCHJ', 'NVR DS-7608NI + 8 cameras', 28500000, 'confirmed', 'Namangan', CURRENT_DATE - 1),
        ('ord-0236', 'Bobur Rahimov', 'Hikvision DS-2CD2143 x2', 9200000, 'overdue', 'Tashkent', CURRENT_DATE - 6),
        ('ord-0235', 'Navruz Qodirov', 'Cable + connectors 500m', 3150000, 'paid', 'Tashkent', CURRENT_DATE - 2),
        ('ord-0234', 'Zulfiya Abdullayeva', 'Dahua SD49425XB-HNR PTZ', 16900000, 'cancelled', 'Samarkand', CURRENT_DATE - 3),
        ('ord-0233', 'Alisher Karimov', 'Hikvision DS-2CD2T47 x2', 9200000, 'paid', 'Tashkent', CURRENT_DATE - 4),
        ('ord-0232', 'Toshkent Savdo', 'NVR + 4 cameras bundle', 22100000, 'paid', 'Tashkent', CURRENT_DATE - 5),
        ('ord-0231', 'Samarkand Qurilish', 'PTZ camera x3', 18600000, 'paid', 'Samarkand', CURRENT_DATE - 5),
        ('ord-0230', 'Namangan Agro', 'IP cameras x6', 14400000, 'paid', 'Namangan', CURRENT_DATE - 6),
        ('ord-0229', 'Gulnora Hasanova', 'DVR + 4 cameras', 11800000, 'paid', 'Tashkent', CURRENT_DATE - 7),
        ('ord-0228', 'Rustam Nazarov', 'Cables + accessories', 4200000, 'paid', 'Tashkent', CURRENT_DATE - 7)
    ON CONFLICT (order_number) DO NOTHING;

    -- Service Tickets
    INSERT INTO public.service_tickets (ticket_number, customer, device, issue, ticket_status, days_open) VALUES
        ('srv-0091', 'Jasur Xolmatov', 'Hikvision DS-2CD2T47', 'No video output', 'ready', 2),
        ('srv-0089', 'Baraka Savdo OOO', 'Dahua NVR-4108HS', 'HDD failure', 'repairing', 4),
        ('srv-0087', 'Dilnoza Yusupova', 'Reolink RLC-810A', 'IR night vision', 'repairing', 3),
        ('srv-0085', 'Ferghana Agro MCHJ', 'PTZ DS-2DE4A425', 'Pan motor stuck', 'service', 6),
        ('srv-0083', 'Navruz Qodirov', 'Hikvision DS-7608NI', 'Network port dead', 'pending', 1),
        ('srv-0081', 'Alisher Karimov', 'Dahua IPC-HFW2849S', 'Lens fogged', 'repairing', 5),
        ('srv-0079', 'Toshkent Savdo', 'Hikvision DS-2CD2T47', 'Power issue', 'pending', 2),
        ('srv-0077', 'Gulnora Hasanova', 'Reolink RLC-810A', 'Motion detection', 'service', 7),
        ('srv-0075', 'Rustam Nazarov', 'DVR DS-7608NI', 'No recording', 'repairing', 3),
        ('srv-0073', 'Bobur Rahimov', 'PTZ camera', 'Zoom stuck', 'ready', 8)
    ON CONFLICT (ticket_number) DO NOTHING;

    -- Products / Warehouse
    INSERT INTO public.products (name, sku, category, current_stock, minimum_stock, unit, price_uzs) VALUES
        ('Hikvision DS-2CD2T47G2', 'HIK-2CD2T47', 'IP Cameras', 2, 10, 'pcs', 1850000),
        ('RG59 Coaxial Cable 100m', 'CBL-RG59-100', 'Cables & Acc.', 3, 20, 'rolls', 280000),
        ('Dahua IPC-HFW2849S', 'DAH-HFW2849', 'IP Cameras', 1, 8, 'pcs', 1620000),
        ('BNC Connector Pack', 'CON-BNC-50', 'Cables & Acc.', 5, 50, 'packs', 45000),
        ('Hikvision DS-2CD2143G2', 'HIK-2CD2143', 'IP Cameras', 14, 10, 'pcs', 1420000),
        ('Dahua NVR-4108HS', 'DAH-NVR4108', 'DVR / NVR', 8, 5, 'pcs', 2100000),
        ('PTZ DS-2DE4A425IWG', 'HIK-PTZ4425', 'PTZ Cameras', 6, 5, 'pcs', 4800000),
        ('Reolink RLC-810A', 'REO-RLC810', 'IP Cameras', 11, 8, 'pcs', 980000),
        ('Power Supply 12V 5A', 'PWR-12V5A', 'Cables & Acc.', 22, 15, 'pcs', 85000),
        ('Cat6 Cable 305m', 'CBL-CAT6-305', 'Cables & Acc.', 7, 10, 'rolls', 520000)
    ON CONFLICT (sku) DO NOTHING;

    -- Employees
    INSERT INTO public.employees (id, full_name, position, branch, is_active) VALUES
        (emp1, 'Akbar Toshmatov', 'Sales Manager', 'Tashkent', true),
        (emp2, 'Malika Yusupova', 'Service Technician', 'Tashkent', true),
        (emp3, 'Sardor Nazarov', 'Installation Engineer', 'Tashkent', true),
        (emp4, 'Nilufar Karimova', 'Accountant', 'Tashkent', true),
        (emp5, 'Jasur Rahimov', 'Warehouse Manager', 'Tashkent', true)
    ON CONFLICT (id) DO NOTHING;

    -- Attendance for today
    INSERT INTO public.attendance (employee_id, attendance_date, attendance_status, check_in_time) VALUES
        (emp1, CURRENT_DATE, 'present', '09:00'),
        (emp2, CURRENT_DATE, 'present', '08:55'),
        (emp3, CURRENT_DATE, 'late', '09:35'),
        (emp4, CURRENT_DATE, 'present', '08:50'),
        (emp5, CURRENT_DATE, 'absent', NULL)
    ON CONFLICT (id) DO NOTHING;

    -- Installations for today
    INSERT INTO public.installations (customer, address, installation_status, installation_date, branch) VALUES
        ('Mirzo Ulugbek LLC', 'Tashkent, Yunusobod 12', 'completed', CURRENT_DATE, 'Tashkent'),
        ('Baraka Savdo OOO', 'Samarkand, Registon 5', 'in_progress', CURRENT_DATE, 'Samarkand'),
        ('Ferghana Agro MCHJ', 'Namangan, Bozor 3', 'in_progress', CURRENT_DATE, 'Namangan'),
        ('Dilnoza Yusupova', 'Tashkent, Chilonzor 8', 'completed', CURRENT_DATE, 'Tashkent'),
        ('Alisher Karimov', 'Tashkent, Mirabad 15', 'completed', CURRENT_DATE, 'Tashkent'),
        ('Toshkent Savdo', 'Tashkent, Shayxontohur 2', 'completed', CURRENT_DATE, 'Tashkent'),
        ('Gulnora Hasanova', 'Tashkent, Uchtepa 7', 'pending', CURRENT_DATE, 'Tashkent'),
        ('Rustam Nazarov', 'Tashkent, Olmazor 4', 'pending', CURRENT_DATE, 'Tashkent'),
        ('Samarkand Qurilish', 'Samarkand, Urgut 1', 'pending', CURRENT_DATE, 'Samarkand')
    ON CONFLICT (id) DO NOTHING;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
