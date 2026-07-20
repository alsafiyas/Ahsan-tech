-- ============================================================
-- Migration: alerts — centralized real-time alerts table
-- Types: failed_login, role_change, low_stock, service_ticket
-- ============================================================

-- 1. Create alert type ENUM
DROP TYPE IF EXISTS public.alert_type CASCADE;
CREATE TYPE public.alert_type AS ENUM (
  'failed_login',
  'role_change',
  'low_stock',
  'service_ticket'
);

-- 2. Create alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.alert_type NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_alerts_type ON public.alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON public.alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);

-- 4. Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies — Admins and Managers can read; authenticated users can insert
DROP POLICY IF EXISTS "admins_managers_read_alerts" ON public.alerts;
CREATE POLICY "admins_managers_read_alerts"
ON public.alerts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('Admin', 'Manager')
  )
);

DROP POLICY IF EXISTS "authenticated_insert_alerts" ON public.alerts;
CREATE POLICY "authenticated_insert_alerts"
ON public.alerts
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "admins_update_alerts" ON public.alerts;
CREATE POLICY "admins_update_alerts"
ON public.alerts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('Admin', 'Manager')
  )
)
WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_alerts" ON public.alerts;
CREATE POLICY "service_role_all_alerts"
ON public.alerts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 6. Enable realtime for alerts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

-- 7. Seed some initial alerts from existing audit logs (if any exist)
-- Insert sample alerts for demonstration
INSERT INTO public.alerts (type, title, message, metadata, is_read, created_at)
SELECT
  'failed_login'::public.alert_type,
  'Failed Login Attempt',
  COALESCE('Failed login for ' || target_email, 'Failed login attempt detected'),
  jsonb_build_object('actor_email', actor_email, 'actor_role', actor_role, 'details', details),
  false,
  created_at
FROM public.admin_audit_logs
WHERE action = 'login_failed'
LIMIT 5
ON CONFLICT DO NOTHING;

INSERT INTO public.alerts (type, title, message, metadata, is_read, created_at)
SELECT
  'role_change'::public.alert_type,
  'User Role Changed',
  COALESCE('Role changed for ' || target_email || ' from ' || (details->>'old_role') || ' to ' || (details->>'new_role'), 'User role was modified'),
  jsonb_build_object('actor_email', actor_email, 'target_email', target_email, 'details', details),
  false,
  created_at
FROM public.admin_audit_logs
WHERE action = 'role_changed'
LIMIT 5
ON CONFLICT DO NOTHING;
