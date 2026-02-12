-- ============================================================================
-- 021: Online Presence Tracking
-- ============================================================================
-- Description: Add online presence tracking for users
-- - Tracks last_seen_at timestamp
-- - Online status calculated in application (user active in last 5 minutes)
-- ============================================================================

-- Add presence tracking column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Create index for online status queries (performance optimization)
-- This helps with queries that filter by recent activity
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at
ON public.profiles(last_seen_at DESC)
WHERE last_seen_at IS NOT NULL;

-- Function to update user's last seen timestamp (heartbeat)
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_seen_at = NOW()
  WHERE id = auth.uid();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_last_seen() TO authenticated;

-- RLS policies remain the same - existing profile policies cover these columns
-- Users can read their own and other users' presence data
-- Users can only update their own last_seen via the update_last_seen() function

-- Comment the function
COMMENT ON FUNCTION public.update_last_seen() IS
'Updates the current user''s last_seen_at timestamp. Call this periodically (heartbeat) to maintain online status.';

-- Set initial last_seen_at for existing users to now (optional)
-- Uncomment if you want all existing users to appear online initially
-- UPDATE public.profiles SET last_seen_at = NOW() WHERE last_seen_at IS NULL;
