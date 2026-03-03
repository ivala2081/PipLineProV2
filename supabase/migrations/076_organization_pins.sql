-- ============================================================================
-- Migration 076: Organization PINs (server-side verified)
-- ============================================================================
-- Replaces the hardcoded client-side PIN with a per-org bcrypt-hashed PIN
-- verified via RPC with rate limiting.
-- ============================================================================

-- Ensure pgcrypto is available (already enabled for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Table ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organization_pins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pin_hash        TEXT NOT NULL,
  updated_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT org_pins_unique_org UNIQUE (organization_id)
);

CREATE INDEX IF NOT EXISTS idx_org_pins_org ON public.organization_pins(organization_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.organization_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view their org PIN"
ON public.organization_pins FOR SELECT
USING (private.is_god() OR private.is_org_admin(organization_id));

CREATE POLICY "Org admins can insert org PIN"
ON public.organization_pins FOR INSERT
WITH CHECK (private.is_god() OR private.is_org_admin(organization_id));

CREATE POLICY "Org admins can update org PIN"
ON public.organization_pins FOR UPDATE
USING (private.is_god() OR private.is_org_admin(organization_id))
WITH CHECK (private.is_god() OR private.is_org_admin(organization_id));

-- ── RPC: verify_org_pin ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.verify_org_pin(
  p_organization_id UUID,
  p_pin             TEXT,
  p_device_id       TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_stored_hash TEXT;
BEGIN
  -- Rate limit: reuse existing should_rate_limit_device (5 failed / 15 min)
  IF p_device_id IS NOT NULL THEN
    IF public.should_rate_limit_device(p_device_id, 5, 15) THEN
      RAISE EXCEPTION 'RATE_LIMITED';
    END IF;
  END IF;

  SELECT pin_hash INTO v_stored_hash
  FROM public.organization_pins
  WHERE organization_id = p_organization_id;

  -- No PIN set for this org
  IF v_stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  -- bcrypt comparison (extensions.crypt because pgcrypto lives in extensions schema)
  RETURN v_stored_hash = extensions.crypt(p_pin, v_stored_hash);
END;
$$;

-- ── RPC: set_org_pin ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_org_pin(
  p_organization_id UUID,
  p_new_pin         TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Only god or org admin
  IF NOT (private.is_god() OR private.is_org_admin(p_organization_id)) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  -- PIN must be 4-6 digits
  IF p_new_pin !~ '^\d{4,6}$' THEN
    RAISE EXCEPTION 'PIN_INVALID_FORMAT';
  END IF;

  -- extensions.crypt / extensions.gen_salt because pgcrypto lives in extensions schema
  INSERT INTO public.organization_pins (organization_id, pin_hash, updated_by)
  VALUES (p_organization_id, extensions.crypt(p_new_pin, extensions.gen_salt('bf')), auth.uid())
  ON CONFLICT (organization_id)
  DO UPDATE SET
    pin_hash   = extensions.crypt(p_new_pin, extensions.gen_salt('bf')),
    updated_by = auth.uid(),
    updated_at = NOW();
END;
$$;

-- ── RPC: has_org_pin ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.has_org_pin(
  p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_pins
    WHERE organization_id = p_organization_id
  );
END;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.verify_org_pin(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_org_pin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_pin(UUID) TO authenticated;

-- ── Comments ────────────────────────────────────────────────────────────────

COMMENT ON TABLE public.organization_pins IS
'Stores bcrypt-hashed PINs per organization for sensitive operation verification.';

COMMENT ON FUNCTION public.verify_org_pin(UUID, TEXT, TEXT) IS
'Verifies an org PIN against the stored bcrypt hash. Rate-limited via device_id.';

COMMENT ON FUNCTION public.set_org_pin(UUID, TEXT) IS
'Sets or updates the PIN for an organization. Admin/god only. PIN must be 4-6 digits.';

COMMENT ON FUNCTION public.has_org_pin(UUID) IS
'Returns true if the organization has a PIN configured.';

-- ============================================================================
-- Rollback Script
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.has_org_pin(UUID);
-- DROP FUNCTION IF EXISTS public.set_org_pin(UUID, TEXT);
-- DROP FUNCTION IF EXISTS public.verify_org_pin(UUID, TEXT, TEXT);
-- DROP TABLE IF EXISTS public.organization_pins;
