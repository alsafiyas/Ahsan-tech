-- Extend service_tickets table with additional columns for full ticket management
ALTER TABLE public.service_tickets
ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS technician TEXT DEFAULT 'Unassigned',
ADD COLUMN IF NOT EXISTS diagnosis TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS cost BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS estimated_date DATE,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_service_tickets_status ON public.service_tickets(ticket_status);
CREATE INDEX IF NOT EXISTS idx_service_tickets_technician ON public.service_tickets(technician);
CREATE INDEX IF NOT EXISTS idx_service_tickets_created_at ON public.service_tickets(created_at DESC);

-- Enable realtime for service_tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_tickets;

-- RLS: ensure policies exist for authenticated users
DROP POLICY IF EXISTS "authenticated_read_service_tickets" ON public.service_tickets;
CREATE POLICY "authenticated_read_service_tickets"
ON public.service_tickets
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_service_tickets" ON public.service_tickets;
CREATE POLICY "authenticated_insert_service_tickets"
ON public.service_tickets
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_service_tickets" ON public.service_tickets;
CREATE POLICY "authenticated_update_service_tickets"
ON public.service_tickets
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_service_tickets" ON public.service_tickets;
CREATE POLICY "authenticated_delete_service_tickets"
ON public.service_tickets
FOR DELETE
TO authenticated
USING (true);

-- Update existing rows with sample technician data
DO $$
BEGIN
  UPDATE public.service_tickets
  SET
    technician = CASE (random() * 2)::int
      WHEN 0 THEN 'Bobur Yusupov'
      WHEN 1 THEN 'Sardor Toshmatov'
      ELSE 'Jasur Mirzayev'
    END,
    phone = '+998 9' || (floor(random() * 9) + 0)::text || ' ' ||
            lpad((floor(random() * 9000000) + 1000000)::text, 7, '0'),
    priority = CASE (random() * 2)::int
      WHEN 0 THEN 'low'
      WHEN 1 THEN 'normal'
      ELSE 'high'
    END,
    cost = CASE ticket_status
      WHEN 'completed' THEN (floor(random() * 900000) + 100000)::bigint
      WHEN 'ready' THEN (floor(random() * 900000) + 100000)::bigint
      ELSE 0
    END,
    estimated_date = CURRENT_DATE + (floor(random() * 7) + 1)::int
  WHERE technician = 'Unassigned' OR technician IS NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Update existing rows failed: %', SQLERRM;
END $$;
