-- ============================================================================
-- 090: Programmatic API Keys
-- Orgs can generate API keys for external integrations (read/write transfers).
-- Keys are SHA-256 hashed; the plain key is shown only once on creation.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.org_api_keys (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  key_prefix   VARCHAR(16) NOT NULL,   -- first 16 chars of key, shown in UI
  key_hash     TEXT        NOT NULL UNIQUE,  -- SHA-256(full_key), never exposed via API
  scopes       TEXT[]      NOT NULL DEFAULT '{}',
  -- supported scopes: 'transfers:read' | 'transfers:write'
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,            -- NULL = never expires
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.org_api_keys ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_org_api_keys_org
  ON public.org_api_keys(org_id) WHERE is_active = true;

-- RLS: only org admins + god can manage API keys
-- Note: key_hash is intentionally excluded from select via a separate secure function
CREATE POLICY "Manage org api keys"
  ON public.org_api_keys FOR ALL
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(org_id))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(org_id))
  );

-- ── Secure lookup function (used by Edge Function api-gateway) ────────────────
-- Validates a hashed key and returns key metadata. Edge Function calls this
-- with service role, so RLS is bypassed intentionally here.
CREATE OR REPLACE FUNCTION public.validate_api_key(p_key_hash TEXT)
RETURNS TABLE (
  id       UUID,
  org_id   UUID,
  name     TEXT,
  scopes   TEXT[],
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.org_id,
    k.name,
    k.scopes,
    (
      k.is_active = true
      AND (k.expires_at IS NULL OR k.expires_at > now())
    ) AS is_valid
  FROM public.org_api_keys k
  WHERE k.key_hash = p_key_hash
  LIMIT 1;
END;
$$;

-- RPC: update last_used_at (called by Edge Function after successful auth)
CREATE OR REPLACE FUNCTION public.touch_api_key_last_used(p_key_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.org_api_keys SET last_used_at = now() WHERE id = p_key_id;
END;
$$;
