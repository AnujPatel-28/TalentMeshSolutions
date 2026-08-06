-- Add image_url column to announcements table
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS image_url TEXT;
