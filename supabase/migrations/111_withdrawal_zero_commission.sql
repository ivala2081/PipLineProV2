-- 111_withdrawal_zero_commission.sql
-- Enforces that withdrawal transfers (category_id = 'wd') always have:
--   commission = 0
--   net        = amount   (unaffected by any PSP rate)
--   commission_rate_snapshot = 0
--
-- Business rule: withdrawals are never charged commission.
-- The frontend already displays "—" for withdrawal commission,
-- but the DB was not enforcing this, resulting in 144 bad records.

-- ── 1. Extend the existing trigger function ─────────────────────────────────
-- We replace the blocked-only function to also handle withdrawals.

CREATE OR REPLACE FUNCTION public.enforce_blocked_zero_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Blocked transfers: always zero commission
  IF NEW.type_id = 'blocked' THEN
    NEW.commission              := 0;
    NEW.net                     := NEW.amount;
    NEW.commission_rate_snapshot := 0;
  END IF;

  -- Withdrawals: never charged commission
  IF NEW.category_id = 'wd' THEN
    NEW.commission              := 0;
    NEW.net                     := NEW.amount;
    NEW.commission_rate_snapshot := 0;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 2. Fix existing withdrawal records with non-zero commission ─────────────

UPDATE public.transfers
SET
  commission              = 0,
  net                     = amount,
  commission_rate_snapshot = 0
WHERE category_id = 'wd'
  AND (commission != 0 OR net IS DISTINCT FROM amount OR commission_rate_snapshot IS DISTINCT FROM 0);
