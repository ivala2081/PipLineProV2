-- Add receives_supplement column to hr_employees
-- When an uninsured employee has this flag, a 4000 TL supplement is added
-- to their accounting entry when salary is paid.
ALTER TABLE hr_employees
  ADD COLUMN IF NOT EXISTS receives_supplement boolean NOT NULL DEFAULT false;
