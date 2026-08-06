-- FEATURE 06: Create platform_settings table and seed defaults
-- Run this in InsForge SQL Editor

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Admins/Super admins can manage platform_settings
DROP POLICY IF EXISTS "Admins can manage platform_settings" ON public.platform_settings;
CREATE POLICY "Admins can manage platform_settings" 
ON public.platform_settings FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Allow project_admin to bypass RLS (elevated access)
DROP POLICY IF EXISTS "admin_bypass_platform_settings" ON public.platform_settings;
CREATE POLICY "admin_bypass_platform_settings" 
ON public.platform_settings TO project_admin 
USING (true) WITH CHECK (true);

-- Anyone can read platform settings (so that public pages / registration can check maintenance / feature flags)
DROP POLICY IF EXISTS "Anyone can read platform_settings" ON public.platform_settings;
CREATE POLICY "Anyone can read platform_settings" 
ON public.platform_settings FOR SELECT 
USING (true);

-- Seed defaults
INSERT INTO public.platform_settings (key, value)
VALUES 
  ('general', '{"platformName": "TalentMesh", "supportEmail": "support@talentmesh.ai", "tagline": "The Future of Professional Integration"}'::jsonb),
  ('feature_flags', '{"candidateRegistration": true, "recruiterRegistration": true, "blogEnabled": true, "messagingEnabled": true, "aiMatching": true}'::jsonb),
  ('maintenance', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
