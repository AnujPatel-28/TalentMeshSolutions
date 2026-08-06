-- FIX PROFILES RLS POLICY
-- This script fixes the RLS policy on the profiles table.
-- We are ensuring it only uses user_id as per the latest schema requirements.

-- 1. Drop existing policies
DROP POLICY IF EXISTS profiles_self ON profiles;
DROP POLICY IF EXISTS "profiles_self" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- 2. Create the correct policies using 'id'
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- Optional: Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
