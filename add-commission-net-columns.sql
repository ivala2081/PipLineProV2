-- Add commission and net columns to transfers table
-- These are required by PSP summary calculations

ALTER TABLE public.transfers
ADD COLUMN IF NOT EXISTS commission NUMERIC(15,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS net NUMERIC(15,2) NOT NULL DEFAULT 0;

-- Update existing transfers to calculate commission and net
-- commission = amount * commission_rate_snapshot (if snapshot exists, else 0)
-- net = amount - commission
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

-- Create a trigger function to auto-calculate commission and net on insert/update
CREATE OR REPLACE FUNCTION public.calculate_transfer_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate commission from snapshot rate (or PSP current rate if no snapshot)
  IF NEW.commission_rate_snapshot IS NOT NULL THEN
    NEW.commission := ROUND(NEW.amount * NEW.commission_rate_snapshot, 2);
  ELSIF NEW.psp_id IS NOT NULL THEN
    -- Use PSP's current commission rate if no snapshot
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

-- Create trigger to auto-calculate on insert/update
DROP TRIGGER IF EXISTS calculate_commission_trigger ON public.transfers;
CREATE TRIGGER calculate_commission_trigger
  BEFORE INSERT OR UPDATE OF amount, commission_rate_snapshot, psp_id ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_transfer_commission();
