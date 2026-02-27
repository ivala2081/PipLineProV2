-- ============================================================================
-- Migration 077: Session Management RPCs
-- ============================================================================
-- Adds RPC for fetching login history for session management UI.
-- ============================================================================

-- Get user login history with pagination
CREATE OR REPLACE FUNCTION public.get_login_history(
  p_user_id UUID DEFAULT auth.uid(),
  p_limit   INTEGER DEFAULT 50,
  p_offset  INTEGER DEFAULT 0
)
RETURNS TABLE (
  id            UUID,
  device_id     TEXT,
  ip_address    TEXT,
  success       BOOLEAN,
  error_message TEXT,
  created_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only self or god can view login history
  IF p_user_id != auth.uid() AND NOT private.is_god() THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  RETURN QUERY
  SELECT
    la.id,
    la.device_id,
    la.ip_address,
    la.success,
    la.error_message,
    la.created_at
  FROM public.login_attempts la
  WHERE la.user_id = p_user_id
  ORDER BY la.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_login_history(UUID, INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.get_login_history(UUID, INTEGER, INTEGER) IS
'Returns paginated login history for a user. Self or god access only.';

-- ============================================================================
-- Rollback Script
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.get_login_history(UUID, INTEGER, INTEGER);
