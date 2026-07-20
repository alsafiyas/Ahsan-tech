-- Fix: Add INSERT, UPDATE, DELETE RLS policies for employees table
-- The table only had a SELECT policy, causing "new row violates row-level security" on INSERT

-- Allow authenticated users to insert employees
DROP POLICY IF EXISTS "authenticated_insert_employees" ON public.employees;
CREATE POLICY "authenticated_insert_employees"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update employees
DROP POLICY IF EXISTS "authenticated_update_employees" ON public.employees;
CREATE POLICY "authenticated_update_employees"
ON public.employees
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete employees
DROP POLICY IF EXISTS "authenticated_delete_employees" ON public.employees;
CREATE POLICY "authenticated_delete_employees"
ON public.employees
FOR DELETE
TO authenticated
USING (true);
