-- ============================================================
-- Migration: audit_config table + admin RLS for user_profiles
-- ============================================================

-- 1. Create audit_config table
CREATE TABLE IF NOT EXISTS public.audit_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT NOT NULL UNIQUE,
    config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT DEFAULT '',
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Index
CREATE INDEX IF NOT EXISTS idx_audit_config_key ON public.audit_config(config_key);

-- 3. Helper function: check if current user is Admin (queries user_profiles — safe for non-user tables)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'Admin'
)
$$;

-- 4. Enable RLS
ALTER TABLE public.audit_config ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for audit_config
DROP POLICY IF EXISTS "admin_read_audit_config" ON public.audit_config;
CREATE POLICY "admin_read_audit_config"
ON public.audit_config
FOR SELECT
TO authenticated
USING (public.is_admin_user());

DROP POLICY IF EXISTS "admin_write_audit_config" ON public.audit_config;
CREATE POLICY "admin_write_audit_config"
ON public.audit_config
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- 6. Add admin read-all policy to user_profiles (admins need to see all users)
DROP POLICY IF EXISTS "admin_read_all_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_read_all_user_profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_admin_user() OR id = auth.uid());

DROP POLICY IF EXISTS "admin_update_all_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_update_all_user_profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (public.is_admin_user() OR id = auth.uid())
WITH CHECK (public.is_admin_user() OR id = auth.uid());

DROP POLICY IF EXISTS "admin_insert_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_insert_user_profiles"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user() OR id = auth.uid());

DROP POLICY IF EXISTS "admin_delete_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_delete_user_profiles"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (public.is_admin_user());

-- 7. Seed default audit config rows
DO $$
BEGIN
    INSERT INTO public.audit_config (config_key, config_value, description)
    VALUES
        ('audit_rules', jsonb_build_object(
            'track_login_success', true,
            'track_login_failed', true,
            'track_user_created', true,
            'track_role_changed', true,
            'track_password_reset', true
        ), 'Which audit events to track'),
        ('email_notifications', jsonb_build_object(
            'enabled', true,
            'notify_on_login_failed', true,
            'notify_on_role_changed', true,
            'notify_on_user_created', true,
            'notify_on_password_reset', false,
            'admin_emails', ARRAY[]::TEXT[]
        ), 'Email notification preferences for critical events'),
        ('retention_policy', jsonb_build_object(
            'retention_days', 90,
            'auto_purge_enabled', false,
            'purge_frequency', 'monthly',
            'archive_before_purge', true
        ), 'Audit log retention and purge settings')
    ON CONFLICT (config_key) DO NOTHING;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Audit config seed skipped: %', SQLERRM;
END $$;
