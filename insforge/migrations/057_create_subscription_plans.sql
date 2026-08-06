-- 057_create_subscription_plans.sql
-- Migration to introduce subscription_plans table and secure subscriptions/plans against direct browser access.

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  price_monthly_inr INT, -- stored in paise, nullable for Custom/Enterprise
  price_annual_inr INT,  -- stored in paise, nullable for Custom/Enterprise
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  recruiter_seats INT,   -- nullable for unlimited
  active_jobs INT,       -- nullable for unlimited
  ai_calls_per_month INT, -- nullable for unlimited
  features TEXT[] NOT NULL DEFAULT '{}',
  cta_label TEXT NOT NULL DEFAULT 'Get Started',
  cta_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed initial plans
INSERT INTO public.subscription_plans (key, name, tagline, price_monthly_inr, price_annual_inr, is_popular, is_active, display_order, recruiter_seats, active_jobs, ai_calls_per_month, features, cta_label, cta_url)
VALUES
  ('free', 'Starter', 'Free forever for single recruiters.', 0, 0, false, true, 0, 1, 1, 0, ARRAY['1 active job post', 'Basic candidate search', 'Email support'], 'Get Started', '/dashboard'),
  ('starter', 'Starter Paid', 'Perfect for small teams.', 249900, 2499000, false, true, 1, 2, 5, 50, ARRAY['Up to 5 active jobs', '2 recruiter seats', '50 AI candidate matching calls/mo', 'Priority email support'], 'Upgrade', '/pricing/starter'),
  ('growth', 'Growth', 'Our most popular plan for scaling startups.', 799900, 7999000, true, true, 2, 5, 20, 500, ARRAY['Up to 20 active jobs', '5 recruiter seats', '500 AI candidate matching calls/mo', 'Phone & chat support', 'Talent pool access'], 'Upgrade', '/pricing/growth'),
  ('enterprise', 'Enterprise', 'Custom controls for large companies.', NULL, NULL, false, true, 3, 999999, 999999, 999999, ARRAY['Unlimited jobs', 'Custom recruiter seats', 'Unlimited AI candidate matching', 'Dedicated account manager', 'SLA support'], 'Contact Us', '/pricing/enterprise')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  price_monthly_inr = COALESCE(subscription_plans.price_monthly_inr, EXCLUDED.price_monthly_inr),
  price_annual_inr = COALESCE(subscription_plans.price_annual_inr, EXCLUDED.price_annual_inr),
  recruiter_seats = COALESCE(subscription_plans.recruiter_seats, EXCLUDED.recruiter_seats),
  active_jobs = COALESCE(subscription_plans.active_jobs, EXCLUDED.active_jobs),
  ai_calls_per_month = COALESCE(subscription_plans.ai_calls_per_month, EXCLUDED.ai_calls_per_month);

-- Enable RLS on subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow public read access to plans (for pricing page)
DROP POLICY IF EXISTS plan_read ON public.subscription_plans;
CREATE POLICY plan_read ON public.subscription_plans FOR SELECT TO public USING (true);

-- Allow project_admin (service-role client) full control
DROP POLICY IF EXISTS admin_bypass ON public.subscription_plans;
CREATE POLICY admin_bypass ON public.subscription_plans TO project_admin USING (true) WITH CHECK (true);

-- Drop direct browser writes/reads on subscriptions by removing the Admins can manage subscriptions policy
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;
