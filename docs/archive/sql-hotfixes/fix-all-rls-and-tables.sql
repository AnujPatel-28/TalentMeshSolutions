-- ============================================================
-- CRITICAL FIX: Run this ENTIRE script in InsForge SQL Editor
-- Fixes: RLS infinite recursion + missing announcements table
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- PART 1: Fix is_admin() function (REMOVES user_id reference)
-- This is the ROOT CAUSE of all 500 errors on profiles table
-- ═══════════════════════════════════════════════════════════

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
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  ) INTO is_adm;
  
  RETURN is_adm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ═══════════════════════════════════════════════════════════
-- PART 2: Fix RLS policies (REMOVES user_id references)
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- PART 3: Create announcements table (currently missing)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'critical')),
  is_active BOOLEAN DEFAULT true,
  show_as_banner BOOLEAN DEFAULT false,
  target_roles TEXT[] DEFAULT ARRAY['all'],
  scheduled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  dismiss_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Anyone can read active announcements
CREATE POLICY "Anyone can read active announcements" 
ON public.announcements FOR SELECT 
USING (true);

-- Only admins can manage announcements
CREATE POLICY "Admins can manage announcements" 
ON public.announcements FOR ALL 
USING (public.is_admin());

-- Admin bypass
CREATE POLICY "admin_bypass_announcements" 
ON public.announcements TO project_admin 
USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- PART 4: Create announcement_dismissals table
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.announcement_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own dismissals" 
ON public.announcement_dismissals FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own dismissals" 
ON public.announcement_dismissals FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_bypass_dismissals" 
ON public.announcement_dismissals TO project_admin 
USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- PART 5: Helper RPCs for announcements
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.increment_announcement_view(ann_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.announcements SET view_count = view_count + 1 WHERE id = ann_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_announcement_dismiss(ann_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.announcements SET dismiss_count = dismiss_count + 1 WHERE id = ann_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════
-- PART 6: Verify admin profile (ID: 18d329f1-7301-4359-91b4-595f948f4342)
-- ═══════════════════════════════════════════════════════════

UPDATE public.profiles 
SET 
  role = 'super_admin',
  is_active = true,
  completed_onboarding = true,
  status = 'approved'
WHERE id = '18d329f1-7301-4359-91b4-595f948f4342';

-- ═══════════════════════════════════════════════════════════
-- PART 7: Create subscriptions table (for Billing page)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  recruiter_id UUID,
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'expired')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  amount_inr NUMERIC DEFAULT 0,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage subscriptions" 
ON public.subscriptions FOR ALL 
USING (public.is_admin());

CREATE POLICY "admin_bypass_subscriptions" 
ON public.subscriptions TO project_admin 
USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- PART 8: Add missing columns to audit_log if needed
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success';

-- ═══════════════════════════════════════════════════════════
-- DONE! After running this, reload the admin dashboard.
-- ═══════════════════════════════════════════════════════════

