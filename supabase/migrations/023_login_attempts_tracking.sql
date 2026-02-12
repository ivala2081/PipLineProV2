-- ============================================================================
-- 023: Login Attempts Tracking
-- ============================================================================
-- Description: Track login attempts for security monitoring and rate limiting
-- - Records all login attempts (successful and failed)
-- - Stores device_id and IP address for tracking
-- - Enables security monitoring and anomaly detection
-- ============================================================================

-- Create login_attempts table
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id TEXT NOT NULL,
  ip_address TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id
ON public.login_attempts(user_id);

-- Create index for faster lookups by device_id
CREATE INDEX IF NOT EXISTS idx_login_attempts_device_id
ON public.login_attempts(device_id);

-- Create index for faster lookups by created_at (for time-based queries)
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at
ON public.login_attempts(created_at DESC);

-- Create compound index for user + time (common query pattern)
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_created
ON public.login_attempts(user_id, created_at DESC)
WHERE user_id IS NOT NULL;

-- Create compound index for device + time (for rate limiting by device)
CREATE INDEX IF NOT EXISTS idx_login_attempts_device_created
ON public.login_attempts(device_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own login attempts
CREATE POLICY "Users can read their own login attempts"
ON public.login_attempts
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: God admins can read all login attempts (security monitoring)
CREATE POLICY "God admins can read all login attempts"
ON public.login_attempts
FOR SELECT
USING (private.is_god());

-- No INSERT/UPDATE/DELETE policies - login attempts are inserted by backend functions only

-- Function to log a login attempt
CREATE OR REPLACE FUNCTION public.log_login_attempt(
  p_user_id UUID,
  p_device_id TEXT,
  p_ip_address TEXT,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_id UUID;
BEGIN
  INSERT INTO public.login_attempts (
    user_id,
    device_id,
    ip_address,
    success,
    error_message
  )
  VALUES (
    p_user_id,
    p_device_id,
    p_ip_address,
    p_success,
    p_error_message
  )
  RETURNING id INTO v_attempt_id;

  RETURN v_attempt_id;
END;
$$;

-- Function to get failed login count in time window
CREATE OR REPLACE FUNCTION public.get_failed_login_count(
  p_device_id TEXT,
  p_minutes INTEGER DEFAULT 15
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM public.login_attempts
  WHERE device_id = p_device_id
    AND success = FALSE
    AND created_at > NOW() - INTERVAL '1 minute' * p_minutes;

  RETURN v_count;
END;
$$;

-- Function to check if device should be rate limited
CREATE OR REPLACE FUNCTION public.should_rate_limit_device(
  p_device_id TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  v_count := public.get_failed_login_count(p_device_id, p_minutes);
  RETURN v_count >= p_max_attempts;
END;
$$;

-- Function to clean up old login attempts (retention policy: 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.login_attempts
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.log_login_attempt(UUID, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_login_attempt(UUID, TEXT, TEXT, BOOLEAN, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_failed_login_count(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_failed_login_count(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.should_rate_limit_device(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.should_rate_limit_device(TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.cleanup_old_login_attempts() TO authenticated;

-- Comments
COMMENT ON TABLE public.login_attempts IS
'Tracks all login attempts (successful and failed) for security monitoring and rate limiting.';

COMMENT ON FUNCTION public.log_login_attempt(UUID, TEXT, TEXT, BOOLEAN, TEXT) IS
'Logs a login attempt with user_id, device_id, IP address, and result.';

COMMENT ON FUNCTION public.get_failed_login_count(TEXT, INTEGER) IS
'Returns the count of failed login attempts for a device in the specified time window.';

COMMENT ON FUNCTION public.should_rate_limit_device(TEXT, INTEGER, INTEGER) IS
'Checks if a device should be rate limited based on failed login attempts.';

COMMENT ON FUNCTION public.cleanup_old_login_attempts() IS
'Deletes login attempts older than 90 days. Call periodically via cron job.';

-- ============================================================================
-- Rollback Script
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.cleanup_old_login_attempts();
-- DROP FUNCTION IF EXISTS public.should_rate_limit_device(TEXT, INTEGER, INTEGER);
-- DROP FUNCTION IF EXISTS public.get_failed_login_count(TEXT, INTEGER);
-- DROP FUNCTION IF EXISTS public.log_login_attempt(UUID, TEXT, TEXT, BOOLEAN, TEXT);
-- DROP TABLE IF EXISTS public.login_attempts;
