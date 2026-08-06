-- 1. Create recruiter lookup table
CREATE TABLE IF NOT EXISTS public.recruiter_users (
  user_id UUID PRIMARY KEY
);

-- 2. Disable RLS on recruiter_users lookup table
ALTER TABLE public.recruiter_users DISABLE ROW LEVEL SECURITY;

-- 3. Seed existing recruiter IDs from profiles
INSERT INTO public.recruiter_users (user_id)
SELECT id FROM public.profiles 
WHERE role = 'recruiter' AND is_active = true
ON CONFLICT (user_id) DO NOTHING;

-- 4. Create sync function and trigger on profiles
CREATE OR REPLACE FUNCTION public.sync_recruiter_users()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.recruiter_users WHERE user_id = OLD.id;
    RETURN OLD;
  ELSIF (NEW.role = 'recruiter' AND NEW.is_active = true) THEN
    INSERT INTO public.recruiter_users (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    DELETE FROM public.recruiter_users WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_recruiter_users ON public.profiles;
CREATE TRIGGER trg_sync_recruiter_users
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_recruiter_users();

-- 5. Safe recruiter check helper function
CREATE OR REPLACE FUNCTION public.is_recruiter()
RETURNS BOOLEAN AS $$
DECLARE
  is_rec BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.recruiter_users WHERE user_id = auth.uid()
  ) INTO is_rec;
  RETURN is_rec;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution to authenticated role
GRANT EXECUTE ON FUNCTION public.is_recruiter() TO authenticated;

-- 6. Recreate applications SELECT policy (use is_admin instead of direct subquery)
DROP POLICY IF EXISTS "Admins can view all applications" ON public.applications;
CREATE POLICY "Admins can view all applications" ON public.applications 
FOR SELECT TO authenticated USING (public.is_admin());

-- 7. Recreate jobs SELECT policy (use is_admin instead of direct subquery)
DROP POLICY IF EXISTS "Admins can view all jobs" ON public.jobs;
CREATE POLICY "Admins can view all jobs" ON public.jobs 
FOR SELECT TO authenticated USING (public.is_admin());

-- 8. Recreate jobs admins_all policy (use is_admin instead of direct subquery)
DROP POLICY IF EXISTS "admins_all" ON public.jobs;
CREATE POLICY "admins_all" ON public.jobs 
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 9. Recreate jobs Recruiters can insert jobs policy (use is_recruiter instead of direct subquery)
DROP POLICY IF EXISTS "Recruiters can insert jobs" ON public.jobs;
CREATE POLICY "Recruiters can insert jobs" ON public.jobs 
FOR INSERT TO public WITH CHECK ((auth.uid() = recruiter_id) AND public.is_recruiter());

-- 10. Re-enable RLS on profiles table (failsafe)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
