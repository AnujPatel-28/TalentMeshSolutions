-- Migration 026: Profile Strength Calculation Trigger and Backfill

-- 1. Helper function to calculate profile strength
CREATE OR REPLACE FUNCTION public.calculate_profile_strength_score(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    prof RECORD;
    cand RECORD;
BEGIN
    -- Get profiles row
    SELECT avatar_url, bio, location INTO prof FROM public.profiles WHERE id = user_uuid;
    -- Get candidate_profiles row
    SELECT resume_url, skills, work_history, education, linkedin_url INTO cand FROM public.candidate_profiles WHERE id = user_uuid;

    -- 1. avatar_url (10 points)
    IF prof.avatar_url IS NOT NULL AND prof.avatar_url <> '' THEN
        score := score + 10;
    END IF;

    -- 2. resume_url (20 points)
    IF cand.resume_url IS NOT NULL AND cand.resume_url <> '' THEN
        score := score + 20;
    END IF;

    -- 3. bio (15 points, >= 30 chars)
    IF prof.bio IS NOT NULL AND length(trim(prof.bio)) >= 30 THEN
        score := score + 15;
    END IF;

    -- 4. skills (15 points, >= 5 skills)
    IF cand.skills IS NOT NULL THEN
        IF array_length(cand.skills, 1) >= 5 THEN
            score := score + 15;
        END IF;
    END IF;

    -- 5. work_history (15 points, >= 1 entries)
    IF cand.work_history IS NOT NULL AND jsonb_typeof(cand.work_history) = 'array' THEN
        IF jsonb_array_length(cand.work_history) >= 1 THEN
            score := score + 15;
        END IF;
    END IF;

    -- 6. education (10 points, >= 1 entries or non-empty string)
    IF cand.education IS NOT NULL THEN
        IF jsonb_typeof(cand.education) = 'array' THEN
            IF jsonb_array_length(cand.education) >= 1 THEN
                score := score + 10;
            END IF;
        ELSIF jsonb_typeof(cand.education) = 'string' AND length(trim(cand.education::text)) > 2 THEN
            IF length(trim(cand.education#>>'{}')) > 0 THEN
                score := score + 10;
            END IF;
        END IF;
    END IF;

    -- 7. linkedin_url (10 points)
    IF cand.linkedin_url IS NOT NULL AND cand.linkedin_url <> '' THEN
        score := score + 10;
    END IF;

    -- 8. location (5 points)
    IF prof.location IS NOT NULL AND prof.location <> '' THEN
        score := score + 5;
    END IF;

    RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger function to update profile_strength
CREATE OR REPLACE FUNCTION public.sync_profile_strength()
RETURNS TRIGGER AS $$
DECLARE
    target_id UUID;
    new_score INTEGER;
BEGIN
    IF TG_TABLE_NAME = 'profiles' THEN
        target_id := NEW.id;
    ELSE
        target_id := NEW.id;
    END IF;

    -- Only proceed if the user is a candidate or exists in candidate_profiles
    IF EXISTS (SELECT 1 FROM public.candidate_profiles WHERE id = target_id) THEN
        new_score := public.calculate_profile_strength_score(target_id);
        UPDATE public.candidate_profiles
        SET profile_strength = new_score,
            updated_at = now()
        WHERE id = target_id AND (profile_strength IS NULL OR profile_strength <> new_score);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create triggers on profiles
DROP TRIGGER IF EXISTS trigger_sync_profile_strength ON public.profiles;
CREATE TRIGGER trigger_sync_profile_strength
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_strength();

-- 4. Create triggers on candidate_profiles
DROP TRIGGER IF EXISTS trigger_sync_profile_strength ON public.candidate_profiles;
CREATE TRIGGER trigger_sync_profile_strength
AFTER INSERT OR UPDATE ON public.candidate_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_strength();

-- 5. Backfill all existing candidates
DO $$
DECLARE
    r RECORD;
    score INTEGER;
BEGIN
    FOR r IN SELECT id FROM public.candidate_profiles LOOP
        score := public.calculate_profile_strength_score(r.id);
        UPDATE public.candidate_profiles
        SET profile_strength = score
        WHERE id = r.id;
    END LOOP;
END;
$$;
