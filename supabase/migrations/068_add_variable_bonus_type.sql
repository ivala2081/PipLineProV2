-- Add 'variable' to the bonus_type CHECK constraint on hr_bonus_agreements.
-- Variable bonus: amount is not fixed in the agreement; HR must enter it manually each month.

-- Drop the existing constraint (try all common naming conventions)
ALTER TABLE hr_bonus_agreements DROP CONSTRAINT IF EXISTS hr_bonus_agreements_bonus_type_check;
ALTER TABLE hr_bonus_agreements DROP CONSTRAINT IF EXISTS bonus_type_check;

-- Add updated constraint including 'variable'
ALTER TABLE hr_bonus_agreements
  ADD CONSTRAINT hr_bonus_agreements_bonus_type_check
  CHECK (bonus_type IN ('fixed', 'percentage', 'tiered', 'custom', 'variable'));
