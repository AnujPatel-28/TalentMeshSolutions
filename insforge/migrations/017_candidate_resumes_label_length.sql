-- Migration 017: Enforce max length of 255 characters on candidate_resumes label column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'candidate_resumes' 
      AND column_name = 'label' 
      AND character_maximum_length = 255
  ) THEN
    -- Safety step: Truncate any existing labels longer than 255 characters to prevent type alteration failures
    UPDATE public.candidate_resumes
    SET label = LEFT(label, 255)
    WHERE length(label) > 255;

    ALTER TABLE public.candidate_resumes ALTER COLUMN label TYPE VARCHAR(255);
  END IF;
END;
$$;
