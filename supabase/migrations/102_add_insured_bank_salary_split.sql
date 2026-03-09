-- Insured employees: bank salary split
-- Government requires minimum wage (28,075.50 TL) to be deposited in employee bank account.
-- The rest is given as cash. This migration adds support for tracking/configuring this split.

-- 1. Add default bank deposit amount to HR settings (org-wide default)
ALTER TABLE hr_settings
  ADD COLUMN IF NOT EXISTS insured_bank_amount_tl numeric NOT NULL DEFAULT 28075.50;

-- 2. Add per-employee bank deposit override (NULL = use org default)
ALTER TABLE hr_employees
  ADD COLUMN IF NOT EXISTS bank_salary_tl numeric NULL;

-- 3. Extend advance_type to support 'insured_salary' (drop + re-add if constraint exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class r ON c.conrelid = r.oid
    WHERE r.relname = 'accounting_entries'
      AND c.conname = 'accounting_entries_advance_type_check'
  ) THEN
    ALTER TABLE accounting_entries DROP CONSTRAINT accounting_entries_advance_type_check;
    ALTER TABLE accounting_entries ADD CONSTRAINT accounting_entries_advance_type_check
      CHECK (advance_type IN ('salary', 'bonus', 'insured_salary'));
  END IF;
END $$;
