-- ============================================================
-- Migration: admin_audit_logs — track admin actions with actor identity
-- ============================================================

-- 1. Create audit action type ENUM
DROP TYPE IF EXISTS public.audit_action CASCADE;
CREATE TYPE public.audit_action AS ENUM (
  'user_created',
  'role_changed',
  'password_reset',
  'login_success',
  'login_failed'
);

-- 2. Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action public.audit_action NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL DEFAULT '',
  actor_role TEXT NOT NULL DEFAULT '',
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_email TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.admin_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user_id ON public.admin_audit_logs(target_user_id);

-- 4. Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies — only Admins can read; inserts allowed for authenticated users (service role used for writes)
DROP POLICY IF EXISTS "admins_read_audit_logs" ON public.admin_audit_logs;
CREATE POLICY "admins_read_audit_logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'Admin'
  )
);

DROP POLICY IF EXISTS "authenticated_insert_audit_logs" ON public.admin_audit_logs;
CREATE POLICY "authenticated_insert_audit_logs"
ON public.admin_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow service role full access for server-side logging
DROP POLICY IF EXISTS "service_role_all_audit_logs" ON public.admin_audit_logs;
CREATE POLICY "service_role_all_audit_logs"
ON public.admin_audit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
