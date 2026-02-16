-- ============================================================================
-- Reset PSP System - Clean slate for PSP infrastructure
-- ============================================================================
-- This drops all PSP-related tables, functions, and triggers
-- Then recreates them with the correct schema
-- ============================================================================

-- Drop existing PSP tables (if any) in reverse dependency order
DROP TABLE IF EXISTS public.psp_settlements CASCADE;
DROP TABLE IF EXISTS public.psp_commission_rates CASCADE;
-- Don't drop psps table since it has data, just keep it

-- Drop PSP-related functions
DROP FUNCTION IF EXISTS public.get_psp_summary(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.sync_psp_current_rate() CASCADE;
DROP FUNCTION IF EXISTS public.sync_psp_current_rate_on_delete() CASCADE;
DROP FUNCTION IF EXISTS public.get_psp_rate_for_date(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_transfer_commission() CASCADE;

-- Drop PSP-related triggers on transfers
DROP TRIGGER IF EXISTS calculate_commission_trigger ON public.transfers;

-- ============================================================================
-- Add missing columns to existing tables
-- ============================================================================

-- Add is_internal to psps if missing
ALTER TABLE public.psps
ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;

-- Add commission_rate_snapshot to transfers if missing
ALTER TABLE public.transfers
ADD COLUMN IF NOT EXISTS commission_rate_snapshot NUMERIC(5,4);

-- Add commission and net to transfers if missing
ALTER TABLE public.transfers
ADD COLUMN IF NOT EXISTS commission NUMERIC(15,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS net NUMERIC(15,2) NOT NULL DEFAULT 0;

-- ============================================================================
-- Create psp_commission_rates table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.psp_commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psp_id UUID NOT NULL REFERENCES public.psps(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  commission_rate NUMERIC(5,4) NOT NULL CHECK (commission_rate >= 0 AND commission_rate < 1),
  effective_from DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (psp_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_psp_commission_rates_lookup ON public.psp_commission_rates(psp_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_psp_commission_rates_org ON public.psp_commission_rates(organization_id);

ALTER TABLE public.psp_commission_rates ENABLE ROW LEVEL SECURITY;

-- RLS policies for psp_commission_rates
CREATE POLICY "God users can view all commission rates"
  ON public.psp_commission_rates FOR SELECT
  USING (private.is_god());

CREATE POLICY "Users can view commission rates in their orgs"
  ON public.psp_commission_rates FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "God users can insert commission rates"
  ON public.psp_commission_rates FOR INSERT
  WITH CHECK (private.is_god());

CREATE POLICY "Admins can insert commission rates to their orgs"
  ON public.psp_commission_rates FOR INSERT
  WITH CHECK (private.is_org_admin(organization_id));

CREATE POLICY "God users can update commission rates"
  ON public.psp_commission_rates FOR UPDATE
  USING (private.is_god())
  WITH CHECK (private.is_god());

CREATE POLICY "Admins can update commission rates in their orgs"
  ON public.psp_commission_rates FOR UPDATE
  USING (private.is_org_admin(organization_id))
  WITH CHECK (private.is_org_admin(organization_id));

CREATE POLICY "God users can delete commission rates"
  ON public.psp_commission_rates FOR DELETE
  USING (private.is_god());

CREATE POLICY "Admins can delete commission rates in their orgs"
  ON public.psp_commission_rates FOR DELETE
  USING (private.is_org_admin(organization_id));

-- ============================================================================
-- Seed initial rate history for existing PSPs
-- ============================================================================

INSERT INTO public.psp_commission_rates (psp_id, organization_id, commission_rate, effective_from)
SELECT p.id, p.organization_id, p.commission_rate, CURRENT_DATE
FROM public.psps p
WHERE NOT EXISTS (
  SELECT 1 FROM public.psp_commission_rates r WHERE r.psp_id = p.id
)
ON CONFLICT (psp_id, effective_from) DO NOTHING;

-- ============================================================================
-- Create trigger functions
-- ============================================================================

-- Sync PSP current rate when rate is inserted
CREATE OR REPLACE FUNCTION public.sync_psp_current_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _latest_rate NUMERIC(5,4);
BEGIN
  SELECT commission_rate INTO _latest_rate
  FROM public.psp_commission_rates
  WHERE psp_id = NEW.psp_id
    AND effective_from <= CURRENT_DATE
  ORDER BY effective_from DESC
  LIMIT 1;

  IF _latest_rate IS NOT NULL THEN
    UPDATE public.psps
    SET commission_rate = _latest_rate
    WHERE id = NEW.psp_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_psp_rate_inserted
  AFTER INSERT ON public.psp_commission_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_psp_current_rate();

-- Sync PSP current rate when rate is deleted
CREATE OR REPLACE FUNCTION public.sync_psp_current_rate_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _latest_rate NUMERIC(5,4);
BEGIN
  SELECT commission_rate INTO _latest_rate
  FROM public.psp_commission_rates
  WHERE psp_id = OLD.psp_id
    AND effective_from <= CURRENT_DATE
  ORDER BY effective_from DESC
  LIMIT 1;

  IF _latest_rate IS NOT NULL THEN
    UPDATE public.psps
    SET commission_rate = _latest_rate
    WHERE id = OLD.psp_id;
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER on_psp_rate_deleted
  AFTER DELETE ON public.psp_commission_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_psp_current_rate_on_delete();

-- Helper function: get rate for a PSP on a specific date
CREATE OR REPLACE FUNCTION public.get_psp_rate_for_date(
  _psp_id UUID,
  _target_date DATE
)
RETURNS NUMERIC(5,4)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT commission_rate
  FROM public.psp_commission_rates
  WHERE psp_id = _psp_id
    AND effective_from <= _target_date
  ORDER BY effective_from DESC
  LIMIT 1;
$$;

-- Auto-calculate commission and net on transfers
CREATE OR REPLACE FUNCTION public.calculate_transfer_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate commission from snapshot rate (or PSP current rate if no snapshot)
  IF NEW.commission_rate_snapshot IS NOT NULL THEN
    NEW.commission := ROUND(NEW.amount * NEW.commission_rate_snapshot, 2);
  ELSIF NEW.psp_id IS NOT NULL THEN
    SELECT ROUND(NEW.amount * commission_rate, 2) INTO NEW.commission
    FROM public.psps
    WHERE id = NEW.psp_id;
  ELSE
    NEW.commission := 0;
  END IF;

  -- Calculate net amount
  NEW.net := NEW.amount - NEW.commission;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_commission_trigger
  BEFORE INSERT OR UPDATE OF amount, commission_rate_snapshot, psp_id ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_transfer_commission();

-- ============================================================================
-- Backfill commission_rate_snapshot for existing transfers
-- ============================================================================

UPDATE public.transfers t
SET commission_rate_snapshot = p.commission_rate
FROM public.psps p
WHERE t.psp_id = p.id
  AND t.commission_rate_snapshot IS NULL;

-- ============================================================================
-- Backfill commission and net for existing transfers
-- ============================================================================

UPDATE public.transfers
SET
  commission = CASE
    WHEN commission_rate_snapshot IS NOT NULL
    THEN ROUND(amount * commission_rate_snapshot, 2)
    ELSE 0
  END,
  net = amount - CASE
    WHEN commission_rate_snapshot IS NOT NULL
    THEN ROUND(amount * commission_rate_snapshot, 2)
    ELSE 0
  END
WHERE commission = 0 AND net = 0;

-- ============================================================================
-- Verification
-- ============================================================================

SELECT '✅ PSP System Reset Complete' AS status;

SELECT
  'PSPs Created' AS info,
  COUNT(*) AS total,
  COUNT(DISTINCT organization_id) AS organizations
FROM public.psps;

SELECT
  'Commission Rates Seeded' AS info,
  COUNT(*) AS total
FROM public.psp_commission_rates;
