DO $$
DECLARE
  policy_row record;
  using_expr text;
  check_expr text;
  alter_sql text;
  nested_wrapper_pattern text := '[(][[:space:]]*SELECT[[:space:]]*[(][[:space:]]*SELECT[[:space:]]*auth[.]uid[(][)][[:space:]]+AS[[:space:]]+uid[[:space:]]*[)][[:space:]]+AS[[:space:]]+uid[[:space:]]*[)]';
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
        coalesce(pg_get_expr(p.polqual, p.polrelid), '') ~* nested_wrapper_pattern
        OR coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') ~* nested_wrapper_pattern
      )
  LOOP
    using_expr := CASE
      WHEN policy_row.using_expr IS NULL THEN NULL
      ELSE regexp_replace(policy_row.using_expr, nested_wrapper_pattern, '( SELECT auth.uid() AS uid)', 'gi')
    END;

    check_expr := CASE
      WHEN policy_row.check_expr IS NULL THEN NULL
      ELSE regexp_replace(policy_row.check_expr, nested_wrapper_pattern, '( SELECT auth.uid() AS uid)', 'gi')
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
