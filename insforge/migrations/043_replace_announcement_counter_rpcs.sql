-- Migration 043: Replace SECURITY DEFINER announcement counter RPCs with event tables/triggers
-- Advisor fixes:
-- - security/dangerous-function for public.increment_announcement_view(uuid)
-- - security/dangerous-function for public.increment_announcement_dismiss(uuid)
--
-- The old public RPCs let authenticated users directly invoke privileged counter updates.
-- New design:
-- - Users insert their own announcement view/dismissal rows under RLS.
-- - Locked-down trigger functions maintain aggregate counters.
-- - Old RPC functions are revoked and dropped.

CREATE TABLE IF NOT EXISTS public.announcement_views (
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);

ALTER TABLE public.announcement_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_views FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own announcement views" ON public.announcement_views;
CREATE POLICY "Users can read own announcement views"
  ON public.announcement_views
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own announcement views" ON public.announcement_views;
CREATE POLICY "Users can insert own announcement views"
  ON public.announcement_views
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS admin_bypass_announcement_views ON public.announcement_views;
CREATE POLICY admin_bypass_announcement_views
  ON public.announcement_views
  TO project_admin
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_announcement_views_user_id
  ON public.announcement_views(user_id);

CREATE OR REPLACE FUNCTION public.sync_announcement_view_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.announcements
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = NEW.announcement_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_announcement_view_count ON public.announcement_views;
CREATE TRIGGER trg_sync_announcement_view_count
AFTER INSERT ON public.announcement_views
FOR EACH ROW
EXECUTE FUNCTION public.sync_announcement_view_count();

CREATE OR REPLACE FUNCTION public.sync_announcement_dismiss_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.announcements
  SET dismiss_count = COALESCE(dismiss_count, 0) + 1
  WHERE id = NEW.announcement_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_announcement_dismiss_count ON public.announcement_dismissals;
CREATE TRIGGER trg_sync_announcement_dismiss_count
AFTER INSERT ON public.announcement_dismissals
FOR EACH ROW
EXECUTE FUNCTION public.sync_announcement_dismiss_count();

REVOKE ALL ON FUNCTION public.sync_announcement_view_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_announcement_view_count() FROM anon;
REVOKE ALL ON FUNCTION public.sync_announcement_view_count() FROM authenticated;

REVOKE ALL ON FUNCTION public.sync_announcement_dismiss_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_announcement_dismiss_count() FROM anon;
REVOKE ALL ON FUNCTION public.sync_announcement_dismiss_count() FROM authenticated;

DO $$
BEGIN
  IF to_regprocedure('public.increment_announcement_view(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.increment_announcement_view(uuid) FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.increment_announcement_view(uuid) FROM anon;
    REVOKE ALL ON FUNCTION public.increment_announcement_view(uuid) FROM authenticated;
    DROP FUNCTION public.increment_announcement_view(uuid);
  END IF;

  IF to_regprocedure('public.increment_announcement_dismiss(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.increment_announcement_dismiss(uuid) FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.increment_announcement_dismiss(uuid) FROM anon;
    REVOKE ALL ON FUNCTION public.increment_announcement_dismiss(uuid) FROM authenticated;
    DROP FUNCTION public.increment_announcement_dismiss(uuid);
  END IF;
END $$;
