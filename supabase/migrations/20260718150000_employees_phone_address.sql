-- Add phone and address columns to employees table
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '' NOT NULL,
ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '' NOT NULL,
ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '' NOT NULL,
ADD COLUMN IF NOT EXISTS department TEXT DEFAULT '' NOT NULL,
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON public.employees(auth_user_id);
