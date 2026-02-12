-- ============================================================================
-- 022: Trusted Devices
-- ============================================================================
-- Description: Add trusted devices tracking for enhanced security
-- - Stores devices that users have explicitly trusted
-- - Allows skipping CAPTCHA on trusted devices
-- - Tracks device usage for security monitoring
-- ============================================================================

-- Create trusted_devices table
CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  label TEXT,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one entry per user + device combination
  CONSTRAINT trusted_devices_user_device_unique UNIQUE (user_id, device_id)
);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id
ON public.trusted_devices(user_id);

-- Create index for faster lookups by device_id
CREATE INDEX IF NOT EXISTS idx_trusted_devices_device_id
ON public.trusted_devices(device_id);

-- Create index for cleanup of old devices (last_used_at)
CREATE INDEX IF NOT EXISTS idx_trusted_devices_last_used_at
ON public.trusted_devices(last_used_at DESC);

-- Enable Row Level Security
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own trusted devices
CREATE POLICY "Users can read their own trusted devices"
ON public.trusted_devices
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own trusted devices
CREATE POLICY "Users can insert their own trusted devices"
ON public.trusted_devices
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own trusted devices
CREATE POLICY "Users can update their own trusted devices"
ON public.trusted_devices
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own trusted devices
CREATE POLICY "Users can delete their own trusted devices"
ON public.trusted_devices
FOR DELETE
USING (auth.uid() = user_id);

-- Function to check if a device is trusted
CREATE OR REPLACE FUNCTION public.is_device_trusted(
  p_user_id UUID,
  p_device_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
  v_expiry_days INTEGER := 30; -- Devices expire after 30 days of inactivity
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.trusted_devices
    WHERE user_id = p_user_id
      AND device_id = p_device_id
      AND last_used_at > NOW() - INTERVAL '1 day' * v_expiry_days
  ) INTO v_exists;

  RETURN v_exists;
END;
$$;

-- Function to mark device as used (update last_used_at)
CREATE OR REPLACE FUNCTION public.mark_device_used(
  p_user_id UUID,
  p_device_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.trusted_devices
  SET last_used_at = NOW()
  WHERE user_id = p_user_id
    AND device_id = p_device_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.is_device_trusted(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_device_used(UUID, TEXT) TO authenticated;

-- Comment the table
COMMENT ON TABLE public.trusted_devices IS
'Stores devices that users have explicitly trusted. Trusted devices can skip additional security checks like CAPTCHA.';

-- Comment the function
COMMENT ON FUNCTION public.is_device_trusted(UUID, TEXT) IS
'Checks if a device is trusted for a user and has been used within the expiry period (30 days).';

COMMENT ON FUNCTION public.mark_device_used(UUID, TEXT) IS
'Updates the last_used_at timestamp for a trusted device.';

-- ============================================================================
-- Rollback Script (run this to undo the migration)
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.mark_device_used(UUID, TEXT);
-- DROP FUNCTION IF EXISTS public.is_device_trusted(UUID, TEXT);
-- DROP TABLE IF EXISTS public.trusted_devices;
