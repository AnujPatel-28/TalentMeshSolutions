-- Migration 066: Candidate onboarding field expansion
-- Adds structured location to profiles, and recruiter-relevant filters +
-- current compensation to candidate_profiles. All additive; existing
-- `profiles.location` TEXT column is kept as a server-computed display
-- string so candidates/index.ts's substring filter and the admin UI keep
-- working unchanged.

-- profiles: structured location
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'IN', -- ISO 3166-1 alpha-2, matches company_profiles convention (046_company_first_companies.sql) — source of truth
  ADD COLUMN IF NOT EXISTS country_name TEXT DEFAULT 'India', -- denormalized display value, server-derived from country_code — never trust a client-sent value
  ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- candidate_profiles: employment context + recruiter filters + current compensation
ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS employment_status TEXT
    CHECK (employment_status IN ('student_fresher','employed','unemployed','freelancer','career_break')),
  ADD COLUMN IF NOT EXISTS notice_period TEXT
    CHECK (notice_period IN ('immediate','15_days','30_days','60_days','90_days','other')),
  ADD COLUMN IF NOT EXISTS willing_to_relocate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS work_authorization TEXT
    CHECK (work_authorization IN ('citizen','permanent_resident','work_visa','requires_sponsorship','other')),
  ADD COLUMN IF NOT EXISTS current_ctc NUMERIC;
