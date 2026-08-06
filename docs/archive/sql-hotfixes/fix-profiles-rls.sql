-- ============================================================
-- Fix: Infinite Recursion in Profiles RLS Policies
-- Run the ENTIRE script at once in the InsForge SQL Editor
-- ============================================================

-- Step 1: Drop all existing policies on the profiles table
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
        RAISE NOTICE 'Dropped policy: % on %', pol.policyname, pol.tablename;
    END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create a helper function to check if the current user is an admin
-- SECURITY DEFINER runs the function with the privileges of the creator (bypassing RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_adm BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE (id = auth.uid() OR user_id = auth.uid())
    AND role IN ('admin', 'super_admin')
  ) INTO is_adm;
  
  RETURN is_adm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 4: Recreate Policies

-- 1. Users can read their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (id = auth.uid() OR user_id = auth.uid());

-- 2. Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (id = auth.uid() OR user_id = auth.uid());

-- 3. Users can insert their own profile
CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (id = auth.uid() OR user_id = auth.uid());

-- 4. Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (public.is_admin());

-- 5. Admins can update all profiles
CREATE POLICY "Admins can update all profiles" 
ON public.profiles FOR UPDATE 
USING (public.is_admin());

-- 6. Admins can insert/delete
CREATE POLICY "Admins can insert all profiles" 
ON public.profiles FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete all profiles" 
ON public.profiles FOR DELETE 
USING (public.is_admin());

-- 7. Add project_admin bypass (standard InsForge policy)
CREATE POLICY "admin_bypass" ON public.profiles TO project_admin USING (true) WITH CHECK (true);
