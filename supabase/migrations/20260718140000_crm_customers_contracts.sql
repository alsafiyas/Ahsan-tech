-- CRM: customers and contracts tables

-- 1. Types
DROP TYPE IF EXISTS public.customer_status CASCADE;
CREATE TYPE public.customer_status AS ENUM ('active', 'inactive', 'vip');

DROP TYPE IF EXISTS public.customer_type CASCADE;
CREATE TYPE public.customer_type AS ENUM ('physical', 'legal');

DROP TYPE IF EXISTS public.contract_status CASCADE;
CREATE TYPE public.contract_status AS ENUM ('active', 'expired', 'pending', 'cancelled');

-- 2. Tables
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.customer_type NOT NULL DEFAULT 'physical'::public.customer_type,
  name TEXT NOT NULL DEFAULT '',
  company TEXT,
  phone TEXT NOT NULL DEFAULT '',
  telegram TEXT,
  email TEXT,
  address TEXT NOT NULL DEFAULT '',
  district TEXT,
  city TEXT NOT NULL DEFAULT 'Toshkent',
  status public.customer_status NOT NULL DEFAULT 'active'::public.customer_status,
  total_debt BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  last_activity DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  number TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'Installation',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount BIGINT NOT NULL DEFAULT 0,
  status public.contract_status NOT NULL DEFAULT 'pending'::public.contract_status,
  object TEXT NOT NULL DEFAULT '',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_type ON public.customers(type);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON public.contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);

-- 4. Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "authenticated_all_customers" ON public.customers;
CREATE POLICY "authenticated_all_customers"
ON public.customers FOR ALL TO authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_contracts" ON public.contracts;
CREATE POLICY "authenticated_all_contracts"
ON public.contracts FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- 6. Seed data
DO $$
DECLARE
  c1 UUID := gen_random_uuid();
  c2 UUID := gen_random_uuid();
  c3 UUID := gen_random_uuid();
  c4 UUID := gen_random_uuid();
  c5 UUID := gen_random_uuid();
  c6 UUID := gen_random_uuid();
  c7 UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.customers (id, type, name, company, phone, telegram, email, address, district, city, status, total_debt, last_activity)
  VALUES
    (c1, 'physical', 'Akbar Yusupov', NULL, '+998 90 123 45 67', '@akbar_y', 'akbar@gmail.com', 'Chilonzor tumani, 9-mavze, 12-uy', 'Chilonzor', 'Toshkent', 'vip', 0, '2026-07-14'),
    (c2, 'legal', 'Sardor Mirzayev', 'Mirzayev Security LLC', '+998 91 234 56 78', '@sardor_m', 'sardor@mirzayev.uz', 'Yunusobod tumani, 19-mavze', 'Yunusobod', 'Toshkent', 'active', 1200000, '2026-07-12'),
    (c3, 'legal', 'Nodira Karimova', 'Karimova Trade Group', '+998 93 345 67 89', NULL, 'nodira@karimova.uz', 'Mirzo Ulugbek tumani, 5-mavze', 'Mirzo Ulugbek', 'Toshkent', 'active', 0, '2026-07-10'),
    (c4, 'physical', 'Jasur Toshmatov', NULL, '+998 94 456 78 90', '@jasur_t', NULL, 'Shayxontohur tumani, Navruz kochasi 7', 'Shayxontohur', 'Toshkent', 'active', 450000, '2026-07-08'),
    (c5, 'legal', 'Dilnoza Xasanova', 'Xasanova Holding', '+998 95 567 89 01', '@dilnoza_x', 'dilnoza@xasanova.uz', 'Uchtepa tumani, Bogishamol kochasi 15', 'Uchtepa', 'Toshkent', 'vip', 0, '2026-07-15'),
    (c6, 'physical', 'Bobur Rahimov', NULL, '+998 97 678 90 12', NULL, NULL, 'Olmazor tumani, Qoratosh kochasi 3', 'Olmazor', 'Toshkent', 'inactive', 0, '2026-05-20'),
    (c7, 'legal', 'Feruza Nazarova', 'Nazarova Business Center', '+998 98 789 01 23', NULL, 'feruza@nazarova.uz', 'Bektemir tumani, Sanoat kochasi 22', 'Bektemir', 'Toshkent', 'active', 800000, '2026-07-11')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.contracts (customer_id, number, type, start_date, end_date, amount, status, object)
  VALUES
    (c1, 'CTR-2024-001', 'Installation', '2024-03-15', '2025-03-15', 12500000, 'expired', 'Main Office'),
    (c1, 'CTR-2024-045', 'Maintenance', '2024-06-01', '2025-06-01', 3600000, 'expired', 'Warehouse A'),
    (c1, 'CTR-2025-012', 'Installation', '2025-01-10', '2026-01-10', 8200000, 'active', 'Parking Zone'),
    (c2, 'CTR-2024-010', 'Installation', '2024-04-01', '2025-04-01', 15000000, 'expired', 'Office Building'),
    (c2, 'CTR-2025-020', 'Maintenance', '2025-02-01', '2026-02-01', 4800000, 'active', 'Warehouse B'),
    (c5, 'CTR-2025-030', 'Installation', '2025-03-01', '2026-03-01', 22000000, 'active', 'Head Office'),
    (c7, 'CTR-2025-040', 'Maintenance', '2025-04-01', '2026-04-01', 6000000, 'active', 'Business Center')
  ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'CRM seed data error: %', SQLERRM;
END $$;
