-- ============================================================
-- BULLETPROOF RLS RECURSION FIX (Run in InsForge SQL Editor)
-- ============================================================

-- 1. Create a dedicated table for admins to avoid any self-referencing loops
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY
);

-- Turn OFF RLS for this table so is_admin() can read it without any policy checks
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- 2. Add your user ID as an admin
INSERT INTO public.admin_users (user_id) 
VALUES ('18d329f1-7301-4359-91b4-595f948f4342')
ON CONFLICT (user_id) DO NOTHING;

-- 3. Redefine is_admin() to query this NEW table instead of profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_adm BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- This will NEVER infinite loop because admin_users has no RLS policies!
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO is_adm;
  
  RETURN is_adm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Clean up ALL profile policies and recreate them properly
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- 5. Create the correct policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Admins can do everything (uses the new safe is_admin function)
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL USING (public.is_admin());

-- Admin bypass for service key
CREATE POLICY "admin_bypass_profiles" ON public.profiles TO project_admin USING (true) WITH CHECK (true);
