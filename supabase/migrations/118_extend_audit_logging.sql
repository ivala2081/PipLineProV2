-- ============================================================================
-- 118: Extended Audit Logging — org_audit_log
--
-- Creates a generic org-level audit log table for IB, accounting,
-- role_permissions, and other org-scoped tables.
-- Adds trigger functions + triggers for each audited table.
-- Adds RPC functions for querying + counting + stats.
-- ============================================================================

-- ============================================================================
-- 1. org_audit_log table
-- ============================================================================
CREATE TABLE public.org_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  table_name      TEXT NOT NULL,
  record_id       UUID,
  action          TEXT NOT NULL CHECK (action IN ('created','updated','deleted')),
  old_data        JSONB,
  new_data        JSONB,
  performed_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  performed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata        JSONB
);

CREATE INDEX idx_org_audit_log_org_date ON org_audit_log(organization_id, performed_at DESC);
CREATE INDEX idx_org_audit_log_table    ON org_audit_log(organization_id, table_name);
CREATE INDEX idx_org_audit_log_record   ON org_audit_log(record_id);

-- ============================================================================
-- 2. RLS — read-only for admin/manager + god; no client writes
-- ============================================================================
ALTER TABLE org_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_audit_log_select" ON public.org_audit_log
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = org_audit_log.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'manager')
    )
  );

-- No INSERT/UPDATE/DELETE policies — only triggers write to this table

-- ============================================================================
-- 3. Generic audit trigger function
--    Parameterised by TG_TABLE_NAME and TG_OP.
--    Strips sensitive fields (org_pin) from logged data.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.audit_org_table_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _old_data  JSONB;
  _new_data  JSONB;
  _org_id    UUID;
  _record_id UUID;
  _meta      JSONB := NULL;
  _action    TEXT;
BEGIN
  -- Determine action
  CASE TG_OP
    WHEN 'INSERT' THEN _action := 'created';
    WHEN 'UPDATE' THEN _action := 'updated';
    WHEN 'DELETE' THEN _action := 'deleted';
  END CASE;

  -- Build old/new JSONB, strip sensitive fields
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    _old_data := to_jsonb(OLD);
    _old_data := _old_data - 'org_pin';  -- strip PIN if present
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    _new_data := to_jsonb(NEW);
    _new_data := _new_data - 'org_pin';
  END IF;

  -- Extract organization_id and record id
  _org_id    := COALESCE(
    CASE WHEN TG_OP != 'DELETE' THEN (to_jsonb(NEW)->>'organization_id')::UUID END,
    CASE WHEN TG_OP != 'INSERT' THEN (to_jsonb(OLD)->>'organization_id')::UUID END
  );
  _record_id := COALESCE(
    CASE WHEN TG_OP != 'DELETE' THEN (to_jsonb(NEW)->>'id')::UUID END,
    CASE WHEN TG_OP != 'INSERT' THEN (to_jsonb(OLD)->>'id')::UUID END
  );

  -- For ib_commissions UPDATE: add override context to metadata
  IF TG_TABLE_NAME = 'ib_commissions' AND TG_OP = 'UPDATE' THEN
    IF OLD.override_amount IS DISTINCT FROM NEW.override_amount THEN
      _meta := jsonb_build_object(
        'override_change', true,
        'calculated_amount', NEW.calculated_amount,
        'old_override', OLD.override_amount,
        'new_override', NEW.override_amount,
        'override_reason', NEW.override_reason
      );
    END IF;
  END IF;

  -- For role_permissions: add role context to metadata
  IF TG_TABLE_NAME = 'role_permissions' THEN
    _meta := jsonb_build_object(
      'role', COALESCE(
        CASE WHEN TG_OP != 'DELETE' THEN NEW.role END,
        CASE WHEN TG_OP != 'INSERT' THEN OLD.role END
      ),
      'target_table', COALESCE(
        CASE WHEN TG_OP != 'DELETE' THEN NEW.table_name END,
        CASE WHEN TG_OP != 'INSERT' THEN OLD.table_name END
      )
    );
  END IF;

  -- Skip audit for accounting entries auto-created by IB payment trigger
  -- (the payment itself is audited; the side-effect entry is not)
  IF TG_TABLE_NAME = 'accounting_entries' AND TG_OP = 'INSERT' THEN
    IF NEW.ib_payment_id IS NOT NULL THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
  END IF;

  INSERT INTO public.org_audit_log (
    organization_id, table_name, record_id,
    action, old_data, new_data,
    performed_by, metadata
  ) VALUES (
    _org_id, TG_TABLE_NAME, _record_id,
    _action, _old_data, _new_data,
    auth.uid(), _meta
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- 4. Triggers — one per audited table+event
-- ============================================================================

-- ── ib_partners (INSERT, UPDATE, DELETE) ──
CREATE TRIGGER audit_ib_partners
  AFTER INSERT OR UPDATE OR DELETE ON public.ib_partners
  FOR EACH ROW EXECUTE FUNCTION public.audit_org_table_change();

-- ── ib_commissions (INSERT, UPDATE) ──
CREATE TRIGGER audit_ib_commissions
  AFTER INSERT OR UPDATE ON public.ib_commissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_org_table_change();

-- ── ib_payments (INSERT, DELETE) ──
CREATE TRIGGER audit_ib_payments
  AFTER INSERT OR DELETE ON public.ib_payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_org_table_change();

-- ── accounting_entries (INSERT, UPDATE, DELETE) ──
CREATE TRIGGER audit_accounting_entries
  AFTER INSERT OR UPDATE OR DELETE ON public.accounting_entries
  FOR EACH ROW EXECUTE FUNCTION public.audit_org_table_change();

-- ── role_permissions (INSERT, UPDATE, DELETE) ──
CREATE TRIGGER audit_role_permissions
  AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_org_table_change();

-- ============================================================================
-- 5. RPC: get_org_activity_log — paginated query with filters
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_org_activity_log(
  p_org_id     UUID,
  p_from       TIMESTAMPTZ DEFAULT NULL,
  p_to         TIMESTAMPTZ DEFAULT NULL,
  p_actor_id   UUID        DEFAULT NULL,
  p_action     TEXT        DEFAULT NULL,
  p_table_name TEXT        DEFAULT NULL,
  p_limit      INT         DEFAULT 25,
  p_offset     INT         DEFAULT 0
)
RETURNS TABLE (
  id              UUID,
  organization_id UUID,
  table_name      TEXT,
  record_id       UUID,
  action          TEXT,
  old_data        JSONB,
  new_data        JSONB,
  performed_by    UUID,
  performed_at    TIMESTAMPTZ,
  metadata        JSONB,
  performer_name  TEXT,
  performer_email TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Access: admin, manager, or god
  IF NOT (
    (SELECT private.is_god())
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
    al.organization_id,
    al.table_name,
    al.record_id,
    al.action::TEXT,
    al.old_data,
    al.new_data,
    al.performed_by,
    al.performed_at,
    al.metadata,
    COALESCE(p.display_name, p.email, al.performed_by::TEXT) AS performer_name,
    p.email AS performer_email
  FROM public.org_audit_log al
  LEFT JOIN public.profiles p ON p.id = al.performed_by
  WHERE al.organization_id = p_org_id
    AND (p_from       IS NULL OR al.performed_at >= p_from)
    AND (p_to         IS NULL OR al.performed_at <= p_to)
    AND (p_actor_id   IS NULL OR al.performed_by = p_actor_id)
    AND (p_action     IS NULL OR al.action = p_action)
    AND (p_table_name IS NULL OR al.table_name = p_table_name)
  ORDER BY al.performed_at DESC
  LIMIT  LEAST(p_limit, 100)
  OFFSET p_offset;
END;
$$;

-- ============================================================================
-- 6. RPC: get_org_activity_log_count — pagination total
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_org_activity_log_count(
  p_org_id     UUID,
  p_from       TIMESTAMPTZ DEFAULT NULL,
  p_to         TIMESTAMPTZ DEFAULT NULL,
  p_actor_id   UUID        DEFAULT NULL,
  p_action     TEXT        DEFAULT NULL,
  p_table_name TEXT        DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count BIGINT;
BEGIN
  IF NOT (
    (SELECT private.is_god())
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
  FROM public.org_audit_log al
  WHERE al.organization_id = p_org_id
    AND (p_from       IS NULL OR al.performed_at >= p_from)
    AND (p_to         IS NULL OR al.performed_at <= p_to)
    AND (p_actor_id   IS NULL OR al.performed_by = p_actor_id)
    AND (p_action     IS NULL OR al.action = p_action)
    AND (p_table_name IS NULL OR al.table_name = p_table_name);

  RETURN v_count;
END;
$$;

-- ============================================================================
-- 7. RPC: get_org_activity_log_stats — counts per action
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_org_activity_log_stats(
  p_org_id     UUID,
  p_from       TIMESTAMPTZ DEFAULT NULL,
  p_to         TIMESTAMPTZ DEFAULT NULL,
  p_actor_id   UUID        DEFAULT NULL,
  p_table_name TEXT        DEFAULT NULL
)
RETURNS TABLE (created BIGINT, updated BIGINT, deleted BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (
    (SELECT private.is_god())
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
    COUNT(*) FILTER (WHERE al.action = 'created') AS created,
    COUNT(*) FILTER (WHERE al.action = 'updated') AS updated,
    COUNT(*) FILTER (WHERE al.action = 'deleted') AS deleted
  FROM public.org_audit_log al
  WHERE al.organization_id = p_org_id
    AND (p_from       IS NULL OR al.performed_at >= p_from)
    AND (p_to         IS NULL OR al.performed_at <= p_to)
    AND (p_actor_id   IS NULL OR al.performed_by = p_actor_id)
    AND (p_table_name IS NULL OR al.table_name = p_table_name);
END;
$$;
