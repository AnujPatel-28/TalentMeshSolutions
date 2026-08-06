DO $$
DECLARE
  policy_row record;
  using_expr text;
  check_expr text;
  alter_sql text;
BEGIN
  FOR policy_row IN
    SELECT
      p.polname,
      n.nspname,
      c.relname,
      pg_get_expr(p.polqual, p.polrelid) AS using_expr,
      pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (
        coalesce(pg_get_expr(p.polqual, p.polrelid), '') ~* 'auth[.]uid[(][)]'
        OR coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') ~* 'auth[.]uid[(][)]'
      )
  LOOP
    using_expr := CASE
      WHEN policy_row.using_expr IS NULL THEN NULL
      ELSE regexp_replace(policy_row.using_expr, 'auth[.]uid[(][)]', '(select auth.uid())', 'gi')
    END;

    check_expr := CASE
      WHEN policy_row.check_expr IS NULL THEN NULL
      ELSE regexp_replace(policy_row.check_expr, 'auth[.]uid[(][)]', '(select auth.uid())', 'gi')
    END;

    alter_sql := format(
      'ALTER POLICY %I ON %I.%I',
      policy_row.polname,
      policy_row.nspname,
      policy_row.relname
    );

    IF using_expr IS NOT NULL THEN
      alter_sql := alter_sql || format(' USING (%s)', using_expr);
    END IF;

    IF check_expr IS NOT NULL THEN
      alter_sql := alter_sql || format(' WITH CHECK (%s)', check_expr);
    END IF;

    EXECUTE alter_sql;
  END LOOP;
END $$;

DO $$
DECLARE
  i record;
BEGIN
  FOR i IN
    SELECT *
    FROM (VALUES
      ('announcement_dismissals', 'user_id', 'idx_announcement_dismissals_user_id'),
      ('application_status_history', 'candidate_id', 'idx_application_status_history_candidate_id'),
      ('application_status_history', 'recruiter_id', 'idx_application_status_history_recruiter_id'),
      ('applications', 'recruiter_id', 'idx_applications_recruiter_id'),
      ('auth_events', 'user_id', 'idx_auth_events_user_id'),
      ('candidate_profiles', 'recruiter_id', 'idx_candidate_profiles_recruiter_id'),
      ('candidate_resumes', 'recruiter_id', 'idx_candidate_resumes_recruiter_id'),
      ('export_candidates', 'user_id', 'idx_export_candidates_user_id'),
      ('notification_events', 'user_id', 'idx_notification_events_user_id'),
      ('notification_preferences', 'id', 'idx_notification_preferences_id'),
      ('notification_templates', 'user_id', 'idx_notification_templates_user_id'),
      ('profiles', 'recruiter_id', 'idx_profiles_recruiter_id')
    ) AS indexes(table_name, column_name, index_name)
  LOOP
    IF to_regclass(format('public.%I', i.table_name)) IS NOT NULL
      AND to_regclass(format('public.%I', i.index_name)) IS NULL
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = i.table_name
          AND column_name = i.column_name
      )
    THEN
      EXECUTE format('CREATE INDEX %I ON public.%I (%I)', i.index_name, i.table_name, i.column_name);
    END IF;
  END LOOP;
END $$;
