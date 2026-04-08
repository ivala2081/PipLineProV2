-- ============================================================================
-- 132: Fix audit_org_table_change action mapping
--
-- Migration 131 broke the action mapping by using lower(TG_OP) which yields
-- 'insert'/'update'/'delete', but the CHECK constraint on org_audit_log.action
-- expects 'created'/'updated'/'deleted'. This restores the correct CASE mapping.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_org_table_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _org_id     UUID;
  _record_id  UUID;
  _action     TEXT;
  _old_data   JSONB;
  _new_data   JSONB;
  _meta       JSONB := '{}'::jsonb;
BEGIN
  -- Determine action (must match CHECK constraint: created/updated/deleted)
  CASE TG_OP
    WHEN 'INSERT' THEN _action := 'created';
    WHEN 'UPDATE' THEN _action := 'updated';
    WHEN 'DELETE' THEN _action := 'deleted';
  END CASE;

  -- Get record id and org id from NEW or OLD
  IF TG_OP = 'DELETE' THEN
    _record_id := OLD.id;
    _org_id := OLD.organization_id;
    _old_data := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    _record_id := NEW.id;
    _org_id := NEW.organization_id;
    _new_data := to_jsonb(NEW);
  ELSE
    _record_id := NEW.id;
    _org_id := NEW.organization_id;
    _old_data := to_jsonb(OLD);
    _new_data := to_jsonb(NEW);
  END IF;

  -- For ib_commissions: add override metadata if changed
  IF TG_TABLE_NAME = 'ib_commissions' AND TG_OP = 'UPDATE' THEN
    IF (OLD.override_amount IS DISTINCT FROM NEW.override_amount)
       OR (OLD.override_reason IS DISTINCT FROM NEW.override_reason) THEN
      _meta := jsonb_build_object(
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
  -- or PSP settlement trigger (the source row is already audited).
  IF TG_TABLE_NAME = 'accounting_entries' AND TG_OP = 'INSERT' THEN
    IF NEW.ib_payment_id IS NOT NULL OR NEW.psp_settlement_id IS NOT NULL THEN
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
