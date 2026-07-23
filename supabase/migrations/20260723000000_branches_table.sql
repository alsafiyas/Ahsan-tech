-- Branches table
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  manager TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  employees INTEGER NOT NULL DEFAULT 0,
  monthly_sales NUMERIC NOT NULL DEFAULT 0,
  stock_value NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  opened_date TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read branches"
  ON branches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert branches"
  ON branches FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update branches"
  ON branches FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete branches"
  ON branches FOR DELETE
  TO authenticated
  USING (true);

-- Seed data
INSERT INTO branches (name, city, address, manager, phone, employees, monthly_sales, stock_value, status, opened_date) VALUES
  ('Namangan Bosh ofis', 'Namangan', 'Mustaqillik ko''chasi 45, Namangan', 'Akbar Toshmatov', '+998 69 123 4567', 8, 215000000, 485000000, 'active', '2022-01-01'),
  ('Samarkand filiali', 'Samarkand', 'Registon ko''chasi 12, Samarkand', 'Jasur Mirzayev', '+998 66 234 5678', 3, 68000000, 125000000, 'active', '2023-03-15'),
  ('Buxoro filiali', 'Bukhara', 'Markaziy ko''cha 8, Bukhara', 'Kamola Ergasheva', '+998 65 345 6789', 2, 32000000, 58000000, 'active', '2024-06-01')
ON CONFLICT DO NOTHING;
