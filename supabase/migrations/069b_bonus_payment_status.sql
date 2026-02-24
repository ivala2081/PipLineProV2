-- Add status column to hr_bonus_payments.
-- 'pending' = variable bonus amount entered by HR but not yet processed through accounting.
-- 'paid'    = payment has been processed (accounting entry created). Default for all existing rows.

ALTER TABLE hr_bonus_payments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'paid';

-- Mark any existing rows as 'paid' (already has default, just for clarity)
UPDATE hr_bonus_payments SET status = 'paid' WHERE status IS NULL;
