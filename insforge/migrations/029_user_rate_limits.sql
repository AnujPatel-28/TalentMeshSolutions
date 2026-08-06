-- Migration 029: User Rate Limits Table
-- Creates a rate-limiting table for multi-instance, database-backed sliding window rate limiting.

CREATE TABLE IF NOT EXISTS public.user_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow project admin/service role to bypass RLS (since resume-proxy uses service key client)
DROP POLICY IF EXISTS admin_bypass ON public.user_rate_limits;
CREATE POLICY admin_bypass ON public.user_rate_limits TO project_admin USING (true) WITH CHECK (true);
