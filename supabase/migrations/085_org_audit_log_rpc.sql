-- ============================================================================
-- 085: Org-wide audit log RPC + index
-- Enables the Global Audit Log page to query all transfer changes across an org.
-- ============================================================================

-- Efficient index for org-wide audit queries (already may exist per-transfer, but this covers org-level)
CREATE INDEX IF NOT EXISTS idx_transfer_audit_log_org_date
  ON public.transfer_audit_log(organization_id, created_at DESC);

-- ── RPC: get_org_audit_log ────────────────────────────────────────────────────
-- Returns paginated org-wide audit log entries joined with performer profile
-- and transfer full_name (for display). Supports filters by actor + action.
CREATE OR REPLACE FUNCTION public.get_org_audit_log(
  p_org_id        UUID,
  p_from          TIMESTAMPTZ DEFAULT NULL,
  p_to            TIMESTAMPTZ DEFAULT NULL,
  p_actor_id      UUID        DEFAULT NULL,
  p_action        TEXT        DEFAULT NULL,  -- 'created' | 'updated' | 'deleted' | 'restored'
  p_limit         INT         DEFAULT 25,
  p_offset        INT         DEFAULT 0
)
RETURNS TABLE (
  id              UUID,
  transfer_id     UUID,
  organization_id UUID,
  action          TEXT,
  performed_by    UUID,
  changes         JSONB,
  created_at      TIMESTAMPTZ,
  -- joined fields
  performer_name  TEXT,
  performer_email TEXT,
  transfer_name   TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only org admins, managers, or gods may access this
  IF NOT (
    (SELECT private.is_org_admin(p_org_id))
    OR (SELECT private.is_god())
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = p_org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'manager')
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    al.transfer_id,
    al.organization_id,
    al.action::TEXT,
    al.performed_by,
    al.changes,
    al.created_at,
    COALESCE(p.display_name, p.email, al.performed_by::TEXT) AS performer_name,
    p.email                                                    AS performer_email,
    t.full_name                                                AS transfer_name
  FROM public.transfer_audit_log al
  LEFT JOIN public.profiles  p ON p.id = al.performed_by
  LEFT JOIN public.transfers t ON t.id = al.transfer_id
  WHERE al.organization_id = p_org_id
    AND (p_from     IS NULL OR al.created_at >= p_from)
    AND (p_to       IS NULL OR al.created_at <= p_to)
    AND (p_actor_id IS NULL OR al.performed_by = p_actor_id)
    AND (p_action   IS NULL OR al.action = p_action)
  ORDER BY al.created_at DESC
  LIMIT  LEAST(p_limit, 100)
  OFFSET p_offset;
END;
$$;

-- Count RPC (for pagination total)
CREATE OR REPLACE FUNCTION public.get_org_audit_log_count(
  p_org_id   UUID,
  p_from     TIMESTAMPTZ DEFAULT NULL,
  p_to       TIMESTAMPTZ DEFAULT NULL,
  p_actor_id UUID        DEFAULT NULL,
  p_action   TEXT        DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count BIGINT;
BEGIN
  IF NOT (
    (SELECT private.is_org_admin(p_org_id))
    OR (SELECT private.is_god())
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = p_org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'manager')
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.transfer_audit_log al
  WHERE al.organization_id = p_org_id
    AND (p_from     IS NULL OR al.created_at >= p_from)
    AND (p_to       IS NULL OR al.created_at <= p_to)
    AND (p_actor_id IS NULL OR al.performed_by = p_actor_id)
    AND (p_action   IS NULL OR al.action = p_action);

  RETURN v_count;
END;
$$;
