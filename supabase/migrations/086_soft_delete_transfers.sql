-- ============================================================================
-- 086: Soft delete for transfers
-- Adds deleted_at / deleted_by columns. Hard deletes become soft deletes.
-- Admins can view Trash and restore or permanently purge.
-- ============================================================================

-- 1. Add soft-delete columns
ALTER TABLE public.transfers
  ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by  UUID        DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Partial index for fast trash queries (only deleted rows)
CREATE INDEX IF NOT EXISTS idx_transfers_trash
  ON public.transfers(organization_id, deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

-- 3. Update existing RLS SELECT policies to exclude soft-deleted rows.
--    We recreate the main policy so normal queries never see deleted transfers.
DO $$
BEGIN
  -- Drop existing permissive SELECT policies on transfers (recreate below)
  DROP POLICY IF EXISTS "Users can view their org transfers" ON public.transfers;
  DROP POLICY IF EXISTS "Org members can view transfers"    ON public.transfers;
  DROP POLICY IF EXISTS "Read transfers"                    ON public.transfers;
  DROP POLICY IF EXISTS "Select transfers"                  ON public.transfers;
END $$;

-- Normal SELECT: org members see only non-deleted
CREATE POLICY "Read transfers (non-deleted)"
  ON public.transfers FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      organization_id IN (SELECT private.get_user_org_ids())
      OR (SELECT private.is_god())
    )
  );

-- Trash SELECT: admins + managers see deleted
CREATE POLICY "Read deleted transfers (trash)"
  ON public.transfers FOR SELECT
  USING (
    deleted_at IS NOT NULL
    AND (
      (SELECT private.is_org_admin(organization_id))
      OR (SELECT private.is_god())
      OR EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = transfers.organization_id
          AND om.user_id = auth.uid()
          AND om.role = 'manager'
      )
    )
  );

-- 4. Update audit trigger to capture deleted_at / restored events
CREATE OR REPLACE FUNCTION public.handle_transfer_audit_update()
RETURNS TRIGGER AS $$
DECLARE
  _changes JSONB := '{}'::jsonb;
  _action  TEXT  := 'updated';
BEGIN
  -- Detect soft-delete / restore
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    _action := 'deleted';
  ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    _action := 'restored';
  END IF;

  -- Track field-level changes
  IF OLD.full_name             IS DISTINCT FROM NEW.full_name             THEN _changes := _changes || jsonb_build_object('full_name',             jsonb_build_object('old', OLD.full_name,             'new', NEW.full_name));             END IF;
  IF OLD.amount                IS DISTINCT FROM NEW.amount                THEN _changes := _changes || jsonb_build_object('amount',                jsonb_build_object('old', OLD.amount,                'new', NEW.amount));                END IF;
  IF OLD.commission            IS DISTINCT FROM NEW.commission            THEN _changes := _changes || jsonb_build_object('commission',            jsonb_build_object('old', OLD.commission,            'new', NEW.commission));            END IF;
  IF OLD.net                   IS DISTINCT FROM NEW.net                   THEN _changes := _changes || jsonb_build_object('net',                   jsonb_build_object('old', OLD.net,                   'new', NEW.net));                   END IF;
  IF OLD.currency              IS DISTINCT FROM NEW.currency              THEN _changes := _changes || jsonb_build_object('currency',              jsonb_build_object('old', OLD.currency,              'new', NEW.currency));              END IF;
  IF OLD.category_id           IS DISTINCT FROM NEW.category_id           THEN _changes := _changes || jsonb_build_object('category_id',           jsonb_build_object('old', OLD.category_id,           'new', NEW.category_id));           END IF;
  IF OLD.payment_method_id     IS DISTINCT FROM NEW.payment_method_id     THEN _changes := _changes || jsonb_build_object('payment_method_id',     jsonb_build_object('old', OLD.payment_method_id,     'new', NEW.payment_method_id));     END IF;
  IF OLD.type_id               IS DISTINCT FROM NEW.type_id               THEN _changes := _changes || jsonb_build_object('type_id',               jsonb_build_object('old', OLD.type_id,               'new', NEW.type_id));               END IF;
  IF OLD.psp_id                IS DISTINCT FROM NEW.psp_id                THEN _changes := _changes || jsonb_build_object('psp_id',                jsonb_build_object('old', OLD.psp_id,                'new', NEW.psp_id));                END IF;
  IF OLD.crm_id                IS DISTINCT FROM NEW.crm_id                THEN _changes := _changes || jsonb_build_object('crm_id',                jsonb_build_object('old', OLD.crm_id,                'new', NEW.crm_id));                END IF;
  IF OLD.meta_id               IS DISTINCT FROM NEW.meta_id               THEN _changes := _changes || jsonb_build_object('meta_id',               jsonb_build_object('old', OLD.meta_id,               'new', NEW.meta_id));               END IF;
  IF OLD.transfer_date         IS DISTINCT FROM NEW.transfer_date         THEN _changes := _changes || jsonb_build_object('transfer_date',         jsonb_build_object('old', OLD.transfer_date,         'new', NEW.transfer_date));         END IF;
  IF OLD.exchange_rate         IS DISTINCT FROM NEW.exchange_rate         THEN _changes := _changes || jsonb_build_object('exchange_rate',         jsonb_build_object('old', OLD.exchange_rate,         'new', NEW.exchange_rate));         END IF;
  IF OLD.amount_try            IS DISTINCT FROM NEW.amount_try            THEN _changes := _changes || jsonb_build_object('amount_try',            jsonb_build_object('old', OLD.amount_try,            'new', NEW.amount_try));            END IF;
  IF OLD.amount_usd            IS DISTINCT FROM NEW.amount_usd            THEN _changes := _changes || jsonb_build_object('amount_usd',            jsonb_build_object('old', OLD.amount_usd,            'new', NEW.amount_usd));            END IF;
  IF OLD.notes                 IS DISTINCT FROM NEW.notes                 THEN _changes := _changes || jsonb_build_object('notes',                 jsonb_build_object('old', OLD.notes,                 'new', NEW.notes));                 END IF;
  IF OLD.deleted_at            IS DISTINCT FROM NEW.deleted_at            THEN _changes := _changes || jsonb_build_object('deleted_at',            jsonb_build_object('old', OLD.deleted_at,            'new', NEW.deleted_at));            END IF;

  -- Always write for delete/restore; for updates only if something changed
  IF _action IN ('deleted', 'restored') OR _changes != '{}'::jsonb THEN
    INSERT INTO public.transfer_audit_log (transfer_id, organization_id, action, performed_by, changes)
    VALUES (NEW.id, NEW.organization_id, _action, auth.uid(), _changes);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Make sure trigger exists (it should already from 046, just recreate to pick up new function)
DROP TRIGGER IF EXISTS transfer_audit_update ON public.transfers;
CREATE TRIGGER transfer_audit_update
  AFTER UPDATE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.handle_transfer_audit_update();
