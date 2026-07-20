-- WebAuthn / Face ID credentials table
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  credential_id    TEXT NOT NULL UNIQUE,
  public_key       TEXT NOT NULL,
  counter          BIGINT NOT NULL DEFAULT 0,
  device_type      TEXT NOT NULL DEFAULT 'platform',
  created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_used_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_employee_id
  ON public.webauthn_credentials(employee_id);

CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id
  ON public.webauthn_credentials(credential_id);

-- Extend attendance: add check_out_time and face_id flag
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS check_out_time TIME,
  ADD COLUMN IF NOT EXISTS verified_by_face_id BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- RLS: allow authenticated users full access (admin-managed system)
DROP POLICY IF EXISTS "authenticated_all_webauthn_credentials" ON public.webauthn_credentials;
CREATE POLICY "authenticated_all_webauthn_credentials"
  ON public.webauthn_credentials
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS: allow authenticated users to update attendance (for check-out)
DROP POLICY IF EXISTS "authenticated_update_attendance" ON public.attendance;
CREATE POLICY "authenticated_update_attendance"
  ON public.attendance
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_insert_attendance" ON public.attendance;
CREATE POLICY "authenticated_insert_attendance"
  ON public.attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_select_attendance" ON public.attendance;
CREATE POLICY "authenticated_select_attendance"
  ON public.attendance
  FOR SELECT
  TO authenticated
  USING (true);
