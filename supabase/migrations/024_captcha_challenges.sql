-- ============================================================================
-- 024: CAPTCHA Challenges
-- ============================================================================
-- Description: Track CAPTCHA challenges for security and rate limit bypass
-- - Records CAPTCHA challenge attempts
-- - Allows trusted users to bypass CAPTCHA after successful verification
-- - Tracks device behavior for security monitoring
-- ============================================================================

-- Create captcha_challenges table
CREATE TABLE IF NOT EXISTS public.captcha_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  solved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_captcha_challenges_user_id
ON public.captcha_challenges(user_id)
WHERE user_id IS NOT NULL;

-- Create index for faster lookups by device_id
CREATE INDEX IF NOT EXISTS idx_captcha_challenges_device_id
ON public.captcha_challenges(device_id);

-- Create index for faster lookups by created_at
CREATE INDEX IF NOT EXISTS idx_captcha_challenges_created_at
ON public.captcha_challenges(created_at DESC);

-- Create compound index for device + solved (for skip logic)
CREATE INDEX IF NOT EXISTS idx_captcha_challenges_device_solved
ON public.captcha_challenges(device_id, solved, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.captcha_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own CAPTCHA challenges
CREATE POLICY "Users can read their own captcha challenges"
ON public.captcha_challenges
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: God admins can read all CAPTCHA challenges (security monitoring)
CREATE POLICY "God admins can read all captcha challenges"
ON public.captcha_challenges
FOR SELECT
USING (private.is_god());

-- No INSERT/UPDATE/DELETE policies - challenges are managed by backend functions only

-- Function to log a CAPTCHA challenge
CREATE OR REPLACE FUNCTION public.log_captcha_challenge(
  p_user_id UUID,
  p_device_id TEXT,
  p_challenge_id TEXT,
  p_solved BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge_id UUID;
BEGIN
  INSERT INTO public.captcha_challenges (
    user_id,
    device_id,
    challenge_id,
    solved
  )
  VALUES (
    p_user_id,
    p_device_id,
    p_challenge_id,
    p_solved
  )
  RETURNING id INTO v_challenge_id;

  RETURN v_challenge_id;
END;
$$;

-- Function to check if device recently solved a CAPTCHA (within 1 hour)
CREATE OR REPLACE FUNCTION public.device_has_recent_captcha_success(
  p_device_id TEXT,
  p_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_success BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.captcha_challenges
    WHERE device_id = p_device_id
      AND solved = TRUE
      AND created_at > NOW() - INTERVAL '1 minute' * p_minutes
  ) INTO v_has_success;

  RETURN v_has_success;
END;
$$;

-- Function to get CAPTCHA solve rate for device (success ratio)
CREATE OR REPLACE FUNCTION public.get_captcha_solve_rate(
  p_device_id TEXT,
  p_hours INTEGER DEFAULT 24
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_solved INTEGER;
  v_rate NUMERIC;
BEGIN
  SELECT
    COUNT(*),
    SUM(CASE WHEN solved THEN 1 ELSE 0 END)
  INTO v_total, v_solved
  FROM public.captcha_challenges
  WHERE device_id = p_device_id
    AND created_at > NOW() - INTERVAL '1 hour' * p_hours;

  -- Return 0 if no attempts
  IF v_total = 0 THEN
    RETURN 0;
  END IF;

  -- Calculate success rate (0.0 to 1.0)
  v_rate := v_solved::NUMERIC / v_total::NUMERIC;
  RETURN v_rate;
END;
$$;

-- Function to clean up old CAPTCHA challenges (retention policy: 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_captcha_challenges()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.captcha_challenges
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.log_captcha_challenge(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_captcha_challenge(UUID, TEXT, TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION public.device_has_recent_captcha_success(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.device_has_recent_captcha_success(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_captcha_solve_rate(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_captcha_challenges() TO authenticated;

-- Comments
COMMENT ON TABLE public.captcha_challenges IS
'Tracks CAPTCHA challenge attempts for rate limiting and security monitoring.';

COMMENT ON FUNCTION public.log_captcha_challenge(UUID, TEXT, TEXT, BOOLEAN) IS
'Logs a CAPTCHA challenge attempt with user_id, device_id, challenge_id, and result.';

COMMENT ON FUNCTION public.device_has_recent_captcha_success(TEXT, INTEGER) IS
'Checks if a device successfully solved a CAPTCHA within the specified time window (default: 60 minutes).';

COMMENT ON FUNCTION public.get_captcha_solve_rate(TEXT, INTEGER) IS
'Returns the CAPTCHA success rate for a device (0.0 to 1.0) within the specified time window (default: 24 hours).';

COMMENT ON FUNCTION public.cleanup_old_captcha_challenges() IS
'Deletes CAPTCHA challenges older than 30 days. Call periodically via cron job.';

-- ============================================================================
-- Rollback Script
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.cleanup_old_captcha_challenges();
-- DROP FUNCTION IF EXISTS public.get_captcha_solve_rate(TEXT, INTEGER);
-- DROP FUNCTION IF EXISTS public.device_has_recent_captcha_success(TEXT, INTEGER);
-- DROP FUNCTION IF EXISTS public.log_captcha_challenge(UUID, TEXT, TEXT, BOOLEAN);
-- DROP TABLE IF EXISTS public.captcha_challenges;
