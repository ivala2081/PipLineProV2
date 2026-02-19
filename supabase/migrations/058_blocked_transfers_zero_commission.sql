-- 058_blocked_transfers_zero_commission.sql
-- Enforces that transfers with type_id = 'blocked' always have:
--   commission = 0
--   net        = amount   (unaffected by any PSP rate)
--   commission_rate_snapshot = 0
--
-- This covers three scenarios:
--   1. New transfers created via the UI (frontend now zeroes it, trigger is the safety net)
--   2. CSV-imported blocked transfers (trigger fires on INSERT)
--   3. Existing blocked transfers that were incorrectly stored with non-zero commission

-- ── 1. Trigger function ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_blocked_zero_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.type_id = 'blocked' THEN
    NEW.commission             := 0;
    NEW.net                    := NEW.amount;
    NEW.commission_rate_snapshot := 0;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 2. Trigger on transfers (BEFORE INSERT OR UPDATE) ────────────────────────

DROP TRIGGER IF EXISTS on_transfer_blocked_zero_commission ON public.transfers;

CREATE TRIGGER on_transfer_blocked_zero_commission
  BEFORE INSERT OR UPDATE ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_blocked_zero_commission();

-- ── 3. Fix existing blocked transfers ────────────────────────────────────────
-- Update all existing blocked transfers that have non-zero commission or
-- a net value that doesn't equal amount.

UPDATE public.transfers
SET
  commission             = 0,
  net                    = amount,
  commission_rate_snapshot = 0
WHERE type_id = 'blocked'
  AND (commission != 0 OR net IS DISTINCT FROM amount OR commission_rate_snapshot IS DISTINCT FROM 0);
