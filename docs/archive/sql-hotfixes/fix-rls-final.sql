-- ============================================================
-- FINAL RLS RECURSION FIX (Run in InsForge SQL Editor)
-- ============================================================

-- 1. Redefine is_admin() to COMPLETELY avoid querying the profiles table
-- This breaks the infinite recursion loop instantly.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  jwt_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check JWT metadata first (fastest, no DB query)
  jwt_role := auth.jwt() -> 'user_metadata' ->> 'role';
  IF jwt_role IN ('admin', 'super_admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Fallback: check app_metadata
  jwt_role := auth.jwt() -> 'app_metadata' ->> 'role';
  IF jwt_role IN ('admin', 'super_admin') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Clean up ALL profile policies and recreate them properly
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Admins can do everything
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL USING (public.is_admin());

-- Admin bypass for service key
CREATE POLICY "admin_bypass_profiles" ON public.profiles TO project_admin USING (true) WITH CHECK (true);

-- 3. Just in case announcements table didn't create properly
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_active BOOLEAN DEFAULT true,
  show_as_banner BOOLEAN DEFAULT false,
  target_roles TEXT[] DEFAULT ARRAY['all'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
