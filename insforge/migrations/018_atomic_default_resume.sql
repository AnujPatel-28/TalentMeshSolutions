-- Migration 018: Create RPC function for atomic default resume assignment using auth.uid()
DROP FUNCTION IF EXISTS public.set_default_resume(UUID);

CREATE OR REPLACE FUNCTION public.set_default_resume(
  p_resume_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_file_url TEXT;
BEGIN
  -- 1. Validate that the resume exists and belongs to the authenticated candidate
  SELECT file_url INTO v_file_url
  FROM public.candidate_resumes
  WHERE id = p_resume_id AND candidate_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resume not found or does not belong to candidate.';
  END IF;

  -- 2. Mark all candidate resumes as non-default
  UPDATE public.candidate_resumes
  SET is_default = false
  WHERE candidate_id = auth.uid();

  -- 3. Set target resume as default
  UPDATE public.candidate_resumes
  SET is_default = true
  WHERE id = p_resume_id;

  -- 4. Update candidate profiles table to point to the default resume's url
  UPDATE public.candidate_profiles
  SET resume_url = v_file_url
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_default_resume(UUID) TO authenticated;
