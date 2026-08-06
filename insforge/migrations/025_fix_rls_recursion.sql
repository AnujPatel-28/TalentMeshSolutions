-- Migration 025: Fix Profiles RLS Recursion
-- Introduces public.admin_users lookup table and syncing trigger to avoid querying public.profiles inside is_admin().

-- 1. Create a dedicated table for admin IDs
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY
);

-- 2. Turn off RLS for this table so is_admin() can read it without any policy checks
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- 3. Populate existing active admin IDs from profiles table
INSERT INTO public.admin_users (user_id)
SELECT id FROM public.profiles 
WHERE role IN ('admin', 'super_admin') AND is_active = true
ON CONFLICT (user_id) DO NOTHING;

-- 4. Create trigger function to automatically sync admin_users when profiles change
CREATE OR REPLACE FUNCTION public.sync_admin_users()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.admin_users WHERE user_id = OLD.id;
    RETURN OLD;
  ELSIF (NEW.role IN ('admin', 'super_admin') AND NEW.is_active = true) THEN
    INSERT INTO public.admin_users (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    DELETE FROM public.admin_users WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Attach trigger to profiles
DROP TRIGGER IF EXISTS trg_sync_admin_users ON public.profiles;
CREATE TRIGGER trg_sync_admin_users
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_admin_users();

-- 6. Redefine is_admin() to query the safe admin_users table instead of profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_adm BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Querying admin_users never triggers RLS as RLS is disabled on it
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO is_adm;
  
  RETURN is_adm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
