-- ============================================================================
-- 049: Security Metrics RPC
-- Provides aggregated security stats for the Security Dashboard page.
-- Uses SECURITY DEFINER so it can read pg_catalog / information_schema.
-- Access is controlled by the frontend (isGod || canManageOrg).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_security_metrics()
RETURNS TABLE(metric text, value text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_count       bigint := 0;
  v_login_count      bigint := 0;
  v_failed_count     bigint := 0;
  v_table_count      bigint := 0;
  v_policy_count     bigint := 0;
  v_rls_count        bigint := 0;
  v_audit_count      bigint := 0;
BEGIN
  -- Total registered users
  SELECT count(*) INTO v_user_count FROM public.profiles;

  -- Login attempts in last 24h (resilient if table not yet deployed)
  BEGIN
    SELECT count(*)
    INTO v_login_count
    FROM public.login_attempts
    WHERE created_at > now() - interval '24 hours';

    SELECT count(*)
    INTO v_failed_count
    FROM public.login_attempts
    WHERE success = false
      AND created_at > now() - interval '24 hours';
  EXCEPTION WHEN undefined_table THEN
    -- login_attempts not deployed yet; leave counts at 0
  END;

  -- Public tables
  SELECT count(*)
  INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

  -- RLS policies defined on the public schema
  SELECT count(*)
  INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  -- Tables in public schema that have RLS enabled
  SELECT count(*)
  INTO v_rls_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = true;

  -- Audit events in last 7 days (resilient if table not yet deployed)
  BEGIN
    SELECT count(*)
    INTO v_audit_count
    FROM public.god_audit_log
    WHERE created_at > now() - interval '7 days';
  EXCEPTION WHEN undefined_table THEN
    -- god_audit_log not deployed yet; leave count at 0
  END;

  RETURN QUERY VALUES
    ('Total Users',         v_user_count::text),
    ('Logins (24h)',        v_login_count::text),
    ('Failed Logins (24h)', v_failed_count::text),
    ('Public Tables',       v_table_count::text),
    ('RLS Policies',        v_policy_count::text),
    ('Tables with RLS',     v_rls_count::text),
    ('Audit Events (7d)',   v_audit_count::text);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_security_metrics() TO authenticated;

COMMENT ON FUNCTION public.get_security_metrics() IS
'Returns aggregated security metrics for the Security Dashboard. Requires authenticated access; access-control is enforced by the frontend.';
