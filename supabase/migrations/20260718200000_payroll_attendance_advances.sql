-- ─── Employee Salary Config ──────────────────────────────────────────────────
-- Stores each employee's base salary, daily rate, and work type
CREATE TABLE IF NOT EXISTS public.employee_salary_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  base_monthly_salary BIGINT NOT NULL DEFAULT 0,
  daily_rate BIGINT NOT NULL DEFAULT 0,
  work_type TEXT NOT NULL DEFAULT 'monthly',
  -- 'monthly' | 'daily' | 'task_based'
  working_days_per_month INTEGER NOT NULL DEFAULT 26,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── Salary Advances ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.salary_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL DEFAULT '',
  amount BIGINT NOT NULL DEFAULT 0,
  advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pay_month TEXT NOT NULL DEFAULT '',
  -- e.g. '2026-07'
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'given',
  -- 'given' | 'deducted'
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── Salary Payments ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.salary_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_record_id UUID REFERENCES public.payroll_records(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  employee_name TEXT NOT NULL DEFAULT '',
  pay_month TEXT NOT NULL DEFAULT '',
  amount_paid BIGINT NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  -- 'cash' | 'bank_transfer' | 'card'
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── Add attendance_days and task_count columns to payroll_records ────────────
ALTER TABLE public.payroll_records
ADD COLUMN IF NOT EXISTS attendance_days INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.payroll_records
ADD COLUMN IF NOT EXISTS task_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.payroll_records
ADD COLUMN IF NOT EXISTS work_type TEXT NOT NULL DEFAULT 'monthly';

ALTER TABLE public.payroll_records
ADD COLUMN IF NOT EXISTS calculated_salary BIGINT NOT NULL DEFAULT 0;

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_employee_salary_config_employee_id ON public.employee_salary_config(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_advances_employee_id ON public.salary_advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_advances_pay_month ON public.salary_advances(pay_month);
CREATE INDEX IF NOT EXISTS idx_salary_payments_employee_id ON public.salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_pay_month ON public.salary_payments(pay_month);
CREATE INDEX IF NOT EXISTS idx_salary_payments_payroll_record_id ON public.salary_payments(payroll_record_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.employee_salary_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_employee_salary_config" ON public.employee_salary_config;
CREATE POLICY "authenticated_all_employee_salary_config" ON public.employee_salary_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_salary_advances" ON public.salary_advances;
CREATE POLICY "authenticated_all_salary_advances" ON public.salary_advances
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_salary_payments" ON public.salary_payments;
CREATE POLICY "authenticated_all_salary_payments" ON public.salary_payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Mock Data ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  emp1_id UUID;
  emp2_id UUID;
  emp3_id UUID;
  emp4_id UUID;
  pr1_id UUID;
  pr2_id UUID;
BEGIN
  -- Get existing employee IDs
  SELECT id INTO emp1_id FROM public.employees ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO emp2_id FROM public.employees ORDER BY created_at ASC OFFSET 1 LIMIT 1;
  SELECT id INTO emp3_id FROM public.employees ORDER BY created_at ASC OFFSET 2 LIMIT 1;
  SELECT id INTO emp4_id FROM public.employees ORDER BY created_at ASC OFFSET 3 LIMIT 1;

  -- Salary configs for employees
  IF emp1_id IS NOT NULL THEN
    INSERT INTO public.employee_salary_config (id, employee_id, base_monthly_salary, daily_rate, work_type, working_days_per_month)
    VALUES (gen_random_uuid(), emp1_id, 8000000, 307692, 'monthly', 26)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF emp2_id IS NOT NULL THEN
    INSERT INTO public.employee_salary_config (id, employee_id, base_monthly_salary, daily_rate, work_type, working_days_per_month)
    VALUES (gen_random_uuid(), emp2_id, 5500000, 211538, 'daily', 26)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF emp3_id IS NOT NULL THEN
    INSERT INTO public.employee_salary_config (id, employee_id, base_monthly_salary, daily_rate, work_type, working_days_per_month)
    VALUES (gen_random_uuid(), emp3_id, 4200000, 161538, 'monthly', 26)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF emp4_id IS NOT NULL THEN
    INSERT INTO public.employee_salary_config (id, employee_id, base_monthly_salary, daily_rate, work_type, working_days_per_month)
    VALUES (gen_random_uuid(), emp4_id, 4500000, 173076, 'task_based', 26)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Salary advances
  IF emp1_id IS NOT NULL THEN
    INSERT INTO public.salary_advances (id, employee_id, employee_name, amount, advance_date, pay_month, reason, status)
    VALUES
      (gen_random_uuid(), emp1_id, 'Akbar Toshmatov', 2000000, '2026-07-05', '2026-07', 'Shaxsiy ehtiyoj', 'given'),
      (gen_random_uuid(), emp1_id, 'Akbar Toshmatov', 1000000, '2026-06-10', '2026-06', 'Tibbiy xarajat', 'deducted')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF emp2_id IS NOT NULL THEN
    INSERT INTO public.salary_advances (id, employee_id, employee_name, amount, advance_date, pay_month, reason, status)
    VALUES
      (gen_random_uuid(), emp2_id, 'Malika Yusupova', 1000000, '2026-07-08', '2026-07', 'Uy xarajati', 'given')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Get payroll record IDs for payments
  SELECT id INTO pr1_id FROM public.payroll_records WHERE pay_month = '2026-07' ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO pr2_id FROM public.payroll_records WHERE pay_month = '2026-07' ORDER BY created_at ASC OFFSET 1 LIMIT 1;

  -- Salary payments
  IF pr1_id IS NOT NULL AND emp1_id IS NOT NULL THEN
    INSERT INTO public.salary_payments (id, payroll_record_id, employee_id, employee_name, pay_month, amount_paid, payment_method, payment_date, notes)
    VALUES
      (gen_random_uuid(), pr1_id, emp1_id, 'Akbar Toshmatov', '2026-07', 7470000, 'bank_transfer', '2026-07-31', 'Iyul oyligi tolov')
    ON CONFLICT (id) DO NOTHING;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
