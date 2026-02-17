-- ============================================================================
-- 046: Fix transfer audit log
-- 1. Add missing FK to profiles (required for Supabase PostgREST join)
-- 2. Update trigger to track all important fields
-- ============================================================================

-- 1. Add FK from performed_by -> profiles(id) so PostgREST can join
--    (The existing FK to auth.users remains; this adds a second FK to profiles)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transfer_audit_log_performed_by_profiles_fkey'
      AND table_name = 'transfer_audit_log'
  ) THEN
    ALTER TABLE public.transfer_audit_log
      ADD CONSTRAINT transfer_audit_log_performed_by_profiles_fkey
      FOREIGN KEY (performed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Replace trigger function to track all transfer fields
CREATE OR REPLACE FUNCTION public.handle_transfer_audit_update()
RETURNS TRIGGER AS $$
DECLARE
  _changes JSONB := '{}'::jsonb;
BEGIN
  IF OLD.full_name IS DISTINCT FROM NEW.full_name THEN
    _changes := _changes || jsonb_build_object('full_name', jsonb_build_object('old', OLD.full_name, 'new', NEW.full_name));
  END IF;
  IF OLD.amount IS DISTINCT FROM NEW.amount THEN
    _changes := _changes || jsonb_build_object('amount', jsonb_build_object('old', OLD.amount, 'new', NEW.amount));
  END IF;
  IF OLD.commission IS DISTINCT FROM NEW.commission THEN
    _changes := _changes || jsonb_build_object('commission', jsonb_build_object('old', OLD.commission, 'new', NEW.commission));
  END IF;
  IF OLD.net IS DISTINCT FROM NEW.net THEN
    _changes := _changes || jsonb_build_object('net', jsonb_build_object('old', OLD.net, 'new', NEW.net));
  END IF;
  IF OLD.currency IS DISTINCT FROM NEW.currency THEN
    _changes := _changes || jsonb_build_object('currency', jsonb_build_object('old', OLD.currency, 'new', NEW.currency));
  END IF;
  IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
    _changes := _changes || jsonb_build_object('category_id', jsonb_build_object('old', OLD.category_id, 'new', NEW.category_id));
  END IF;
  IF OLD.payment_method_id IS DISTINCT FROM NEW.payment_method_id THEN
    _changes := _changes || jsonb_build_object('payment_method_id', jsonb_build_object('old', OLD.payment_method_id, 'new', NEW.payment_method_id));
  END IF;
  IF OLD.type_id IS DISTINCT FROM NEW.type_id THEN
    _changes := _changes || jsonb_build_object('type_id', jsonb_build_object('old', OLD.type_id, 'new', NEW.type_id));
  END IF;
  IF OLD.psp_id IS DISTINCT FROM NEW.psp_id THEN
    _changes := _changes || jsonb_build_object('psp_id', jsonb_build_object('old', OLD.psp_id, 'new', NEW.psp_id));
  END IF;
  IF OLD.crm_id IS DISTINCT FROM NEW.crm_id THEN
    _changes := _changes || jsonb_build_object('crm_id', jsonb_build_object('old', OLD.crm_id, 'new', NEW.crm_id));
  END IF;
  IF OLD.meta_id IS DISTINCT FROM NEW.meta_id THEN
    _changes := _changes || jsonb_build_object('meta_id', jsonb_build_object('old', OLD.meta_id, 'new', NEW.meta_id));
  END IF;
  IF OLD.transfer_date IS DISTINCT FROM NEW.transfer_date THEN
    _changes := _changes || jsonb_build_object('transfer_date', jsonb_build_object('old', OLD.transfer_date, 'new', NEW.transfer_date));
  END IF;
  IF OLD.exchange_rate IS DISTINCT FROM NEW.exchange_rate THEN
    _changes := _changes || jsonb_build_object('exchange_rate', jsonb_build_object('old', OLD.exchange_rate, 'new', NEW.exchange_rate));
  END IF;
  IF OLD.amount_try IS DISTINCT FROM NEW.amount_try THEN
    _changes := _changes || jsonb_build_object('amount_try', jsonb_build_object('old', OLD.amount_try, 'new', NEW.amount_try));
  END IF;
  IF OLD.amount_usd IS DISTINCT FROM NEW.amount_usd THEN
    _changes := _changes || jsonb_build_object('amount_usd', jsonb_build_object('old', OLD.amount_usd, 'new', NEW.amount_usd));
  END IF;
  IF OLD.commission_rate_snapshot IS DISTINCT FROM NEW.commission_rate_snapshot THEN
    _changes := _changes || jsonb_build_object('commission_rate_snapshot', jsonb_build_object('old', OLD.commission_rate_snapshot, 'new', NEW.commission_rate_snapshot));
  END IF;

  IF _changes != '{}'::jsonb THEN
    INSERT INTO public.transfer_audit_log (transfer_id, organization_id, action, performed_by, changes)
    VALUES (NEW.id, NEW.organization_id, 'updated', auth.uid(), _changes);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
