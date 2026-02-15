-- ============================================================================
-- 044: Security Metrics Function
-- Provides aggregated security metrics for the dashboard
-- Each metric is queried independently so missing tables don't break everything
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_security_metrics()
RETURNS TABLE (
  metric text,
  value text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count bigint;
BEGIN
  -- Only god users can access this
  IF NOT private.is_god() THEN
    RAISE EXCEPTION 'Access denied: God role required';
  END IF;

  -- Total Users
  BEGIN
    SELECT COUNT(*) INTO _count FROM profiles WHERE system_role != 'god';
    metric := 'Total Users'; value := _count::text; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- God Users
  BEGIN
    SELECT COUNT(*) INTO _count FROM profiles WHERE system_role = 'god';
    metric := 'God Users'; value := _count::text; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Failed Logins (24h)
  BEGIN
    SELECT COUNT(*) INTO _count FROM login_attempts
    WHERE success = false AND created_at > now() - interval '24 hours';
    metric := 'Failed Logins (24h)'; value := _count::text; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Successful Logins (24h)
  BEGIN
    SELECT COUNT(*) INTO _count FROM login_attempts
    WHERE success = true AND created_at > now() - interval '24 hours';
    metric := 'Successful Logins (24h)'; value := _count::text; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- God Actions (24h)
  BEGIN
    SELECT COUNT(*) INTO _count FROM god_audit_log
    WHERE created_at > now() - interval '24 hours';
    metric := 'God Actions (24h)'; value := _count::text; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Active Sessions (try both column names for compatibility)
  BEGIN
    SELECT COUNT(*) INTO _count FROM auth.sessions WHERE not_after > now();
    metric := 'Active Sessions'; value := _count::text; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      SELECT COUNT(*) INTO _count FROM auth.sessions WHERE expires_at > now();
      metric := 'Active Sessions'; value := _count::text; RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- Organizations
  BEGIN
    SELECT COUNT(*) INTO _count FROM organizations;
    metric := 'Organizations'; value := _count::text; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Transfers (24h)
  BEGIN
    SELECT COUNT(*) INTO _count FROM transfers
    WHERE created_at > now() - interval '24 hours';
    metric := 'Transfers (24h)'; value := _count::text; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_security_metrics TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_security_metrics IS 'Returns aggregated security metrics for the dashboard (god role only)';
