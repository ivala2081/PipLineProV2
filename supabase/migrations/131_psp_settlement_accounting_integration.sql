-- ============================================================================
-- Migration 131 — PSP Settlement <-> Accounting integration
-- ============================================================================
-- Mirrors the IB-payment integration pattern (migration 117 + 130) for PSP
-- settlements (tahsilatlar). After this migration:
--   1. Every INSERT into `psp_settlements` auto-creates a matching
--      `accounting_entries` row (via trigger), so PSP collections always
--      appear in the ledger AND are deducted from the PSP balance.
--   2. The accounting form's "Psp Tahsilatı" flow can route through
--      `psp_settlements` and the trigger handles the rest.
--   3. The audit logger skips the auto-created accounting entry (the
--      settlement itself is already audited).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add register tracking + accounting linkage to psp_settlements
-- ----------------------------------------------------------------------------
-- Both columns are NULLABLE so the existing manual settlement UI keeps
-- working without modification. New rows from the accounting form will
-- populate them; legacy rows + existing manual UI rows leave them NULL.
ALTER TABLE public.psp_settlements
  ADD COLUMN IF NOT EXISTS register     TEXT,
  ADD COLUMN IF NOT EXISTS register_id  UUID REFERENCES public.accounting_registers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description  TEXT;


-- ----------------------------------------------------------------------------
-- 2. Add psp_settlement_id FK to accounting_entries
-- ----------------------------------------------------------------------------
ALTER TABLE public.accounting_entries
  ADD COLUMN IF NOT EXISTS psp_settlement_id UUID
    REFERENCES public.psp_settlements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_accounting_entries_psp_settlement
  ON public.accounting_entries(psp_settlement_id);


-- ----------------------------------------------------------------------------
-- 3. Trigger function: auto-create accounting entry on PSP settlement insert
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_psp_settlement_accounting_entry()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _psp_name    TEXT;
  _category_id UUID;
BEGIN
  SELECT name INTO _psp_name FROM psps WHERE id = NEW.psp_id;

  -- Link to the global 'psp_transfer' category so the accounting form
  -- recognizes auto-generated PSP entries in edit mode.
  SELECT id INTO _category_id
  FROM accounting_categories
  WHERE organization_id IS NULL AND name = 'psp_transfer'
  LIMIT 1;

  INSERT INTO accounting_entries (
    organization_id, entry_type, direction, amount, currency,
    register, register_id, description, entry_date,
    psp_settlement_id, created_by, category_id
  ) VALUES (
    NEW.organization_id,
    'TRANSFER',
    'in',
    NEW.amount,
    NEW.currency,
    COALESCE(NEW.register, 'USDT'),
    NEW.register_id,
    COALESCE(NEW.description, 'Psp Tahsilatı: ' || COALESCE(_psp_name, 'Unknown')),
    NEW.settlement_date,
    NEW.id,
    NEW.created_by,
    _category_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_psp_settlement_accounting ON public.psp_settlements;
CREATE TRIGGER trg_psp_settlement_accounting
  AFTER INSERT ON public.psp_settlements
  FOR EACH ROW
  EXECUTE FUNCTION create_psp_settlement_accounting_entry();


-- ----------------------------------------------------------------------------
-- 4. Audit logging: skip the side-effect accounting entry
-- ----------------------------------------------------------------------------
-- Mirrors the IB-payment skip rule from migration 118: the settlement row
-- is already audited; the auto-created entry would be a duplicate.
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
  -- Determine action
  _action := lower(TG_OP);

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
