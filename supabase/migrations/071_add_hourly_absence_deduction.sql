-- Add absent_hours to hr_attendance for hourly deductions
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS absent_hours smallint DEFAULT NULL;

-- Add constraint: absent_hours must be between 1 and 23 (skip if already exists)
DO $$ BEGIN
  ALTER TABLE hr_attendance ADD CONSTRAINT chk_absent_hours
    CHECK (absent_hours IS NULL OR (absent_hours >= 1 AND absent_hours <= 23));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add hourly divisor to hr_settings
ALTER TABLE hr_settings ADD COLUMN IF NOT EXISTS absence_hourly_divisor integer DEFAULT 240 NOT NULL;
