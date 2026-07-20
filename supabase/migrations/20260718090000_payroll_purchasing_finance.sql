-- ─── Payroll Records ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  employee_name TEXT NOT NULL DEFAULT '',
  position TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  base_salary BIGINT NOT NULL DEFAULT 0,
  bonus BIGINT NOT NULL DEFAULT 0,
  penalty BIGINT NOT NULL DEFAULT 0,
  advance BIGINT NOT NULL DEFAULT 0,
  overtime BIGINT NOT NULL DEFAULT 0,
  tax BIGINT NOT NULL DEFAULT 0,
  net_salary BIGINT NOT NULL DEFAULT 0,
  pay_month TEXT NOT NULL DEFAULT '',
  pay_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── Suppliers ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'Uzbekistan',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── Purchase Orders ──────────────────────────────────────────────────────────
DROP TYPE IF EXISTS public.po_status CASCADE;
CREATE TYPE public.po_status AS ENUM ('draft', 'sent', 'partial', 'received', 'cancelled');

DROP TYPE IF EXISTS public.po_payment_status CASCADE;
CREATE TYPE public.po_payment_status AS ENUM ('unpaid', 'partial', 'paid');

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL DEFAULT '',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  total_uzs BIGINT NOT NULL DEFAULT 0,
  po_status public.po_status NOT NULL DEFAULT 'draft',
  payment_status public.po_payment_status NOT NULL DEFAULT 'unpaid',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── Transactions (Finance) ───────────────────────────────────────────────────
DROP TYPE IF EXISTS public.transaction_type CASCADE;
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  transaction_type public.transaction_type NOT NULL DEFAULT 'income',
  amount BIGINT NOT NULL DEFAULT 0,
  account TEXT NOT NULL DEFAULT 'Cash',
  reference TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payroll_records_pay_month ON public.payroll_records(pay_month);
CREATE INDEX IF NOT EXISTS idx_payroll_records_employee_id ON public.payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_status ON public.purchase_orders(po_status);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(transaction_type);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_payroll_records" ON public.payroll_records;
CREATE POLICY "authenticated_all_payroll_records" ON public.payroll_records
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_suppliers" ON public.suppliers;
CREATE POLICY "authenticated_all_suppliers" ON public.suppliers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_purchase_orders" ON public.purchase_orders;
CREATE POLICY "authenticated_all_purchase_orders" ON public.purchase_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_transactions" ON public.transactions;
CREATE POLICY "authenticated_all_transactions" ON public.transactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Mock Data ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  sup1_id UUID := gen_random_uuid();
  sup2_id UUID := gen_random_uuid();
  sup3_id UUID := gen_random_uuid();
  sup4_id UUID := gen_random_uuid();
  emp1_id UUID;
  emp2_id UUID;
  emp3_id UUID;
BEGIN
  -- Suppliers
  INSERT INTO public.suppliers (id, name, contact_person, phone, email, country)
  VALUES
    (sup1_id, 'Hikvision Uzbekistan', 'Aziz Karimov', '+998 71 123 4567', 'sales@hikvision.uz', 'Uzbekistan'),
    (sup2_id, 'Dahua Technology UZ', 'Bobur Nazarov', '+998 71 234 5678', 'info@dahua.uz', 'Uzbekistan'),
    (sup3_id, 'Seagate Distribution', 'Timur Yusupov', '+998 71 345 6789', 'orders@seagate-dist.uz', 'Uzbekistan'),
    (sup4_id, 'TP-Link Wholesale', 'Kamol Ergashev', '+998 71 456 7890', 'wholesale@tplink.uz', 'Uzbekistan')
  ON CONFLICT (id) DO NOTHING;

  -- Purchase Orders
  INSERT INTO public.purchase_orders (id, po_number, supplier_id, supplier_name, order_date, expected_date, total_uzs, po_status, payment_status)
  VALUES
    (gen_random_uuid(), 'PO-2026-045', sup1_id, 'Hikvision Uzbekistan', '2026-07-14', '2026-07-21', 22400000, 'sent'::public.po_status, 'partial'::public.po_payment_status),
    (gen_random_uuid(), 'PO-2026-044', sup2_id, 'Dahua Technology UZ', '2026-07-12', '2026-07-18', 19050000, 'received'::public.po_status, 'paid'::public.po_payment_status),
    (gen_random_uuid(), 'PO-2026-043', sup3_id, 'Seagate Distribution', '2026-07-10', '2026-07-15', 6500000, 'received'::public.po_status, 'paid'::public.po_payment_status),
    (gen_random_uuid(), 'PO-2026-046', sup4_id, 'TP-Link Wholesale', '2026-07-15', '2026-07-22', 7600000, 'draft'::public.po_status, 'unpaid'::public.po_payment_status),
    (gen_random_uuid(), 'PO-2026-042', sup1_id, 'Hikvision Uzbekistan', '2026-07-08', '2026-07-14', 9600000, 'partial'::public.po_status, 'partial'::public.po_payment_status)
  ON CONFLICT (po_number) DO NOTHING;

  -- Transactions
  INSERT INTO public.transactions (id, transaction_date, description, category, transaction_type, amount, account, reference)
  VALUES
    (gen_random_uuid(), '2026-07-16', 'Sales — Tashkent Plaza Hotel', 'Sales Revenue', 'income'::public.transaction_type, 45000000, 'Kapitalbank', 'SO-2026-112'),
    (gen_random_uuid(), '2026-07-16', 'Salary Advance — Malika Yusupova', 'Payroll', 'expense'::public.transaction_type, 1000000, 'Cash', 'ADV-2026-008'),
    (gen_random_uuid(), '2026-07-15', 'Purchase — Hikvision Uzbekistan', 'Procurement', 'expense'::public.transaction_type, 22400000, 'Kapitalbank', 'PO-2026-045'),
    (gen_random_uuid(), '2026-07-15', 'Sales — Nexus LLC Office', 'Sales Revenue', 'income'::public.transaction_type, 18500000, 'Kapitalbank', 'SO-2026-111'),
    (gen_random_uuid(), '2026-07-14', 'Rent — Tashkent Office', 'Rent', 'expense'::public.transaction_type, 8000000, 'Kapitalbank', 'RENT-2026-07'),
    (gen_random_uuid(), '2026-07-14', 'Service Revenue — SRV-2026-004', 'Service Revenue', 'income'::public.transaction_type, 780000, 'Cash', 'SRV-2026-004'),
    (gen_random_uuid(), '2026-07-13', 'Fuel and Transport', 'Operations', 'expense'::public.transaction_type, 1200000, 'Cash', 'EXP-2026-034'),
    (gen_random_uuid(), '2026-07-13', 'Sales — Mirzo Ulugbek School', 'Sales Revenue', 'income'::public.transaction_type, 32000000, 'Kapitalbank', 'SO-2026-110'),
    (gen_random_uuid(), '2026-07-12', 'Internet and Utilities', 'Utilities', 'expense'::public.transaction_type, 850000, 'Cash', 'EXP-2026-033'),
    (gen_random_uuid(), '2026-07-12', 'Purchase — Seagate Distribution', 'Procurement', 'expense'::public.transaction_type, 6500000, 'Kapitalbank', 'PO-2026-043')
  ON CONFLICT (id) DO NOTHING;

  -- Payroll Records (using employees if they exist)
  SELECT id INTO emp1_id FROM public.employees WHERE full_name ILIKE '%Akbar%' LIMIT 1;
  SELECT id INTO emp2_id FROM public.employees WHERE full_name ILIKE '%Malika%' LIMIT 1;
  SELECT id INTO emp3_id FROM public.employees WHERE full_name ILIKE '%Bobur%' LIMIT 1;

  INSERT INTO public.payroll_records (id, employee_id, employee_name, position, department, base_salary, bonus, penalty, advance, overtime, tax, net_salary, pay_month, pay_status)
  VALUES
    (gen_random_uuid(), emp1_id, 'Akbar Toshmatov', 'Admin', 'Management', 8000000, 1500000, 0, 2000000, 450000, 480000, 7470000, '2026-07', 'pending'),
    (gen_random_uuid(), emp2_id, 'Malika Yusupova', 'Sales Manager', 'Sales', 5500000, 2200000, 0, 1000000, 0, 330000, 6370000, '2026-07', 'pending'),
    (gen_random_uuid(), emp3_id, 'Bobur Yusupov', 'Technician', 'Service', 4200000, 500000, 0, 0, 280000, 252000, 4728000, '2026-07', 'pending'),
    (gen_random_uuid(), NULL, 'Sardor Toshmatov', 'Senior Technician', 'Service', 5000000, 800000, 0, 500000, 320000, 300000, 5320000, '2026-07', 'pending'),
    (gen_random_uuid(), NULL, 'Jasur Mirzayev', 'Installation Tech', 'Installation', 4500000, 600000, 0, 0, 350000, 270000, 5180000, '2026-07', 'pending'),
    (gen_random_uuid(), NULL, 'Nilufar Karimova', 'Accountant', 'Finance', 5200000, 300000, 50000, 1000000, 0, 312000, 4138000, '2026-07', 'pending'),
    (gen_random_uuid(), NULL, 'Sherzod Rahimov', 'Warehouse Manager', 'Warehouse', 4800000, 400000, 0, 0, 240000, 288000, 5152000, '2026-07', 'pending'),
    (gen_random_uuid(), NULL, 'Ulugbek Xasanov', 'Driver', 'Logistics', 3500000, 200000, 0, 500000, 180000, 210000, 3170000, '2026-07', 'pending')
  ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
